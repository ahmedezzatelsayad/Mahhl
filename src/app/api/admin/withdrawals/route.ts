import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** All withdrawal requests with affiliate + selected orders (طلبات السحب). */
export async function GET(req: NextRequest) {
  return requirePermission(req, 'withdrawals', 'view', async () => {
    const sp = req.nextUrl.searchParams;
    const status = sp.get('status') || '';

    const where: any = {};
    if (status && status !== 'all') where.status = status;

    const withdrawals = await db.withdrawalRequest.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        affiliate: {
          select: { id: true, name: true, phone: true, code: true, paymentAccount: true },
        },
        orders: {
          select: {
            amount: true,
            order: { select: { id: true, orderNumber: true, customerName: true, status: true } },
          },
        },
      },
    });

    return NextResponse.json(
      withdrawals.map((w) => ({
        id: w.id,
        amount: w.amount,
        method: w.method,
        status: w.status,
        accountInfo: w.accountInfo,
        adminNote: w.adminNote,
        paymentRef: w.paymentRef,
        screenshotUrl: w.screenshotUrl,
        createdAt: w.createdAt,
        processedAt: w.processedAt,
        affiliate: w.affiliate,
        orders: w.orders.map((o) => ({
          id: o.order.id,
          orderNumber: o.order.orderNumber,
          customerName: o.order.customerName,
          status: o.order.status,
          amount: o.amount,
        })),
      }))
    );
  });
}
