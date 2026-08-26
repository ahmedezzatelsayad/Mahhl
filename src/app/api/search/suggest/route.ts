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
  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [] });
  }

  const cached = cache.get(q);
  if (cached && Date.now() - cached.at < TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const [products, categories] = await Promise.all([
      db.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: [{ isBestSeller: 'desc' }, { createdAt: 'desc' }],
        take: 6,
        select: {
          slug: true,
          name: true,
          salePrice: true,
          originalPrice: true,
          thumb: true,
          isBestSeller: true,
        },
      }),
      db.category.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 3,
        select: { name: true, slug: true },
      }),
    ]);

    const data = { products, categories };
    if (cache.size > 400) cache.clear();
    cache.set(q, { data, at: Date.now() });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ products: [], categories: [] });
  }
}
