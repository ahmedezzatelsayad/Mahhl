import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateOnly } from '@/lib/affiliate-auth';
import { affiliateBuckets, PAYOUT_METHODS, round3 } from '@/lib/commission';

export const dynamic = 'force-dynamic';

/** My withdrawal requests (طلبات تحويل العمولة). */
export async function GET(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    const withdrawals = await db.withdrawalRequest.findMany({
      where: { affiliateId: aff.id },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: { orders: { select: { orderId: true, amount: true } } },
    });
    const buckets = await affiliateBuckets(aff.id);
    return NextResponse.json({
      buckets,
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
    });
  });
}

/**
 * Create a withdrawal request from selected DELIVERED orders.
 * Amount is server-computed = Σ selected orders' commission (transparent,
 * no free-form amounts). Orders must be unlocked & unsettled.
 */
export async function POST(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    const body = await req.json();
    const orderIds: string[] = Array.isArray(body.orderIds)
      ? body.orderIds.filter((x: unknown) => typeof x === 'string').slice(0, 200)
      : [];
    const method = String(body.method || '');
    if (!PAYOUT_METHODS.some((m) => m.value === method)) {
      return NextResponse.json({ error: 'اختر طريقة تحويل صحيحة' }, { status: 400 });
    }
    if (!orderIds.length) {
      return NextResponse.json({ error: 'حدد على الأقل طلب واحد' }, { status: 400 });
    }

    // account info: from request or fall back to profile
    let accountInfo = String(body.accountInfo || '').slice(0, 200) || null;

    // Validate: owned + delivered + not locked/settled
    const orders = await db.order.findMany({
      where: { id: { in: orderIds }, affiliateId: aff.id },
      select: {
        id: true, status: true, commissionTotal: true,
        withdrawalOrders: { select: { withdrawal: { select: { status: true } } } },
      },
    });
    if (orders.length !== orderIds.length) {
      return NextResponse.json({ error: 'بعض الطلبات غير صحيحة' }, { status: 400 });
    }
    for (const o of orders) {
      if (o.status !== 'delivered') {
        return NextResponse.json(
          { error: 'تقدر تسحب عمولة الطلبات المسلّمة فقط' },
          { status: 400 }
        );
      }
      if (o.withdrawalOrders.some((w) => ['pending', 'paid'].includes(w.withdrawal.status))) {
        return NextResponse.json(
          { error: 'واحد أو أكثر من الطلبات محجوز في طلب سحب سابق' },
          { status: 400 }
        );
      }
    }

    const amount = round3(
      orders.reduce((s, o) => s + (o.commissionTotal || 0), 0)
    );
    if (amount <= 0) {
      return NextResponse.json({ error: 'لا توجد عمولات قابلة للسحب في الطلبات المحددة' }, { status: 400 });
    }

    const profile = await db.affiliate.findUnique({ where: { id: aff.id } });
    if (!accountInfo) accountInfo = profile?.paymentAccount || null;

    const withdrawal = await db.withdrawalRequest.create({
      data: {
        affiliateId: aff.id,
        amount,
        method,
        accountInfo,
        status: 'pending',
        orders: {
          create: orders.map((o) => ({ orderId: o.id, amount: round3(o.commissionTotal || 0) })),
        },
      },
    });

    return NextResponse.json({ ok: true, withdrawal: { id: withdrawal.id, amount: withdrawal.amount } });
  });
}
