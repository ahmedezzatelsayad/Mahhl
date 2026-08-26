import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminOnly } from '@/lib/auth';

const ALLOWED = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminOnly(req, async () => {
    const { id } = await params;
    const body = await req.json();
    if (!ALLOWED.includes(body.status)) {
      return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 });
    }
    try {
      const data: any = { status: body.status };
      if (body.status === 'shipped' && body.shippedAt === undefined) {
        data.shippedAt = new Date();
        data.arrivalNote = 'سيصل في الميعاد المنسق مع خدمة العملاء والمندوب';
      }
      if (body.status === 'delivered') data.deliveredAt = new Date();
      const order = await db.order.update({ where: { id }, data });
      return NextResponse.json(order);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  });
}
