/**
 * catalog-gate.ts — الكتالوج العام المحدود (200 منتج) + فتح الكتالوج الكامل بعد التسجيل.
 *
 * الزائر (بدون تسجيل) يشوف «أفضل 200 منتج» موزّعين بعدالة على كل الأقسام:
 * كل قسم يأخذ حصته بحسب حجمه (بحد أدنى 8 منتجات) — عشان «التوب من كل الأقسام».
 * المسوّق المسجّل أو صاحب حساب مشتري يفتح الكتالوج الكامل (2,600+ منتج).
 *
 * القائمة تُحسب مرة كل 15 دقيقة (in-memory cache) — استعلام خفيف على القاعدة
 * وتخدم كل الزوار بدون أي تكلفة إضافية.
 */
import { db } from '@/lib/db';

export const PUBLIC_CATALOG_LIMIT = 200;
const MIN_PER_CATEGORY = 8;
const CACHE_TTL_MS = 15 * 60 * 1000;

export interface CatalogGate {
  /** ids of the public top-200 products (canonical ranked set) */
  ids: string[];
  /** total live catalog size (e.g. 2638) — for the gate messaging */
  totalProducts: number;
  publicLimit: number;
}

let cache: { at: number; gate: CatalogGate } | null = null;

/** ranking score: bestseller flag, real sales, demand research rank */
function scoreOf(p: { isBestSeller: boolean; soldCount: number; demandRank: number | null }): number {
  return (p.isBestSeller ? 1e9 : 0) + p.soldCount * 1e3 - (p.demandRank ?? 500);
}

async function computeGate(): Promise<CatalogGate> {
  const totalProducts = await db.product.count();
  const cats = await db.category.findMany({
    select: { id: true, _count: { select: { products: true } } },
  });
  const active = cats.filter((c) => c._count.products > 0);
  const totalInActive = active.reduce((s, c) => s + c._count.products, 0);
  if (!active.length || totalInActive <= PUBLIC_CATALOG_LIMIT) {
    // small catalog — everything is public anyway
    const all = await db.product.findMany({ select: { id: true } });
    return { ids: all.map((p) => p.id), totalProducts, publicLimit: PUBLIC_CATALOG_LIMIT };
  }

  // proportional quota per category (min 8) → «التوب من كل الأقسام»
  const picks = new Map<string, { id: string; score: number; catId: string }[]>();
  const leftovers: { id: string; score: number; catId: string }[] = [];

  for (const c of active) {
    const quota = Math.max(
      MIN_PER_CATEGORY,
      Math.round((c._count.products / totalInActive) * PUBLIC_CATALOG_LIMIT)
    );
    const rows = await db.product.findMany({
      where: { categoryId: c.id },
      orderBy: [
        { isBestSeller: 'desc' },
        { soldCount: 'desc' },
        { demandRank: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      take: quota + 24, // candidates: quota + refill buffer
      select: { id: true, isBestSeller: true, soldCount: true, demandRank: true },
    });
    const scored = rows.map((r, i) => ({
      id: r.id,
      catId: c.id,
      score: scoreOf(r) - i * 0.5, // tiny decay keeps DB order as tie-break
    }));
    picks.set(
      c.id,
      scored.slice(0, Math.min(quota, c._count.products))
    );
    leftovers.push(...scored.slice(quota));
  }

  // flatten picks; if over 200 → drop lowest-scored from categories above the minimum
  let flat = [...picks.values()].flat();
  if (flat.length > PUBLIC_CATALOG_LIMIT) {
    flat.sort((a, b) => b.score - a.score);
    while (flat.length > PUBLIC_CATALOG_LIMIT) {
      const counts = countByCatOf(flat);
      let worstIdx = -1;
      let worstScore = Infinity;
      for (let i = flat.length - 1; i >= 0; i--) {
        const c = counts.get(flat[i].catId) ?? 0;
        if (c > MIN_PER_CATEGORY && flat[i].score < worstScore) {
          worstScore = flat[i].score;
          worstIdx = i;
        }
      }
      if (worstIdx < 0) break; // everything at minimum — keep as-is
      flat.splice(worstIdx, 1);
    }
  }

  // if under 200 → refill with best leftovers (any category)
  if (flat.length < PUBLIC_CATALOG_LIMIT && leftovers.length) {
    const inSet = new Set(flat.map((p) => p.id));
    leftovers
      .sort((a, b) => b.score - a.score)
      .some((item) => {
        if (flat.length >= PUBLIC_CATALOG_LIMIT) return true;
        if (!inSet.has(item.id)) {
          flat.push(item);
          inSet.add(item.id);
        }
        return false;
      });
  }

  return { ids: flat.map((p) => p.id), totalProducts, publicLimit: PUBLIC_CATALOG_LIMIT };

  function countByCatOf(list: { catId: string }[]) {
    const m = new Map<string, number>();
    for (const p of list) m.set(p.catId, (m.get(p.catId) ?? 0) + 1);
    return m;
  }
}

export async function getCatalogGate(): Promise<CatalogGate> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.gate;
  try {
    const gate = await computeGate();
    cache = { at: Date.now(), gate };
    return gate;
  } catch {
    // DB hiccup — never block the store: degrade to "unlocked" (full catalog)
    return { ids: [], totalProducts: 0, publicLimit: PUBLIC_CATALOG_LIMIT };
  }
}

/** cached gate that tells the API whether guests are actually limited */
export async function isCatalogLockedForGuests(): Promise<boolean> {
  const gate = await getCatalogGate();
  return gate.ids.length > 0 && gate.totalProducts > gate.publicLimit;
}
