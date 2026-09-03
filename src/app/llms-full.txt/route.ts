import { db } from '@/lib/db';
import { getSiteUrl, formatKwd } from '@/lib/seo';
import { getShippingSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * /llms-full.txt — the FULL product catalog as flat Arabic Markdown,
 * grouped by category: name — price (KWD) — URL. This lets LLM agents
 * answer "أين أشتري X في الكويت بكم؟" with exact prices + deep links.
 */
export async function GET() {
  const base = await getSiteUrl();
  const shipping = await getShippingSettings();

  let cats: { id: string; name: string }[] = [];
  try {
    cats = await db.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch {
    /* ignore */
  }

  const out: string[] = [];
  const total = await db.product.count().catch(() => 0);
  out.push(`# محل شوب — الفهرس الكامل للمنتجات`);
  out.push('');
  out.push(
    `> كل منتجات محل شوب (${total} منتج) بأسعارها بالدينار الكويتي. الدفع عند الاستلام، توصيل ${formatKwd(shipping.price)} د.ك لجميع محافظات الكويت. ملاحظة: على الموقع نفسه، الزائر يشوف أفضل 200 منتج بدون تسجيل — والكتالوج الكامل يفتح بعد التسجيل المجاني من /?view=affiliate-login. كل منتج عليه عمولة مسوّق 1–2 د.ك ودراسة تسويقية (سعر بيع مقترح + مستوى الطلب + أنسب قناة إعلانية).`
  );
  out.push('');

  for (const c of cats) {
    const products = await db.product
      .findMany({
        where: { categoryId: c.id },
        select: { name: true, slug: true, salePrice: true, sku: true, quantity: true },
        orderBy: { salePrice: 'asc' },
      })
      .catch(() => [] as { name: string; slug: string; salePrice: number; sku: string; quantity: number }[]);
    if (products.length === 0) continue;
    out.push(`## ${c.name} (${products.length} منتج)`);
    out.push('');
    for (const p of products) {
      const avail = p.quantity > 0 ? '' : ' (نفذ المخزون)';
      out.push(
        `- ${p.name} — ${formatKwd(p.salePrice)} د.ك${avail} — [رابط المنتج](${base}/?p=${encodeURIComponent(p.slug)})`
      );
    }
    out.push('');
  }

  return new Response(out.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
