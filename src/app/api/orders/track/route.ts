import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeKwPhone } from '@/lib/customer-auth';
import { runAutoShipIfDue } from '@/lib/auto-ship';

/**
 * Guest order tracking — order number + phone (no login needed).
 * Keeps customer privacy: phone must match the order, and items/order data
 * are scoped to that single order.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderNumber = (body.orderNumber || '').trim().toUpperCase();
    const phone = normalizeKwPhone(body.phone || '');

    if (!orderNumber || !phone) {
      return NextResponse.json(
        { error: 'اكتب رقم الطلب ورقم هاتفك اللي طلبت فيه' },
        { status: 400 }
      );
    }

    await runAutoShipIfDue().catch(() => {});

    const order = await db.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order || normalizeKwPhone(order.phone || '') !== phone) {
      return NextResponse.json(
        { error: 'ما لقينا طلب بهذي البيانات — تأكد من رقم الطلب ورقم الهاتف' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'فشل البحث' }, { status: 500 });
  }
}
