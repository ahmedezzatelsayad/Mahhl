import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import type { NextRequest } from 'next/server';

/**
 * Customer authentication — Kuwaiti-simple by design:
 *  • username = phone number
 *  • default password = phone number (auto-created at checkout / register)
 *  • customer can change the password from "حسابي"
 *
 * Token format mirrors the admin one: base64url(id|ts|sig)
 * where sig = bcrypt(`${id}:${ts}:${passwordHash}`)
 */

export function normalizeKwPhone(input: string): string {
  let p = (input || '').replace(/\s|-|\(|\)/g, '');
  if (p.startsWith('+965')) p = p.slice(4);
  else if (p.startsWith('00965')) p = p.slice(5);
  else if (p.startsWith('965') && p.length > 8) p = p.slice(3);
  return p;
}

export function isValidKwPhone(p: string): boolean {
  return /^[45679]\d{7}$/.test(p); // Kuwaiti 8-digit numbers
}

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
