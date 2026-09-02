import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateOnly } from '@/lib/affiliate-auth';
import { affiliateBuckets, ENTRY_LABELS, STATUS_LABELS_AR } from '@/lib/commission';

export const dynamic = 'force-dynamic';

/**
 * Full commission statement (كشف حساب): ledger entries + withdrawal history
 * + the delivered orders currently available for withdrawal selection.
 */
export async function GET(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    const buckets = await affiliateBuckets(aff.id);

    const [entries, withdrawals, withdrawable] = await Promise.all([
      db.commissionEntry.findMany({
        where: { affiliateId: aff.id },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { order: { select: { orderNumber: true, status: true } } },
      }),
      db.withdrawalRequest.findMany({
        where: { affiliateId: aff.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { orders: { select: { orderId: true, amount: true } } },
      }),
      // delivered orders whose commission is not settled & not locked in an
      // active withdrawal → selectable for a new request
      db.order.findMany({
        where: {
          affiliateId: aff.id,
          status: 'delivered',
          withdrawalOrders: { none: { withdrawal: { status: { in: ['pending', 'paid'] } } } },
        },
        select: {
          id: true, orderNumber: true, customerName: true,
          commissionTotal: true, deliveredAt: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
    ]);

    return NextResponse.json({
      buckets,
      entries: entries.map((e) => ({
        id: e.id,
        type: e.type,
        typeLabel: ENTRY_LABELS[e.type] || e.type,
        amount: e.amount,
        note: e.note,
        orderNumber: e.order?.orderNumber || null,
        orderStatus: e.order ? STATUS_LABELS_AR[e.order.status] || e.order.status : null,
        createdAt: e.createdAt,
      })),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: w.amount,
        method: w.method,
        status: w.status,
        adminNote: w.adminNote,
        paymentRef: w.paymentRef,
        screenshotUrl: w.screenshotUrl,
        createdAt: w.createdAt,
        processedAt: w.processedAt,
        orderCount: w.orders.length,
      })),
      withdrawable: withdrawable.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        commission: o.commissionTotal || 0,
        deliveredAt: o.deliveredAt,
      })),
    });
  });
}
