import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  try {
    const data: any = {};
    if (body.quantity !== undefined) data.quantity = parseInt(body.quantity);
    if (body.trackStock !== undefined) data.trackStock = !!body.trackStock;
    if (body.disableOOS !== undefined) data.disableOOS = !!body.disableOOS;
    if (body.price !== undefined) data.price = parseFloat(body.price);
    if (body.salePrice !== undefined) data.salePrice = parseFloat(body.salePrice);
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
    if (body.isBestSeller !== undefined) data.isBestSeller = !!body.isBestSeller;
    if (body.thumb !== undefined) data.thumb = body.thumb;
    if (body.images !== undefined) data.images = body.images;
    if (body.variations !== undefined) data.variations = body.variations;

    const product = await db.product.update({ where: { id }, data });
    return NextResponse.json(product);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
