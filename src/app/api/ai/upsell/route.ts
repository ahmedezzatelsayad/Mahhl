import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUpsellForSession, markOfferInteraction } from '@/lib/ai/upsell';

/**
 * GET /api/ai/upsell?visitorId=...&productId=...&cartItems=...
 * Returns AI-enriched upsell recommendations for the visitor's session.
 *
 * - If productId is provided, generate upsells for that product page.
 * - If cartItems is provided (URL-encoded JSON), generate cart upsells.
 * - Otherwise, return generic best-seller upsells.
 */
export async function GET(req: NextRequest) {
  const visitorId = req.nextUrl.searchParams.get('visitorId');
  const productId = req.nextUrl.searchParams.get('productId') || undefined;
  const cartItemsRaw = req.nextUrl.searchParams.get('cartItems');
  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Math.min(8, parseInt(limitParam) || 4) : 4;

  if (!visitorId) {
    return NextResponse.json({ error: 'visitorId required' }, { status: 400 });
  }

  // Find or create session
  const session = await db.userSession.upsert({
    where: { visitorId },
    create: {
      visitorId,
      userAgent: req.headers.get('user-agent')?.slice(0, 250) || null,
      referrer: req.headers.get('referer')?.slice(0, 250) || null,
    },
    update: { updatedAt: new Date() },
  });

  // Parse cartItems JSON if provided
  let cartItems: { productId: string; name: string; price: number; quantity: number }[] | undefined;
  if (cartItemsRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(cartItemsRaw));
      if (Array.isArray(parsed)) cartItems = parsed;
    } catch {
      // ignore bad JSON
    }
  }

  const recs = await getUpsellForSession(
    { sessionId: session.id, productId, cartItems },
    { limit }
  );

  return NextResponse.json({ sessionId: session.id, items: recs });
}

/**
 * POST /api/ai/upsell
 * Mark an upsell as clicked or added to cart.
 *
 * Body:
 *  - visitorId (required)
 *  - productId (required)
 *  - action: 'clicked' | 'added' (default 'clicked')
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { visitorId, productId, action } = body;
  if (!visitorId || !productId) {
    return NextResponse.json({ error: 'visitorId + productId required' }, { status: 400 });
  }
  const session = await db.userSession.findUnique({ where: { visitorId } });
  if (!session) return NextResponse.json({ ok: false }, { status: 404 });
  await markOfferInteraction(session.id, productId, action === 'added' ? 'added' : 'clicked');
  return NextResponse.json({ ok: true });
}
