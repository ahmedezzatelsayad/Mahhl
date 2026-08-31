import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { ROLES, ROLE_LABELS_AR, type Role } from '@/lib/permissions';

/** Count active owners — used to prevent owner lock-out. */
async function activeOwnerCount(): Promise<number> {
  return db.adminUser.count({ where: { role: 'owner', isActive: true } });
}

/**
 * PATCH /api/admin/staff/[id] — update role / active / name / password (owner only).
 * Body: { role?, isActive?, name?, password? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requirePermission(req, 'staff', 'manage', async (me) => {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });

    const target = await db.adminUser.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });

    const data: Record<string, unknown> = {};

    if (body.role !== undefined) {
      const role = String(body.role) as Role;
      if (!(ROLES as readonly string[]).includes(role)) {
        return NextResponse.json({ error: 'الدور غير صحيح' }, { status: 400 });
      }
      // Self-lockout guard: owner cannot demote themselves
      if (target.id === me.id && role !== 'owner') {
        return NextResponse.json(
          { error: 'لا يمكنك تخفيض دورك الخاص — كلّف مالكاً آخر أو استخدم حساباً آخر' },
          { status: 400 }
        );
      }
      // Last-owner guard: cannot demote the final active owner
      if (target.role === 'owner' && role !== 'owner' && (await activeOwnerCount()) <= 1) {
        return NextResponse.json(
          { error: 'لا يمكن تخفيض دور آخر مالك نشط في المتجر' },
          { status: 400 }
        );
      }
      data.role = role;
    }

    if (body.isActive !== undefined) {
      const isActive = Boolean(body.isActive);
      if (target.id === me.id && !isActive) {
        return NextResponse.json(
          { error: 'لا يمكنك تعطيل حسابك الخاص' },
          { status: 400 }
        );
      }
      if (target.role === 'owner' && !isActive && (await activeOwnerCount()) <= 1) {
        return NextResponse.json(
          { error: 'لا يمكن تعطيل آخر مالك نشط في المتجر' },
          { status: 400 }
        );
      }
      data.isActive = isActive;
    }

    if (body.name !== undefined) {
      const name = String(body.name).trim().slice(0, 80);
      if (name.length < 2) return NextResponse.json({ error: 'الاسم قصير جداً' }, { status: 400 });
      data.name = name;
    }

    if (body.password !== undefined && body.password !== '') {
      const password = String(body.password);
      if (password.length < 8) {
        return NextResponse.json({ error: 'كلمة المرور 8 أحرف على الأقل' }, { status: 400 });
      }
      data.passwordHash = await bcrypt.hash(password, 10);
      // NOTE: password change invalidates existing tokens implicitly —
      // the signature is bound to the OLD passwordHash, so all old tokens 401.
    }

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: 'لا يوجد شيء لتحديثه' }, { status: 400 });
    }

    const updated = await db.adminUser.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true },
    });
    return NextResponse.json({ user: updated });
  });
}

/**
 * DELETE /api/admin/staff/[id] — remove a staff account (owner only).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requirePermission(req, 'staff', 'manage', async (me) => {
    const { id } = await params;

    const target = await db.adminUser.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });

    if (target.id === me.id) {
      return NextResponse.json({ error: 'لا يمكنك حذف حسابك الخاص' }, { status: 400 });
    }
    if (target.role === 'owner' && (await activeOwnerCount()) <= 1) {
      return NextResponse.json(
        { error: 'لا يمكن حذف آخر مالك نشط في المتجر' },
        { status: 400 }
      );
    }

    await db.adminUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
