import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateOnly } from '@/lib/affiliate-auth';
import { affiliateBuckets, PIPELINE_STATUSES } from '@/lib/commission';

export const dynamic = 'force-dynamic';

/** Dashboard statistics: buckets + 30-day trend + top products. */
export async function GET(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    const buckets = await affiliateBuckets(aff.id);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [recentOrders, topItems, statusRaw] = await Promise.all([
      db.order.findMany({
        where: { affiliateId: aff.id, createdAt: { gte: since } },
        select: {
          id: true, orderNumber: true, customerName: true, total: true,
          commissionTotal: true, status: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      db.orderItem.groupBy({
        by: ['productId'],
        where: { order: { affiliateId: aff.id } },
        _sum: { quantity: true, commission: true },
        _count: { productId: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 6,
      }),
      db.$queryRawUnsafe<{ status: string; c: number; day: Date }[]>(
        `SELECT status, COUNT(*)::int AS c, date_trunc('day', "createdAt") AS day
         FROM "Order" WHERE "affiliateId" = $1 AND "createdAt" >= $2
         GROUP BY status, date_trunc('day', "createdAt")`,
        aff.id, since
      ),
    ]);

    const productIds = topItems.map((t) => t.productId);
    const products = productIds.length
      ? await db.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, thumb: true, salePrice: true, price: true },
        })
      : [];
    const pmap = new Map(products.map((p) => [p.id, p]));

    const topProducts = topItems.map((t) => ({
      productId: t.productId,
      name: pmap.get(t.productId)?.name || '—',
      thumb: pmap.get(t.productId)?.thumb || null,
      qty: t._sum.quantity || 0,
      commission: t._sum.commission || 0,
    }));

    return NextResponse.json({
      buckets,
      recentOrders,
      topProducts,
      statusDaily: statusRaw,
      pipelineStatuses: PIPELINE_STATUSES,
    });
  });
}
