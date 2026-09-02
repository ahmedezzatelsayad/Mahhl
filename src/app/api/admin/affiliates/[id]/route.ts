import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { cleanText } from '@/lib/create-order';
import { affiliateBuckets, PAYOUT_METHODS } from '@/lib/commission';

export const dynamic = 'force-dynamic';

/** One affiliate detail + money buckets. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requirePermission(req, 'affiliates', 'view', async () => {
    const { id } = await params;
    const aff = await db.affiliate.findUnique({
      where: { id },
      select: {
        id: true, name: true, phone: true, email: true, code: true, status: true,
        paymentMethod: true, paymentAccount: true, notes: true, createdAt: true, lastLoginAt: true,
      },
    });
    if (!aff) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
    const buckets = await affiliateBuckets(id);
    return NextResponse.json({ affiliate: aff, buckets });
  });
}

/** Update status / payout info / password / notes. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requirePermission(req, 'affiliates', 'manage', async () => {
    const { id } = await params;
    const body = await req.json();
    const data: any = {};

    if (body.status !== undefined) {
      const s = String(body.status);
      if (!['active', 'pending', 'suspended'].includes(s)) {
        return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 });
      }
      data.status = s;
    }
    if (body.paymentMethod !== undefined) {
      const m = String(body.paymentMethod || '');
      if (m && !PAYOUT_METHODS.some((x) => x.value === m)) {
        return NextResponse.json({ error: 'طريقة دفع غير صحيحة' }, { status: 400 });
      }
      data.paymentMethod = m || null;
    }
    if (body.paymentAccount !== undefined) {
      data.paymentAccount = cleanText(body.paymentAccount, 200) || null;
    }
    if (body.notes !== undefined) data.notes = cleanText(body.notes, 500) || null;
    if (body.name !== undefined) {
      const name = cleanText(body.name, 80);
      if (name.length < 2) return NextResponse.json({ error: 'اسم غير صحيح' }, { status: 400 });
      data.name = name;
    }
    if (body.newPassword) {
      const np = String(body.newPassword);
      if (np.length < 6) return NextResponse.json({ error: 'كلمة المرور 6 أحرف على الأقل' }, { status: 400 });
      data.passwordHash = await bcrypt.hash(np, 10);
    }

    const aff = await db.affiliate.update({ where: { id }, data });
    return NextResponse.json({ ok: true, affiliate: { id: aff.id, status: aff.status } });
  });
}

/** Delete an affiliate (only when they have no money history). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return requirePermission(req, 'affiliates', 'manage', async () => {
    const { id } = await params;
    const [entries, withdrawals] = await Promise.all([
      db.commissionEntry.count({ where: { affiliateId: id } }),
      db.withdrawalRequest.count({ where: { affiliateId: id } }),
    ]);
    if (entries > 0 || withdrawals > 0) {
      return NextResponse.json(
        { error: 'لا يمكن حذف مسوق له سجل عمولات — علّقه (موقوف) بدلاً من الحذف' },
        { status: 400 }
      );
    }
    await db.affiliate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
