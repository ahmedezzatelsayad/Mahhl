import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reqLang, locProduct, CDN_CACHE } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(72, parseInt(searchParams.get('limit') || '24'));
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const bestSeller = searchParams.get('bestSeller') === 'true';
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const sort = searchParams.get('sort') || 'newest';
  const lang = reqLang(req);

  const where: any = {};
  if (search) {
    const like = lang === 'en' ? search : search;
    where.OR = [
      { name: { contains: like } },
      { nameEn: { contains: like } },
      { sku: { contains: like } },
      { description: { contains: like } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (bestSeller) where.isBestSeller = true;
  if (minPrice || maxPrice) {
    where.salePrice = {};
    if (minPrice) where.salePrice.gte = parseFloat(minPrice);
    if (maxPrice) where.salePrice.lte = parseFloat(maxPrice);
  }

  const orderBy: any = {
    newest: { createdAt: 'desc' },
    'price-asc': { salePrice: 'asc' },
    'price-desc': { salePrice: 'desc' },
    'name-asc': lang === 'en' ? { nameEn: { sort: 'asc' } } : { name: 'asc' },
    bestselling: { soldCount: 'desc' },
  }[sort] || { createdAt: 'desc' };

  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { category: true },
    }),
  ]);

  return NextResponse.json(
    {
      items: items.map((p) => locProduct(p, lang)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    },
    { headers: { 'Cache-Control': CDN_CACHE } }
  );
}

export async function POST(req: NextRequest) {
  // Admin: create new product
  const body = await req.json();
  const required = ['name', 'sku', 'price', 'salePrice'];
  for (const f of required) {
    if (body[f] === undefined) {
      return NextResponse.json({ error: `Missing field: ${f}` }, { status: 400 });
    }
  }
  const slug = body.slug || body.sku;
  try {
    const product = await db.product.create({
      data: {
        slug,
        name: body.name,
        sku: body.sku,
        description: body.description || '',
        metaDescription: body.metaDescription || null,
        price: parseFloat(body.price),
        salePrice: parseFloat(body.salePrice),
        quantity: parseInt(body.quantity) || 20,
        trackStock: !!body.trackStock,
        disableOOS: !!body.disableOOS,
        thumb: body.thumb || null,
        images: body.images || '',
        categoryId: body.categoryId || null,
        isBestSeller: !!body.isBestSeller,
        variations: body.variations || null,
        originalPrice: parseFloat(body.price),
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
