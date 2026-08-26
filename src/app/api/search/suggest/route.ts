import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Search autocomplete / suggest API.
 * GET /api/search/suggest?q=<prefix>
 *
 * Global best practice: shoppers who use site search convert up to 6.4x more
 * (Salesforce); autocomplete is the #1 way to funnel users into search.
 * Returns matching products (with price/image) + matching categories.
 */

export const dynamic = 'force-dynamic';

// 60s micro-cache per prefix (popular prefixes repeat a lot)
const cache = new Map<string, { data: object; at: number }>();
const TTL = 60_000;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  const lang = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'ar';
  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [] });
  }

  const cached = cache.get(`${lang}:${q}`);
  if (cached && Date.now() - cached.at < TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const [products, categories] = await Promise.all([
      db.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { nameEn: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { descriptionEn: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: [{ isBestSeller: 'desc' }, { soldCount: 'desc' }],
        take: 6,
        select: {
          slug: true,
          name: true,
          nameEn: true,
          salePrice: true,
          originalPrice: true,
          thumb: true,
          isBestSeller: true,
        },
      }),
      db.category.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { nameEn: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 3,
        select: { name: true, nameEn: true, slug: true },
      }),
    ]);

    const data = {
      products: products.map((p) => ({
        ...p,
        name: lang === 'en' && p.nameEn ? p.nameEn : p.name,
      })),
      categories: categories.map((c) => ({
        ...c,
        name: lang === 'en' && c.nameEn ? c.nameEn : c.name,
      })),
    };
    if (cache.size > 400) cache.clear();
    cache.set(`${lang}:${q}`, { data, at: Date.now() });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ products: [], categories: [] });
  }
}
