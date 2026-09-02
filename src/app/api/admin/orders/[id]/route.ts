import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { AFFILIATE_ORDER_STATUSES, ensureEarnedEntry, ensureReversalEntry } from '@/lib/commission';

const ALLOWED = [
  'pending',
  'confirmed',
  'deferred',
  'processing',
  'shipped',
  'delivered',
  'returned',
  'cancelled',
  'commission_received',
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requirePermission(req, 'orders', 'manage', async () => {
    const { id } = await params;
    const body = await req.json();
    if (!ALLOWED.includes(body.status)) {
      return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 });
    }
    try {
      const current = await db.order.findUnique({
        where: { id },
        select: { status: true, affiliateId: true, commissionTotal: true },
      });
      if (!current) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

      const data: any = { status: body.status };
      if (body.status === 'shipped' && body.shippedAt === undefined) {
        data.shippedAt = new Date();
        data.arrivalNote = 'سيصل في الميعاد المنسق مع خدمة العملاء والمندوب';
      }
      if (body.status === 'delivered') data.deliveredAt = new Date();

      const order = await db.order.update({ where: { id }, data });

      // ===== Commission side-effects (نظام العمولات) =====
      // delivered → earn (idempotent)
      if (body.status === 'delivered' || body.status === 'commission_received') {
        await ensureEarnedEntry(id);
      }
      // returned/cancelled after earning → reverse
      if (
        (body.status === 'returned' || body.status === 'cancelled') &&
        ['delivered', 'commission_received'].includes(current.status)
      ) {
        await ensureReversalEntry(id, `عكس العمولة — الطلب أصبح ${body.status}`);
      }

      return NextResponse.json(order);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  });
}
