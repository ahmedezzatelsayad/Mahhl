/**
 * Frequently-Bought-Together engine (Amazon-style)
 * ------------------------------------------------
 * Ranks "customers who bought this also bought" using THREE real signals,
 * strongest first:
 *
 *   1. Co-purchase  — products that appeared in the SAME real orders.
 *   2. Co-view      — products viewed in the same sessions by real visitors.
 *   3. Same-category best sellers (cold-start fallback when no signal yet).
 *
 * Every result excludes:
 *   - the trigger product itself
 *   - anything already in the visitor's cart (no duplicate suggestions)
 *   - out-of-stock products
 */
import { db } from '@/lib/db';

export type BoughtTogetherItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  oldPrice: number | null;
  image: string | null;
  /** human-readable Arabic reason shown under the title */
  reason: string;
  /** signal strength 0..1 */
  score: number;
  /** which signal produced this item */
  source: 'order' | 'coview' | 'category';
};

const SELECT = {
  id: true,
  slug: true,
  name: true,
  price: true,
  salePrice: true,
  thumb: true,
  images: true,
  isBestSeller: true,
  quantity: true,
} as const;

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice: number;
  thumb: string | null;
  images: string | null;
  isBestSeller: boolean;
  quantity: number;
};

function toScored(
  p: ProductRow,
  score: number,
  source: BoughtTogetherItem['source'],
  reason: string
): BoughtTogetherItem {
  return {
    productId: p.id,
    slug: p.slug,
    name: p.name,
    price: p.salePrice,
    oldPrice: p.price > p.salePrice ? p.price : null,
    image: p.thumb || (p.images ? p.images.split(',')[0] : null),
    reason,
    score,
    source,
  };
}

export async function getBoughtTogether(
  triggerProductId: string,
  opts: { excludeIds?: string[]; limit?: number } = {}
): Promise<{ triggerSlug: string | null; items: BoughtTogetherItem[] }> {
  const limit = opts.limit ?? 5;
  const exclude = new Set<string>([triggerProductId, ...(opts.excludeIds || [])]);

  const trigger = await db.product.findUnique({
    where: { id: triggerProductId },
    select: { ...SELECT, categoryId: true },
  });
  if (!trigger) return { triggerSlug: null, items: [] };
  const triggerSlug = trigger.slug;

  const results: BoughtTogetherItem[] = [];

  // ============ 1. Real co-purchase signal ============
  try {
    const orderIds = await db.orderItem.findMany({
      where: { productId: triggerProductId },
      select: { orderId: true },
      distinct: ['orderId'],
      take: 200,
    });
    if (orderIds.length > 0) {
      const siblings = await db.orderItem.findMany({
        where: { orderId: { in: orderIds.map((o) => o.orderId) } },
        select: { productId: true },
      });
      // count co-occurrences
      const counts = new Map<string, number>();
      for (const s of siblings) {
        if (exclude.has(s.productId)) continue;
        counts.set(s.productId, (counts.get(s.productId) || 0) + 1);
      }
      const topIds = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);
      if (topIds.length > 0) {
        const rows = await db.product.findMany({
          where: { id: { in: topIds }, quantity: { gt: 0 } },
          select: SELECT,
        });
        const byId = new Map(rows.map((r) => [r.id, r]));
        for (const id of topIds) {
          const row = byId.get(id);
          const n = counts.get(id) || 0;
          if (!row) continue;
          results.push(
            toScored(
              row,
              Math.min(1, 0.6 + n * 0.1),
              'order',
              `اشتروه مع هذا المنتج ${n} مرة`
            )
          );
        }
      }
    }
  } catch (e) {
    console.warn('[bought-together] co-purchase query failed', e);
  }

  // ============ 2. Co-view signal (sessions that viewed X also viewed Y) ============
  if (results.length < limit) {
    try {
      const viewEvents = await db.userEvent.findMany({
        where: { type: 'product_view', productId: triggerProductId },
        select: { sessionId: true },
        distinct: ['sessionId'],
        take: 150,
      });
      if (viewEvents.length > 0) {
        const coViews = await db.userEvent.findMany({
          where: {
            type: 'product_view',
            sessionId: { in: viewEvents.map((v) => v.sessionId) },
            productId: { not: null },
          },
          select: { productId: true },
          take: 1000,
        });
        const counts = new Map<string, number>();
        for (const ev of coViews) {
          if (!ev.productId || exclude.has(ev.productId)) continue;
          if (results.some((r) => r.productId === ev.productId)) continue;
          counts.set(ev.productId, (counts.get(ev.productId) || 0) + 1);
        }
        const topIds = [...counts.entries()]
          .filter(([, n]) => n >= 2) // at least 2 sessions — real pattern, not noise
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit - results.length)
          .map(([id]) => id);
        if (topIds.length > 0) {
          const rows = await db.product.findMany({
            where: { id: { in: topIds }, quantity: { gt: 0 } },
            select: SELECT,
          });
          const byId = new Map(rows.map((r) => [r.id, r]));
          for (const id of topIds) {
            const row = byId.get(id);
            const n = counts.get(id) || 0;
            if (!row) continue;
            results.push(
              toScored(
                row,
                Math.min(0.9, 0.4 + n * 0.08),
                'coview',
                'عملاء شاهدوا هذا المنتج شاهدوا هذا أيضاً'
              )
            );
          }
        }
      }
    } catch (e) {
    console.warn('[bought-together] co-view query failed', e);
    }
  }

  // ============ 3. Cold-start fallback: same category best sellers ============
  if (results.length < limit && trigger.categoryId) {
    try {
      const rows = await db.product.findMany({
        where: {
          id: { notIn: [...exclude] },
          categoryId: trigger.categoryId,
          quantity: { gt: 0 },
        },
        select: SELECT,
        orderBy: [{ isBestSeller: 'desc' }, { salePrice: 'desc' }],
        take: limit * 3,
      });
      const already = new Set(results.map((r) => r.productId));
      for (const row of rows) {
        if (results.length >= limit) break;
        if (already.has(row.id)) continue;
        results.push(
          toScored(
            row,
            0.35,
            'category',
            row.isBestSeller
              ? 'من الأكثر مبيعاً في نفس القسم'
              : 'يكمّل اختيارك من نفس القسم'
          )
        );
      }
    } catch (e) {
      console.warn('[bought-together] category fallback failed', e);
    }
  }

  // if still nothing (tiny category) — store-wide best sellers
  if (results.length < limit) {
    try {
      const rows = await db.product.findMany({
        where: { id: { notIn: [...exclude] }, quantity: { gt: 0 }, isBestSeller: true },
        select: SELECT,
        take: limit * 2,
      });
      const already = new Set(results.map((r) => r.productId));
      for (const row of rows) {
        if (results.length >= limit) break;
        if (already.has(row.id)) continue;
        results.push(toScored(row, 0.25, 'category', 'من الأكثر مبيعاً في المنصة'));
      }
    } catch {
      /* ignore */
    }
  }

  return { triggerSlug, items: results.slice(0, limit) };
}
