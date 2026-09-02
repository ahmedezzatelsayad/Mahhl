import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateOnly, verifyAffiliate } from '@/lib/affiliate-auth';
import { createOrder } from '@/lib/create-order';
import { STATUS_LABELS_AR } from '@/lib/commission';

export const dynamic = 'force-dynamic';

/** My orders with filters: status / from / to / q (order no, phone, name). */
export async function GET(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    const sp = req.nextUrl.searchParams;
    const status = sp.get('status') || '';
    const from = sp.get('from') || '';
    const to = sp.get('to') || '';
    const q = (sp.get('q') || '').trim().slice(0, 80);
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const perPage = Math.min(100, Math.max(10, Number(sp.get('perPage')) || 25));

    const where: any = { affiliateId: aff.id };
    if (status && status !== 'all') where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }
    if (q) {
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }

    const [total, orders] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        select: {
          id: true, orderNumber: true, customerName: true, phone: true,
          governorate: true, area: true, subtotal: true, shipping: true,
          total: true, status: true, commissionTotal: true, createdAt: true,
          deliveredAt: true, items: {
            select: { id: true, name: true, quantity: true, price: true, commission: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    // which orders are already locked in a withdrawal (not rejected)
    const orderIds = orders.map((o) => o.id);
    const locked = orderIds.length
      ? await db.withdrawalOrder.findMany({
          where: { orderId: { in: orderIds }, withdrawal: { status: { in: ['pending', 'paid'] } } },
          select: { orderId: true },
        })
      : [];
    const lockedSet = new Set(locked.map((l) => l.orderId));

    return NextResponse.json({
      total,
      page,
      perPage,
      orders: orders.map((o) => ({ ...o, statusLabel: STATUS_LABELS_AR[o.status] || o.status, lockedInWithdrawal: lockedSet.has(o.id) })),
    });
  });
}

/** Place an order for a customer directly from the affiliate portal (اضف طلب). */
export async function POST(req: NextRequest) {
  const aff = await verifyAffiliate(req);
  if (!aff) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (aff.status !== 'active') {
    return NextResponse.json(
      { error: 'حسابك لسه قيد المراجعة — راجع الإدارة قبل إضافة الطلبات' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const result = await createOrder({
    phone: body.phone,
    customerName: body.customerName,
    address: body.address,
    governorate: body.governorate,
    area: body.area,
    notes: body.notes,
    paymentMethod: 'cod',
    items: Array.isArray(body.items) ? body.items : [],
    affiliateId: aff.id,
    source: 'affiliate',
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    order: {
      id: result.order.id,
      orderNumber: result.order.orderNumber,
      total: result.order.total,
      commissionTotal: result.order.commissionTotal,
    },
    duplicate: result.duplicate,
  });
}
