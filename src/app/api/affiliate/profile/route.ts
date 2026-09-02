import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { affiliateOnly } from '@/lib/affiliate-auth';
import { PAYOUT_METHODS } from '@/lib/commission';

export const dynamic = 'force-dynamic';

/** Update payout preferences / password (حسابي). */
export async function PATCH(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    const body = await req.json();
    const data: any = {};

    if (body.paymentMethod !== undefined) {
      const m = String(body.paymentMethod || '');
      if (m && !PAYOUT_METHODS.some((x) => x.value === m)) {
        return NextResponse.json({ error: 'طريقة دفع غير صحيحة' }, { status: 400 });
      }
      data.paymentMethod = m || null;
    }
    if (body.paymentAccount !== undefined) {
      data.paymentAccount = String(body.paymentAccount || '').slice(0, 200) || null;
    }
    if (body.email !== undefined) {
      const email = String(body.email || '').trim().toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'إيميل غير صحيح' }, { status: 400 });
      }
      if (email) {
        const taken = await db.affiliate.findUnique({ where: { email } });
        if (taken && taken.id !== aff.id) {
          return NextResponse.json({ error: 'الإيميل مستخدم بحساب آخر' }, { status: 409 });
        }
      }
      data.email = email || null;
    }

    if (body.newPassword) {
      const cur = String(body.currentPassword || '');
      const row = await db.affiliate.findUnique({ where: { id: aff.id } });
      if (!row || !(await bcrypt.compare(cur, row.passwordHash))) {
        return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 });
      }
      const np = String(body.newPassword);
      if (np.length < 6) {
        return NextResponse.json(
          { error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' },
          { status: 400 }
        );
      }
      data.passwordHash = await bcrypt.hash(np, 10);
    }

    await db.affiliate.update({ where: { id: aff.id }, data });
    return NextResponse.json({ ok: true });
  });
}
