import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { normalizeRole } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'بيانات الدخول غير مكتملة' }, { status: 400 });
  }
  const admin = await db.adminUser.findUnique({ where: { email: String(email).trim().toLowerCase() } });
  if (!admin) {
    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
  }
  if (admin.isActive === false) {
    return NextResponse.json(
      { error: 'هذا الحساب معطّل — راجع مالك المتجر' },
      { status: 403 }
    );
  }

  // Signed token: email + timestamp + password-bound signature —
  // verified (incl. 7-day expiry + active check) on every admin API call.
  const ts = Date.now();
  const sig = await bcrypt.hash(`${admin.email}:${ts}:${admin.passwordHash}`, 10);
  const token = Buffer.from(`${admin.email}|${ts}|${sig}`).toString('base64url');

  // fire-and-forget bookkeeping (never block login on it)
  db.adminUser
    .update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
    .catch(() => {});

  return NextResponse.json({
    token,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: normalizeRole(admin.role),
    },
  });
}

export async function GET(req: NextRequest) {
  // Verify token for current session — used by client to confirm auth + role
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({
    ok: true,
    user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
  });
}
