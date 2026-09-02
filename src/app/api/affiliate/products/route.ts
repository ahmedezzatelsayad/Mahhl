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
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const perPage = Math.min(60, Math.max(12, Number(sp.get('perPage')) || 24));

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
      ],
    };

    const [total, products] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        select: {
          id: true, slug: true, name: true, sku: true, thumb: true,
          price: true, salePrice: true, quantity: true, trackStock: true,
          commission: true, isBestSeller: true,
        },
        orderBy: [{ isBestSeller: 'desc' }, { soldCount: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      perPage,
      products: products.map((p) => ({
        ...p,
        sellPrice: effectivePrice(p),
        commission: p.commission || 0,
      })),
    });
  });
}
