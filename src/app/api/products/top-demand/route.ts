import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Top-demanded products in Kuwait/Gulf — research-based ranking
 * (demandRank seeded from global market research: perfumes/oud, smartwatches,
 * earbuds, air fryers, kitchen & home gadgets, beauty, toys, car accessories).
 * GET /api/products/top-demand?limit=100&lang=ar|en
 */
export const dynamic = 'force-dynamic';

let memCache: { at: number; data: unknown } | null = null;
const TTL = 5 * 60_000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(4, parseInt(url.searchParams.get('limit') || '100', 10) || 100));
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'ar';

  if (memCache && Date.now() - memCache.at < TTL && (memCache.data as { lang: string }).lang === lang) {
    return NextResponse.json((memCache.data as { items: unknown[] }).items, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  }

  try {
    const products = await db.product.findMany({
      where: { demandRank: { not: null }, quantity: { gt: 0 } },
      orderBy: { demandRank: 'asc' },
      take: limit,
      select: {
        id: true,
        slug: true,
        name: true,
        nameEn: true,
        price: true,
        salePrice: true,
        thumb: true,
        images: true,
        quantity: true,
        isBestSeller: true,
        soldCount: true,
        demandRank: true,
        category: { select: { name: true, nameEn: true } },
      },
    });

    const ids = products.map((p) => p.id);
    const ratings = await db.review.groupBy({
      by: ['productId'],
      where: { productId: { in: ids }, isApproved: true },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const rMap = new Map(ratings.map((r) => [r.productId, { avg: r._avg.rating || 0, count: r._count._all }]));

    const items = products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: lang === 'en' && p.nameEn ? p.nameEn : p.name,
      price: p.price,
      salePrice: p.salePrice,
      thumb: p.thumb,
      images: p.images,
      quantity: p.quantity,
      isBestSeller: p.isBestSeller,
      soldCount: p.soldCount,
      demandRank: p.demandRank,
      rating: Math.round((rMap.get(p.id)?.avg || 0) * 10) / 10,
      reviewCount: rMap.get(p.id)?.count || 0,
      category: { name: lang === 'en' && p.category?.nameEn ? p.category.nameEn : p.category?.name || '' },
    }));

    memCache = { at: Date.now(), data: { lang, items } };
    return NextResponse.json(items, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (e) {
    console.error('top-demand error:', e instanceof Error ? e.message : e);
    return NextResponse.json([], { status: 200 });
  }
}
