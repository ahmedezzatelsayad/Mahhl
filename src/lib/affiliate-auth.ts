/**
 * affiliate-auth.ts — authentication for the affiliate portal (بوابة المسوقين).
 * Mirrors the admin token scheme: signed stateless token verified against the
 * DB row on every request, so deactivation/suspension takes effect instantly.
 */
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import type { NextRequest } from 'next/server';

/** Affiliate session tokens are valid for 7 days from issuance. */
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AffiliateSession {
  id: string;
  name: string;
  phone: string;
  code: string;
  status: string; // active | pending | suspended
  paymentMethod: string | null;
  paymentAccount: string | null;
}

export async function verifyAffiliate(req: NextRequest): Promise<AffiliateSession | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [phone, ts, sig] = decoded.split('|');
    if (!phone || !ts) return null;

    const issuedAt = Number(ts);
    if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > TOKEN_TTL_MS) return null;

    const aff = await db.affiliate.findUnique({ where: { phone } });
    if (!aff || aff.status === 'suspended') return null;

    const ok = await bcrypt.compare(`${aff.phone}:${ts}:${aff.passwordHash}`, sig);
    if (!ok) return null;

    return {
      id: aff.id,
      name: aff.name,
      phone: aff.phone,
      code: aff.code,
      status: aff.status,
      paymentMethod: aff.paymentMethod,
      paymentAccount: aff.paymentAccount,
    };
  } catch {
    return null;
  }
}

/** Wrap a handler so it runs only for authenticated affiliates. */
export async function affiliateOnly<T>(
  req: NextRequest,
  handler: (aff: AffiliateSession) => Promise<T>
): Promise<T | Response> {
  const aff = await verifyAffiliate(req);
  if (!aff) {
    return Response.json({ error: 'غير مصرح — سجل دخول مرة ثانية' }, { status: 401 });
  }
  return handler(aff);
}

/** Generate a unique affiliate referral code, e.g. "MH-7K3F". */
export async function generateAffiliateCode(): Promise<string> {
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no confusing chars
  for (let attempt = 0; attempt < 30; attempt++) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    const code = `MH-${suffix}`;
    const exists = await db.affiliate.findUnique({ where: { code } });
    if (!exists) return code;
  }
  // extremely unlikely fallback with timestamp
  return `MH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
