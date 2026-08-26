import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reqLang, locProduct, CDN_CACHE } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const lang = reqLang(req);
  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  // Related products in same category (ranked by demand, then newest)
  let related: any[] = [];
  if (product.categoryId) {
    related = await db.product.findMany({
      where: {
        categoryId: product.categoryId,
        NOT: { id: product.id },
      },
      take: 8,
      orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
    });
  }
  // live viewers — real distinct sessions that viewed this product in last 24h
  let liveViewers = 0;
  try {
    liveViewers = await db.userEvent.count({
      where: {
        type: 'product_view',
        productId: product.id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
  } catch {
    /* events table may be cold */
  }
  return NextResponse.json(
    {
      product: locProduct({ ...product, liveViewers }, lang),
      related: related.map((r) => locProduct(r, lang)),
    },
    { headers: { 'Cache-Control': CDN_CACHE } }
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  try {
    const product = await db.product.update({
      where: { slug },
      data: {
        name: body.name,
        description: body.description,
        metaDescription: body.metaDescription || null,
        price: parseFloat(body.price),
        salePrice: parseFloat(body.salePrice),
        quantity: parseInt(body.quantity) || 0,
        trackStock: !!body.trackStock,
        disableOOS: !!body.disableOOS,
        thumb: body.thumb || null,
        images: body.images || '',
        categoryId: body.categoryId || null,
        isBestSeller: !!body.isBestSeller,
        variations: body.variations || null,
      },
    });
    return NextResponse.json(product);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    await db.product.delete({ where: { slug } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
