import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
  return requirePermission(req, 'products', 'view', async () => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    const [total, items] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true },
      }),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  });
}

/** slugify Arabic/Latin names into URL-safe slugs */
function slugify(name: string): string {
  const base = (name || '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return base || 'product';
}

async function uniqueSlug(name: string): Promise<string> {
  let slug = slugify(name);
  const exists = await db.product.findUnique({ where: { slug } });
  if (!exists) return slug;
  return `${slug}-${Date.now().toString(36)}`;
}

/** POST — create a product (admin) */
export async function POST(req: NextRequest) {
  return requirePermission(req, 'products', 'manage', async () => {
    try {
      const body = await req.json();

      const name = (body.name || '').trim();
      const price = parseFloat(body.price);
      const salePrice = body.salePrice !== undefined && body.salePrice !== '' ? parseFloat(body.salePrice) : price;

      if (!name) {
        return NextResponse.json({ error: 'اسم المنتج مطلوب' }, { status: 400 });
      }
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: 'السعر غير صحيح' }, { status: 400 });
      }
      if (isNaN(salePrice) || salePrice < 0) {
        return NextResponse.json({ error: 'سعر البيع غير صحيح' }, { status: 400 });
      }

      const slug = await uniqueSlug(name);
      let sku = (body.sku || '').trim();
      if (sku) {
        const skuTaken = await db.product.findUnique({ where: { sku } });
        if (skuTaken) {
          return NextResponse.json({ error: 'رمز SKU مستخدم من قبل — اكتب رمزاً آخر' }, { status: 400 });
        }
      } else {
        sku = `SKU-${Date.now().toString(36).toUpperCase()}`;
      }

      const product = await db.product.create({
        data: {
          name,
          slug,
          sku,
          description: body.description || '',
          metaDescription: body.metaDescription || null,
          metaTitle: body.metaTitle || null,
          keywords: body.keywords || null,
          price,
          salePrice,
          quantity: parseInt(body.quantity ?? '20') || 20,
          trackStock: !!body.trackStock,
          disableOOS: !!body.disableOOS,
          thumb: body.thumb || null,
          images: body.images || '',
          categoryId: body.categoryId || null,
          isBestSeller: !!body.isBestSeller,
          variations: body.variations || null,
          supplier: body.supplier || null,
          originalPrice: body.originalPrice ? parseFloat(body.originalPrice) : null,
        },
        include: { category: true },
      });

      return NextResponse.json({ success: true, product }, { status: 201 });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'فشل إنشاء المنتج' }, { status: 500 });
    }
  });
}
