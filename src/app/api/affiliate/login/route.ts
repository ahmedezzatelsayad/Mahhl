import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { verifyAffiliate } from '@/lib/affiliate-auth';
import { normalizeKwPhone, isValidKwPhone } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { phone, password } = await req.json();
  if (!phone || !password) {
    return NextResponse.json({ error: 'بيانات الدخول غير مكتملة' }, { status: 400 });
  }
  const normalized = normalizeKwPhone(String(phone));
  const aff = await db.affiliate.findUnique({ where: { phone: normalized } });
  if (!aff) {
    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, aff.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
  }
  if (aff.status === 'suspended') {
    return NextResponse.json(
      { error: 'حسابك موقوف — راجع إدارة المنصة' },
      { status: 403 }
    );
  }

  // Signed token: phone + timestamp + password-bound signature (7-day expiry,
  // suspension check on every request) — same hardening as the admin portal.
  const ts = Date.now();
  const sig = await bcrypt.hash(`${aff.phone}:${ts}:${aff.passwordHash}`, 10);
  const token = Buffer.from(`${aff.phone}|${ts}|${sig}`).toString('base64url');

  db.affiliate
    .update({ where: { id: aff.id }, data: { lastLoginAt: new Date() } })
    .catch(() => {});

  return NextResponse.json({
    token,
    affiliate: {
      id: aff.id,
      name: aff.name,
      phone: aff.phone,
      code: aff.code,
      status: aff.status,
    },
  });
}

export async function GET(req: NextRequest) {
  const aff = await verifyAffiliate(req);
  if (!aff) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, affiliate: aff });
}
