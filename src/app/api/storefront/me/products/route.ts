/**
 * /api/storefront/me/products — إدارة منتجات متجري.
 * POST   : أضف منتج/منتجات من كتالوج المنصة بنقرة واحدة (productIds[])
 * PATCH  : عدّل سعر منتج في متجري أو فعّل/عطّل
 * DELETE : شيل منتج من متجري (?id= أو ?ids=a,b,c)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateOnly } from '@/lib/affiliate-auth';
import { cleanField, storefrontPrice, storefrontProfit, platformPrice, kwd } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

const MAX_PRODUCTS_PER_STORE = 500;

async function myStore(affId: string) {
  return db.storefront.findUnique({ where: { ownerId: affId } });
}

export async function POST(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    const store = await myStore(aff.id);
    if (!store) {
      return NextResponse.json({ error: 'افتح متجرك أولاً من تبويب «متجري»' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.productIds)
      ? body.productIds.filter((x: unknown) => typeof x === 'string').slice(0, 100)
      : typeof body.productId === 'string'
        ? [body.productId]
        : [];
    if (!ids.length) return NextResponse.json({ error: 'ما في منتجات مضافة' }, { status: 400 });

    const count = await db.storefrontProduct.count({ where: { storefrontId: store.id } });
    if (count + ids.length > MAX_PRODUCTS_PER_STORE) {
      return NextResponse.json(
        { error: `الحد الأقصى ${MAX_PRODUCTS_PER_STORE} منتج للمتجر` },
        { status: 400 }
      );
    }

    // فقط منتجات موجودة فعلاً في كتالوج المنصة
    const products = await db.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, price: true, salePrice: true },
    });
    if (!products.length) {
      return NextResponse.json({ error: 'المنتجات غير موجودة' }, { status: 404 });
    }

    let added = 0;
    for (const p of products) {
      const exists = await db.storefrontProduct.findUnique({
        where: { storefrontId_productId: { storefrontId: store.id, productId: p.id } },
      });
      if (exists) {
        if (!exists.isActive) {
          await db.storefrontProduct.update({ where: { id: exists.id }, data: { isActive: true } });
          added++;
        }
        continue;
      }
      await db.storefrontProduct.create({
        data: { storefrontId: store.id, productId: p.id },
      });
      added++;
    }

    return NextResponse.json({ ok: true, added, skipped: ids.length - added });
  });
}

export async function PATCH(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    const store = await myStore(aff.id);
    if (!store) return NextResponse.json({ error: 'ما عندك متجر' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const id = cleanField(body.id, 40);
    if (!id) return NextResponse.json({ error: 'معرف المنتج مطلوب' }, { status: 400 });

    const sp = await db.storefrontProduct.findFirst({
      where: { id, storefrontId: store.id },
      include: { product: { select: { price: true, salePrice: true } } },
    });
    if (!sp) return NextResponse.json({ error: 'المنتج مش في متجرك' }, { status: 404 });

    const data: any = {};
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.price !== undefined) {
      if (body.price === null || body.price === '') {
        data.price = null; // رجّع للتسعير الافتراضي
      } else {
        const v = Number(body.price);
        const base = platformPrice(sp.product);
        if (!Number.isFinite(v) || v < base) {
          return NextResponse.json(
            { error: `السعر لازم يكون ${base} د.ك أو أكثر (ما تبيع تحت سعر المنصة)` },
            { status: 400 }
          );
        }
        if (v > 5000) {
          return NextResponse.json({ error: 'السعر كبير جداً' }, { status: 400 });
        }
        data.price = kwd(v);
      }
    }

    const updated = await db.storefrontProduct.update({ where: { id: sp.id }, data });
    return NextResponse.json({
      ok: true,
      product: {
        id: updated.id,
        price: updated.price,
        isActive: updated.isActive,
        storePrice: storefrontPrice(sp.product, store.defaultMarkup, updated.price),
        myProfit: storefrontProfit(sp.product, store.defaultMarkup, updated.price),
      },
    });
  });
}

export async function DELETE(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    const store = await myStore(aff.id);
    if (!store) return NextResponse.json({ error: 'ما عندك متجر' }, { status: 400 });

    const sp = req.nextUrl.searchParams;
    const one = cleanField(sp.get('id'), 40);
    const many = (sp.get('ids') || '')
      .split(',')
      .map((x) => cleanField(x, 40))
      .filter(Boolean)
      .slice(0, 100);
    const ids = one ? [one] : many;
    if (!ids.length) return NextResponse.json({ error: 'حدد منتج للحذف' }, { status: 400 });

    const res = await db.storefrontProduct.deleteMany({
      where: { storefrontId: store.id, id: { in: ids } },
    });
    return NextResponse.json({ ok: true, removed: res.count });
  });
}
