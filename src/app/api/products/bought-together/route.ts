import { NextRequest, NextResponse } from 'next/server';
import { getBoughtTogether } from '@/lib/ai/bought-together';

/**
 * GET /api/products/bought-together?productId=...&exclude=id1,id2&limit=5
 *
 * Amazon-style "customers who bought this also bought" — real co-purchase
 * + co-view signals, with cart items always excluded.
 */
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId');
  const excludeRaw = req.nextUrl.searchParams.get('exclude') || '';
  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Math.min(8, parseInt(limitParam) || 5) : 5;

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }

  const excludeIds = excludeRaw.split(',').map((s) => s.trim()).filter(Boolean);

  try {
    const { triggerSlug, items } = await getBoughtTogether(productId, {
      excludeIds,
      limit,
    });
    return NextResponse.json({ triggerSlug, items });
  } catch (e) {
    console.error('[bought-together] failed', e);
    return NextResponse.json({ triggerSlug: null, items: [] });
  }
}
