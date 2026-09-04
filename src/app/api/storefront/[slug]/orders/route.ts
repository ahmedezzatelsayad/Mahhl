/**
 * /api/storefront/[slug]/orders — طلب زائر من متجر مسوّق (الدفع عند الاستلام).
 * التسعير كله server-side من جدول StorefrontProduct — الزائر ما يحدد سعر.
 * الطلب يدخل نظام العمولات باسم صاحب المتجر مباشرة (ربحه = هامشه).
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createOrder } from '@/lib/create-order';
import { loadPublicStorefront, storefrontPrice } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));

  const store = await loadPublicStorefront({ slug: String(slug || '') });
  if (!store) {
    return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 });
  }

  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  if (!items.length) {
    return NextResponse.json({ error: 'السلة فارغة' }, { status: 400 });
  }

  // خريطة منتجات المتجر (للتحقق والتسعير)
  const byId = new Map(store.products.map((sp) => [sp.productId, sp]));
  const orderItems: { productId: string; quantity: number }[] = [];
  const priceOverrides: Record<string, number> = {};

  for (const it of items) {
    const sp = byId.get(String(it?.productId || ''));
    if (!sp || !sp.isActive) {
      return NextResponse.json(
        { error: `المنتج «${String(it?.name || '')}» غير متوفر في هذا المتجر` },
        { status: 400 }
      );
    }
    const qty = Math.floor(Number(it?.quantity) || 1);
    if (qty < 1) {
      return NextResponse.json({ error: 'الكمية غير صحيحة' }, { status: 400 });
    }
    orderItems.push({ productId: sp.productId, quantity: qty });
    priceOverrides[sp.productId] = storefrontPrice(sp.product, store.defaultMarkup, sp.price);
  }

  const result = await createOrder({
    phone: body.phone,
    customerName: body.customerName,
    address: body.address,
    governorate: body.governorate,
    area: body.area,
    notes: typeof body.notes === 'string' ? body.notes : null,
    paymentMethod: 'cod',
    items: orderItems,
    source: 'storefront',
    affiliateId: store.ownerId,
    priceOverrides,
    storefront: { id: store.id, name: store.name, slug: store.slug },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    duplicate: result.duplicate,
    orderNumber: result.order.orderNumber,
    total: result.order.total,
    thankYouNote: store.thankYouNote || null,
    storeName: store.name,
  });
}
