/**
 * /api/storefront/me — متجر المسوّق.
 * GET  : my store + its products (with live pricing preview)
 * POST : create my store (once) or update its settings
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateOnly } from '@/lib/affiliate-auth';
import {
  normalizeSlug, cleanField, normalizeLogoUrl, normalizeCustomDomain,
  storefrontPrice, storefrontProfit, platformPrice, kwd,
} from '@/lib/storefront';

export const dynamic = 'force-dynamic';

async function myStore(affId: string) {
  return db.storefront.findUnique({
    where: { ownerId: affId },
    include: {
      products: {
        orderBy: { addedAt: 'desc' },
        include: {
          product: {
            select: {
              id: true, slug: true, name: true, thumb: true, price: true,
              salePrice: true, quantity: true, commission: true, isBestSeller: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}

export async function GET(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    const store = await myStore(aff.id);
    if (!store) return NextResponse.json({ storefront: null });

    const products = store.products.map((sp) => ({
      id: sp.id,
      productId: sp.productId,
      customPrice: sp.price,
      isActive: sp.isActive,
      addedAt: sp.addedAt,
      name: sp.product.name,
      slug: sp.product.slug,
      thumb: sp.product.thumb,
      category: sp.product.category?.name || null,
      isBestSeller: sp.product.isBestSeller,
      stock: sp.product.quantity,
      platformPrice: kwd(platformPrice(sp.product)),
      storePrice: storefrontPrice(sp.product, store.defaultMarkup, sp.price),
      myProfit: storefrontProfit(sp.product, store.defaultMarkup, sp.price),
    }));

    return NextResponse.json({
      storefront: {
        id: store.id,
        slug: store.slug,
        name: store.name,
        tagline: store.tagline,
        logoUrl: store.logoUrl,
        primaryColor: store.primaryColor,
        whatsapp: store.whatsapp,
        customDomain: store.customDomain,
        defaultMarkup: store.defaultMarkup,
        thankYouNote: store.thankYouNote,
        isActive: store.isActive,
        createdAt: store.createdAt,
      },
      products,
      count: products.length,
    });
  });
}

export async function POST(req: NextRequest) {
  return affiliateOnly(req, async (aff) => {
    if (aff.status !== 'active') {
      return NextResponse.json({ error: 'حسابك قيد المراجعة — كلم الإدارة لتفعيل متجرك' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const existing = await db.storefront.findUnique({ where: { ownerId: aff.id } });

    // ---- validate fields (all optional on update; required on create) ----
    let slug = existing?.slug;
    if (body.slug !== undefined && body.slug !== existing?.slug) {
      const s = normalizeSlug(body.slug);
      if (!s) {
        return NextResponse.json(
          { error: 'المعرف غير صالح: 3–30 حرف إنجليزي صغير/أرقام/شرطات، وممنوع الكلمات المحجوزة' },
          { status: 400 }
        );
      }
      const taken = await db.storefront.findUnique({ where: { slug: s } });
      if (taken) {
        return NextResponse.json({ error: `المعرف «${s}» محجوز — جرّب معرف ثاني` }, { status: 409 });
      }
      slug = s;
    }

    const name = body.name !== undefined ? cleanField(body.name, 60) : existing?.name;
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'اكتب اسم المتجر (حرفين على الأقل)' }, { status: 400 });
    }

    const data: any = {
      name,
      tagline: body.tagline !== undefined ? cleanField(body.tagline, 120) || null : undefined,
      logoUrl: body.logoUrl !== undefined ? normalizeLogoUrl(body.logoUrl) : undefined,
      primaryColor:
        body.primaryColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(String(body.primaryColor))
          ? String(body.primaryColor)
          : undefined,
      whatsapp: body.whatsapp !== undefined ? cleanField(body.whatsapp, 20) || null : undefined,
      customDomain:
        body.customDomain !== undefined ? normalizeCustomDomain(body.customDomain) : undefined,
      thankYouNote: body.thankYouNote !== undefined ? cleanField(body.thankYouNote, 300) || null : undefined,
      defaultMarkup:
        body.defaultMarkup !== undefined
          ? Math.min(50, Math.max(0.1, Number(body.defaultMarkup) || 2))
          : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    };

    if (!existing) {
      if (!slug) {
        return NextResponse.json({ error: 'اختر معرف المتجر (يظهر في رابط متجرك)' }, { status: 400 });
      }
      const created = await db.storefront.create({
        data: { ...data, ownerId: aff.id, slug },
      });
      return NextResponse.json({ ok: true, storefront: created, created: true });
    }

    // تغيير المعرف مسموح (من الاسم للدومين كل شيء قابل للتعديل) —
    // الرابط القديم يتوقف والجديد هو المتاح
    if (slug && slug !== existing.slug) data.slug = slug;
    const updated = await db.storefront.update({ where: { id: existing.id }, data });
    return NextResponse.json({ ok: true, storefront: updated, created: false });
  });
}
