import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import type { NextRequest } from 'next/server';

/**
 * Verify an admin token from the Authorization header.
 * Returns the admin user on success, or null on failure.
 */
export async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [email, ts, sig] = decoded.split('|');
    if (!email || !ts) return null;
    const admin = await db.adminUser.findUnique({ where: { email } });
    if (!admin) return null;
    const ok = await bcrypt.compare(
      `${admin.email}:${ts}:${admin.passwordHash}`,
      sig
    );
    if (!ok) return null;
    return admin;
  } catch {
    return null;
  }
}

export async function adminOnly<T>(
  req: NextRequest,
  handler: (admin: NonNullable<Awaited<ReturnType<typeof verifyAdmin>>>) => Promise<T>
): Promise<T | Response> {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handler(admin);
}
