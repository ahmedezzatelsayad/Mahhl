import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { verifyCustomer } from '@/lib/customer-auth';
import { createOrder, cleanText } from '@/lib/create-order';

/* ============================================================
 * PRODUCTION HARDENING (per the pre-launch review)
 *  1. Prices & names come from the DATABASE — client values ignored
 *     (see src/lib/create-order.ts — shared with the AI agent)
 *  2. Shipping fee/threshold computed server-side from settings
 *  3. Kuwait mobile validated (8 digits, starts 5/6/9)
 *  4. Duplicate-order guard: same phone within 90s returns the
 *     original order instead of creating a second one
 *  5. IP rate limit: 6 orders / 15 min (in-memory ring)
 *  6. Honeypot field ("website") — bots fill it, we reject silently
 *  7. All free-text sanitized + length-capped
 * ============================================================ */

const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW_MS = 15 * 60_000;

/** Simple in-memory rate limiter (per runtime instance — enough vs spam waves). */
const ipHits = new Map<string, number[]>();
function ipLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  // keep the map small
  if (ipHits.size > 500) {
    for (const [k, v] of ipHits) {
      if (v.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) ipHits.delete(k);
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    // ---- 0. Rate limit + honeypot -------------------------------
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    if (ipLimited(ip)) {
      return NextResponse.json(
        { error: 'تم استلام عدة طلبات من جهازك خلال وقت قصير. انتظر قليلاً أو تواصل معنا على الواتساب.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Honeypot: real customers never see/fill this hidden field
    if (cleanText(body.website, 50)) {
      return NextResponse.json({ success: true, order: null, spam: true }, { status: 201 });
    }

    // logged-in customers attach their account automatically
    let authCustomerId: string | null = null;
    try {
      const authCustomer = await verifyCustomer(req);
      if (authCustomer) authCustomerId = authCustomer.id;
    } catch {
      /* guest checkout */
    }

    const result = await createOrder({
      phone: body.phone,
      customerName: body.customerName,
      address: body.address,
      governorate: body.governorate,
      area: body.area,
      email: body.email,
      notes: body.notes,
      paymentMethod: body.paymentMethod === 'card' ? 'card' : 'cod',
      items: Array.isArray(body.items) ? body.items : [],
      utm: {
        utmSource: body.utmSource,
        utmMedium: body.utmMedium,
        utmCampaign: body.utmCampaign,
        utmTerm: body.utmTerm,
        utmContent: body.utmContent,
        landingPath: body.landingPath,
      },
      authCustomerId,
      source: 'checkout',
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        order: result.order,
        duplicate: result.duplicate,
        accountCreated: result.accountCreated,
        loginHint: result.loginHint,
      },
      { status: result.duplicate ? 200 : 201 }
    );
  } catch (e: any) {
    console.error('Order creation failed:', e);
    return NextResponse.json(
      { error: 'تعذر إنشاء الطلب — جرّب مرة ثانية أو تواصل معنا على الواتساب' },
      { status: 500 }
    );
  }
}

/** Admin-only list (customers use /api/customer/orders or /api/orders/track) */
export async function GET(req: NextRequest) {
  return requirePermission(req, 'orders', 'view', async () => {
    const orders = await db.order.findMany({
      include: { items: true, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json(orders);
  });
}
