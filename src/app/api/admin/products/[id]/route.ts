import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/** GET — load one product for the edit form */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requirePermission(req, 'products', 'view', async () => {
    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
    }
    return NextResponse.json({ product });
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requirePermission(req, 'products', 'manage', async () => {
    const { id } = await params;
    const body = await req.json();
    try {
      const data: any = {};
      if (body.quantity !== undefined) data.quantity = parseInt(body.quantity) || 0;
      if (body.trackStock !== undefined) data.trackStock = !!body.trackStock;
      if (body.disableOOS !== undefined) data.disableOOS = !!body.disableOOS;
      if (body.price !== undefined) data.price = parseFloat(body.price);
      if (body.salePrice !== undefined) data.salePrice = parseFloat(body.salePrice);
      if (body.commission !== undefined) data.commission = Math.max(0, parseFloat(body.commission) || 0);
      if (body.name !== undefined) data.name = String(body.name).trim();
      if (body.description !== undefined) data.description = body.description;
      if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription || null;
      if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle || null;
      if (body.keywords !== undefined) data.keywords = body.keywords || null;
      if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
      if (body.isBestSeller !== undefined) data.isBestSeller = !!body.isBestSeller;
      if (body.thumb !== undefined) data.thumb = body.thumb || null;
      if (body.images !== undefined) data.images = body.images || '';
      if (body.variations !== undefined) data.variations = body.variations || null;
      if (body.supplier !== undefined) data.supplier = body.supplier || null;
      if (body.sku !== undefined && body.sku) {
        const taken = await db.product.findFirst({
          where: { sku: body.sku, NOT: { id } },
        });
        if (taken) {
          return NextResponse.json({ error: 'رمز SKU مستخدم من قبل' }, { status: 400 });
        }
        data.sku = body.sku;
      }

      const product = await db.product.update({ where: { id }, data });
      return NextResponse.json({ success: true, product });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requirePermission(req, 'products', 'manage', async () => {
    const { id } = await params;
    try {
      await db.product.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (e: any) {
      // product referenced by past orders → soft delete instead
      if (String(e?.code) === 'P2003') {
        await db.product
          .update({
            where: { id },
            data: { quantity: 0, disableOOS: true },
          })
          .catch(() => {});
        return NextResponse.json({
          success: true,
          softDeleted: true,
          message: 'المنتج مرتبط بطلبات سابقة — تم إخفاؤه وتصفير كميته بدلاً من حذفه',
        });
      }
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  });
}
