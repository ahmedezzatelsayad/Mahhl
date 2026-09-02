import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { cleanText } from '@/lib/create-order';
import { round3 } from '@/lib/commission';

export const dynamic = 'force-dynamic';

/**
 * Process a withdrawal request:
 *  - { action: 'pay', paymentRef?, screenshotUrl? }  → creates the payout
 *    ledger entry, marks the included orders as commission_received.
 *  - { action: 'reject', adminNote? }                → frees the orders.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requirePermission(req, 'withdrawals', 'manage', async (admin) => {
    const { id } = await params;
    const body = await req.json();
    const action = String(body.action || '');

    const wd = await db.withdrawalRequest.findUnique({
      where: { id },
      include: { orders: { select: { orderId: true, amount: true } } },
    });
    if (!wd) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    if (wd.status !== 'pending') {
      return NextResponse.json({ error: 'تم معالجة هذا الطلب مسبقاً' }, { status: 400 });
    }

    if (action === 'pay') {
      // verify selected orders are still delivered (not returned meanwhile)
      const orderIds = wd.orders.map((o) => o.orderId);
      const orders = await db.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, status: true },
      });
      const bad = orders.filter((o) => !['delivered', 'commission_received'].includes(o.status));
      if (bad.length) {
        return NextResponse.json(
          { error: 'واحد أو أكثر من الطلبات أصبح مرتجعاً — راجع الطلب وأخطر المسوق' },
          { status: 400 }
        );
      }

      await db.commissionEntry.create({
        data: {
          affiliateId: wd.affiliateId,
          type: 'payout',
          amount: round3(-Math.abs(wd.amount)),
          note: `سحب عمولة (${wd.orders.length} طلب)${body.paymentRef ? ` — مرجع ${cleanText(body.paymentRef, 60)}` : ''}`,
          createdById: admin.id,
        },
      });

      await db.$transaction([
        db.withdrawalRequest.update({
          where: { id },
          data: {
            status: 'paid',
            paymentRef: cleanText(body.paymentRef, 60) || null,
            screenshotUrl: cleanText(body.screenshotUrl, 500) || null,
            processedById: admin.id,
            processedAt: new Date(),
          },
        }),
        db.order.updateMany({
          where: { id: { in: orderIds } },
          data: { status: 'commission_received' },
        }),
      ]);

      return NextResponse.json({ ok: true, status: 'paid' });
    }

    if (action === 'reject') {
      await db.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          adminNote: cleanText(body.adminNote, 300) || null,
          processedById: admin.id,
          processedAt: new Date(),
        },
      });
      return NextResponse.json({ ok: true, status: 'rejected' });
    }

    return NextResponse.json({ error: 'إجراء غير صحيح' }, { status: 400 });
  });
}
