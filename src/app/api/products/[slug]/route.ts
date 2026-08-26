import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  // Related products in same category
  let related: any[] = [];
  if (product.categoryId) {
    related = await db.product.findMany({
      where: {
        categoryId: product.categoryId,
        NOT: { id: product.id },
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
    });
  }
  return NextResponse.json({ product, related });
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
