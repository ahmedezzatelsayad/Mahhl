import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateOnly } from '@/lib/affiliate-auth';
import { effectivePrice } from '@/lib/create-order';

export const dynamic = 'force-dynamic';

/**
 * Affiliate product catalog — every product with its selling price
 * (شامل العمولة) and the marketer's commission per unit.
 * Matches the site's catalog filters: q / cat / page.
 */
export async function GET(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    const sp = req.nextUrl.searchParams;
    const q = (sp.get('q') || '').trim().slice(0, 80);
    const cat = sp.get('cat') || '';
    // commission tier filter: 1 / 1.5 / 2 (شرائح العمولات)
    const tier = sp.get('tier') || '';
    // sort: best (الأكثر مبيعاً) | commission (أعلى عمولة) | price_asc (الأرخص) | price_desc (الأغلى)
    const sort = sp.get('sort') || 'best';
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const perPage = Math.min(60, Math.max(12, Number(sp.get('perPage')) || 24));

    const tierValue = tier === '1' ? 1 : tier === '1.5' ? 1.5 : tier === '2' ? 2 : null;
    const orderBy: any[] =
      sort === 'commission'
        ? [{ commission: 'desc' }, { soldCount: 'desc' }]
        : sort === 'demand'
          ? [{ isBestSeller: 'desc' }, { demandRank: { sort: 'asc', nulls: 'last' } }, { soldCount: 'desc' }]
          : sort === 'suggested'
            ? [{ suggestedPrice: 'desc' }, { soldCount: 'desc' }]
            : sort === 'price_asc'
              ? [{ salePrice: 'asc' }]
              : sort === 'price_desc'
                ? [{ salePrice: 'desc' }]
                : [{ isBestSeller: 'desc' }, { soldCount: 'desc' }];

    const where: any = {
      AND: [
        { disableOOS: false },
        q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } },
                { keywords: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {},
        cat ? { categoryId: cat } : {},
        tierValue != null ? { commission: tierValue } : {},
      ],
    };

    const [total, products] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        select: {
          id: true, slug: true, name: true, sku: true, thumb: true,
          price: true, salePrice: true, quantity: true, trackStock: true,
          commission: true, isBestSeller: true, soldCount: true,
          suggestedPrice: true, demandTier: true, adChannel: true, studyNote: true,
        },
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    // توزيع الشرائح في الكتالوج (للـ filter chips)
    const tierCounts = await db.product.groupBy({
      by: ['commission'],
      where: { disableOOS: false },
      _count: { _all: true },
    });

    return NextResponse.json({
      total,
      page,
      perPage,
      tierCounts: tierCounts.map((t) => ({ commission: t.commission, count: t._count._all })),
      products: products.map((p) => ({
        ...p,
        sellPrice: effectivePrice(p),
        commission: p.commission || 0,
      })),
    });
  });
}
