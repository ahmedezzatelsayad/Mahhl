import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { can, normalizeRole, type Module, type Role } from '@/lib/permissions';
import type { NextRequest } from 'next/server';

/** Admin session tokens are valid for 7 days from issuance. */
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AdminSession {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  /** normalized role, e.g. legacy "staff" -> "viewer" */
  isActive: boolean;
}

/**
 * Verify an admin token from the Authorization header.
 * Checks: token signature, 7-day expiry, account still exists & active.
 * Returns the admin user on success, or null on failure.
 */
export async function verifyAdmin(req: NextRequest): Promise<AdminSession | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [email, ts, sig] = decoded.split('|');
    if (!email || !ts) return null;

    // Expiry: reject tokens older than TTL (legacy tokens had no expiry check).
    const issuedAt = Number(ts);
    if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > TOKEN_TTL_MS) return null;

    const admin = await db.adminUser.findUnique({ where: { email } });
    if (!admin) return null;
    // Deactivated accounts lose access IMMEDIATELY, even with a valid token.
    if (admin.isActive === false) return null;

    const ok = await bcrypt.compare(
      `${admin.email}:${ts}:${admin.passwordHash}`,
      sig
    );
    if (!ok) return null;

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: normalizeRole(admin.role),
      isActive: admin.isActive,
    };
  } catch {
    return null;
  }
}

/**
 * Wrap a handler so it runs only for authenticated admins
 * (any role) — use requirePermission for module-level rules.
 */
export async function adminOnly<T>(
  req: NextRequest,
  handler: (admin: AdminSession) => Promise<T>
): Promise<T | Response> {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handler(admin);
}

/**
 * Wrap a handler so it runs only for admins whose role has at least
 * `level` access to `module`. Returns 401 when not logged in and
 * 403 (with a human-readable Arabic message) when lacking permission.
 */
export async function requirePermission<T>(
  req: NextRequest,
  module: Module,
  level: 'view' | 'manage',
  handler: (admin: AdminSession) => Promise<T>
): Promise<T | Response> {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!can(admin.role, module, level)) {
    return Response.json(
      { error: 'ليست لديك صلاحية للوصول إلى هذا القسم' },
      { status: 403 }
    );
  }
  return handler(admin);
}
