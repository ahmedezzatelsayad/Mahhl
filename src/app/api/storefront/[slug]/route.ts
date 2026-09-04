/**
 * /api/storefront/[slug] — واجهة عامة لمتجر مسوّق.
 * GET : بيانات المتجر + منتجاته النشطة بأسعاره (يستخدمها مسار /store/[slug]).
 *       يقبل أيضاً ?domain=example.com لدومين المسوّق الخاص.
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadPublicStorefront, storefrontPrice, kwd } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const domain = req.nextUrl.searchParams.get('domain');

  const store = await loadPublicStorefront(
    domain ? { customDomain: domain.toLowerCase() } : { slug: String(slug || '') }
  );
  if (!store) {
    return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 });
  }

  const products = store.products
    .filter((sp) => {
      const p = sp.product;
      if (p.disableOOS && p.quantity <= 0) return false;
      return true;
    })
    .map((sp) => ({
      id: sp.product.id,
      slug: sp.product.slug,
      name: sp.product.name,
      thumb: sp.product.thumb,
      price: storefrontPrice(sp.product, store.defaultMarkup, sp.price),
      oldPrice: kwd(sp.product.price) > storefrontPrice(sp.product, store.defaultMarkup, sp.price)
        ? kwd(sp.product.price)
        : null,
      isBestSeller: sp.product.isBestSeller,
      inStock: !sp.product.trackStock || sp.product.quantity > 0,
      category: sp.product.category?.name || null,
      description: sp.product.description,
    }));

  return NextResponse.json({
    storefront: {
      name: store.name,
      tagline: store.tagline,
      logoUrl: store.logoUrl,
      primaryColor: store.primaryColor,
      whatsapp: store.whatsapp,
      thankYouNote: store.thankYouNote,
    },
    products,
    count: products.length,
  });
}
