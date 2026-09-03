import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/* ============================================================
 * منصة افلييت — لا بيع مباشر: POST is a hard 403 (see below).
 * Order creation happens only via /api/affiliate/orders (marketers)
 * or the admin panel. GET remains for the admin orders list.
 * ============================================================ */

export async function POST(req: NextRequest) {
  /* منصة افلييت — لا بيع مباشر: since the storefront became a pure
   * affiliate platform (no cart / no checkout), public direct order
   * creation is disabled. Orders enter the system only through:
   *   • /api/affiliate/orders  (the marketer registers his customer's order)
   *   • the admin panel
   * This endpoint stays as a hard 403 so no leftover client or bot can
   * create a direct COD order through it. */
  return NextResponse.json(
    {
      error:
        'الموقع ما يبيع مباشرة — محل شوب منصة تسويق بالعمولة. سجّل كمُسوّق مجاناً من زر «سوّق معنا» وسوّق المنتجات بعمولتك الخاصة (من 1 إلى 10 د.ك).',
      registerHint: '/?view=affiliate-login',
    },
    { status: 403 }
  );
}

/** Admin-only list (customers use /api/customer/orders or /api/orders/track) */
export async function GET(req: NextRequest) {
  return requirePermission(req, 'orders', 'view', async () => {
    const orders = await db.order.findMany({
      include: {
        items: true,
        customer: true,
        affiliate: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json(orders);
  });
}
