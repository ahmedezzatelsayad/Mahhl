import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import type { NextRequest } from 'next/server';

// Phone helpers live in a dependency-free module (src/lib/kw-phone.ts) so
// client components can import them WITHOUT pulling Prisma/bcrypt into the
// browser bundle. Re-exported here for existing server-side imports.
export { normalizeKwPhone, isValidKwPhone } from './kw-phone';

/**
 * Customer authentication — Kuwaiti-simple by design:
 *  • username = phone number
 *  • default password = phone number (auto-created at checkout / register)
 *  • customer can change the password from "حسابي"
 *
 * Token format mirrors the admin one: base64url(id|ts|sig)
 * where sig = bcrypt(`${id}:${ts}:${passwordHash}`)
 */

export async function makeCustomerToken(customerId: string): Promise<string> {
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error('customer not found');
  const ts = Date.now().toString();
  const sig = await bcrypt.hash(`${customer.id}:${ts}:${customer.passwordHash ?? ''}`, 8);
  return Buffer.from(`${customer.id}|${ts}|${sig}`, 'utf-8').toString('base64url');
}

export async function verifyCustomer(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [id, ts, sig] = decoded.split('|');
    if (!id || !ts || !sig) return null;
    const customer = await db.customer.findUnique({ where: { id } });
    if (!customer) return null;
    const ok = await bcrypt.compare(
      `${customer.id}:${ts}:${customer.passwordHash ?? ''}`,
      sig
    );
    if (!ok) return null;
    return customer;
  } catch {
    return null;
  }
}

export const customerPublic = (c: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
}) => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  email: c.email,
  city: c.city,
  area: c.area,
  address: c.address,
});
