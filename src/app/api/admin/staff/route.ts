import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { ROLES, ROLE_LABELS_AR, type Role } from '@/lib/permissions';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/admin/staff — list all staff accounts (owner only).
 */
export async function GET(req: NextRequest) {
  return requirePermission(req, 'staff', 'manage', async (me) => {
    const users = await db.adminUser.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ me: me.email, users });
  });
}

/**
 * POST /api/admin/staff — create a staff account (owner only).
 * Body: { name, email, password, role }
 */
export async function POST(req: NextRequest) {
  return requirePermission(req, 'staff', 'manage', async () => {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });

    const name = String(body.name ?? '').trim().slice(0, 80);
    const email = String(body.email ?? '').trim().toLowerCase().slice(0, 160);
    const password = String(body.password ?? '');
    const role = String(body.role ?? '') as Role;

    if (name.length < 2) {
      return NextResponse.json({ error: 'اكتب اسم الموظف' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'البريد الإلكتروني غير صحيح' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'كلمة المرور 8 أحرف على الأقل' }, { status: 400 });
    }
    if (!(ROLES as readonly string[]).includes(role)) {
      return NextResponse.json(
        { error: `الدور غير صحيح — المتاح: ${ROLES.map((r) => ROLE_LABELS_AR[r]).join(' / ')}` },
        { status: 400 }
      );
    }

    const exists = await db.adminUser.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: 'هذا البريد مستخدم بالفعل' }, { status: 409 });
    }

    const created = await db.adminUser.create({
      data: {
        name,
        email,
        role,
        passwordHash: await bcrypt.hash(password, 10),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    return NextResponse.json({ user: created }, { status: 201 });
  });
}
