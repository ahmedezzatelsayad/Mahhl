/**
 * garfix-sso.ts — عميل الدخول الموحد من ناحية منصة Garfix Stores (SP).
 *
 * ERP هو مالك الهوية (IdP) — هذه المكتبة تبني رحلة OAuth2-style مبسطة:
 *  login     → بناء رابط authorize في ERP (مع state في كوكي httpOnly قصير)
 *  callback  → استبدال الكود (server-to-server) ببيانات مستخدم ERP
 *  ticket    → تسليم الجلسة للواجهة: تذكرة لمرة واحدة في SiteSetting
 *              (تعمل على Vercel serverless — لا ذاكرة عملية مشتركة)
 *  consume   → الواجهة تستبدل التذكرة بالتوكن الحقيقي عبر POST
 *
 * ربط الحسابات: بريد مستخدم ERP هو المفتاح —
 *  - موجود في AdminUser → جلسة أدمن بنفس صلاحياته (owner إذا كان دور ERP=admin)
 *  - غير موجود ودور ERP=admin (المؤسس) → يُنشأ أدمن owner تلقائياً
 *  - غير موجود ودور أدنى → رفض واضح (لا ترقية صلاحيات عبر SSO أبداً)
 */
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';

const ERP_BASE = process.env.ERP_BASE_URL || 'http://localhost:3000';
const TICKET_KEY = 'sso_tickets';
const TICKET_TTL_MS = 60_000; // التذكرة تعيش دقيقة واحدة فقط

export interface ErpSsoUser {
  sub: string;
  email: string;
  displayName: string;
  role: string;
}

export function erpAuthorizeUrl(redirectUri: string, state: string): string {
  const u = new URL(`${ERP_BASE}/api/auth/sso/authorize`);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('state', state);
  return u.toString();
}

export function erpTokenEndpoint(): string {
  return `${ERP_BASE}/api/auth/sso/token`;
}

/** استبدال الكود ببيانات المستخدم — من الخادم إلى خادم ERP مباشرة. */
export async function exchangeCodeForUser(
  code: string,
  redirectUri: string,
): Promise<ErpSsoUser | null> {
  try {
    const res = await fetch(erpTokenEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; user?: ErpSsoUser };
    if (!data.ok || !data.user?.email) return null;
    return data.user;
  } catch {
    return null;
  }
}

// ── بناء توكن أدمن بنفس مخطط /api/admin/login (email|ts|bcrypt-sig) ──

export async function mintAdminToken(admin: {
  email: string;
  passwordHash: string;
}): Promise<string> {
  const ts = Date.now();
  const sig = await bcrypt.hash(`${admin.email}:${ts}:${admin.passwordHash}`, 10);
  return Buffer.from(`${admin.email}|${ts}|${sig}`).toString('base64url');
}

// ── تذاكر لمرة واحدة (تسليم التوكن للواجهة بلا كشفه في الرابط) ──

interface StoredTicket {
  token: string;
  user: { id: string; email: string; name: string | null; role: string };
  exp: number;
}

async function readTickets(): Promise<Record<string, StoredTicket>> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: TICKET_KEY } });
    return (row?.value as Record<string, StoredTicket>) || {};
  } catch {
    return {};
  }
}

async function writeTickets(map: Record<string, StoredTicket>): Promise<void> {
  const now = Date.now();
  for (const k of Object.keys(map)) if (map[k].exp < now) delete map[k];
  await db.siteSetting.upsert({
    where: { key: TICKET_KEY },
    update: { value: map as any },
    create: { key: TICKET_KEY, value: map as any },
  });
}

export async function storeSsoTicket(payload: Omit<StoredTicket, 'exp'>): Promise<string> {
  const ticket = randomBytes(24).toString('base64url');
  const map = await readTickets();
  map[ticket] = { ...payload, exp: Date.now() + TICKET_TTL_MS };
  await writeTickets(map);
  return ticket;
}

export async function consumeSsoTicket(ticket: string): Promise<StoredTicket | null> {
  if (!ticket || ticket.length > 100) return null;
  const map = await readTickets();
  const entry = map[ticket];
  if (!entry) return null;
  delete map[ticket]; // لمرة واحدة
  await writeTickets(map);
  if (entry.exp < Date.now()) return null;
  return entry;
}
