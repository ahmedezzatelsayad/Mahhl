import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'بيانات الدخول غير مكتملة' }, { status: 400 });
  }
  const admin = await db.adminUser.findUnique({ where: { email } });
  if (!admin) {
    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
  }
  // Signed token: email + secret + timestamp — verified on admin API calls
  const ts = Date.now();
  const sig = await bcrypt.hash(`${admin.email}:${ts}:${admin.passwordHash}`, 10);
  const token = Buffer.from(`${admin.email}|${ts}|${sig}`).toString('base64url');
  return NextResponse.json({
    token,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
}

export async function GET(req: NextRequest) {
  // Verify token for current session — used by client to confirm auth
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [email, ts, sig] = decoded.split('|');
    if (!email || !ts) return NextResponse.json({ ok: false }, { status: 401 });
    const admin = await db.adminUser.findUnique({ where: { email } });
    if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
    const ok = await bcrypt.compare(`${admin.email}:${ts}:${admin.passwordHash}`, sig);
    if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: true, email: admin.email, name: admin.name, role: admin.role });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
