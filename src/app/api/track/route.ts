import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/track
 * Log a user behavior event. Creates a session row if missing.
 *
 * Body:
 *  - visitorId (string, required) — stable localStorage ID
 *  - type (enum: page_view|product_view|search|add_to_cart|remove_from_cart|
 *               cart_open|checkout_start|checkout_complete|upsell_shown|
 *               upsell_clicked|upsell_added|filter_apply)
 *  - productId?  string
 *  - categoryId?  string
 *  - query?  string
 *  - metadata?  any
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitorId, type, productId, categoryId, query, metadata } = body;

    if (!visitorId || !type) {
      return NextResponse.json(
        { error: 'visitorId and type are required' },
        { status: 400 }
      );
    }

    const validTypes = new Set([
      'page_view',
      'product_view',
      'search',
      'add_to_cart',
      'remove_from_cart',
      'cart_open',
      'checkout_start',
      'checkout_complete',
      'upsell_shown',
      'upsell_clicked',
      'upsell_added',
      'filter_apply',
    ]);
    if (!validTypes.has(type)) {
      return NextResponse.json({ error: `Unknown event type: ${type}` }, { status: 400 });
    }

    // Ensure session row exists (cheap upsert)
    const session = await db.userSession.upsert({
      where: { visitorId },
      create: {
        visitorId,
        userAgent: req.headers.get('user-agent')?.slice(0, 250) || null,
        referrer: req.headers.get('referer')?.slice(0, 250) || null,
        ipHash: null,
      },
      update: {
        updatedAt: new Date(),
        userAgent: req.headers.get('user-agent')?.slice(0, 250) || undefined,
      },
    });

    // Create event
    await db.userEvent.create({
      data: {
        sessionId: session.id,
        type,
        productId: productId || null,
        categoryId: categoryId || null,
        query: query || null,
        metadata: metadata || undefined,
      },
    });

    return NextResponse.json({ ok: true, sessionId: session.id });
  } catch (e: any) {
    console.error('[track] failed:', e);
    return NextResponse.json({ error: e.message || 'Tracking failed' }, { status: 500 });
  }
}

/**
 * GET /api/track?visitorId=...
 * Returns the visitor's session + last 50 events (for debugging / client display).
 */
export async function GET(req: NextRequest) {
  const visitorId = req.nextUrl.searchParams.get('visitorId');
  if (!visitorId) {
    return NextResponse.json({ error: 'visitorId required' }, { status: 400 });
  }
  const session = await db.userSession.findUnique({
    where: { visitorId },
    include: {
      events: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });
  if (!session) return NextResponse.json({ session: null, events: [] });
  return NextResponse.json({ session, events: session.events });
}
