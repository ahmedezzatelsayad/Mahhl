import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/landing — public landing pages
 *  - ?slug=xxx  → single page (increments views) + its showcase products
 *  - no params  → featured pages list (for footer/menu links)
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');

  if (slug) {
    const page = await db.landingPage.findUnique({
      where: { slug },
    });
    if (!page || !page.isActive) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    // increment views (best-effort)
    db.landingPage
      .update({ where: { id: page.id }, data: { views: { increment: 1 } } })
      .catch(() => {});

    // fetch showcase products
    const ids = Array.isArray(page.productIds) ? (page.productIds as string[]) : [];
    const products = ids.length
      ? await db.product.findMany({
          where: { id: { in: ids.slice(0, 12) } },
          select: {
            id: true,
            slug: true,
            name: true,
            sku: true,
            price: true,
            salePrice: true,
            thumb: true,
            images: true,
            isBestSeller: true,
          },
        })
      : [];

    return NextResponse.json({ page, products });
  }

  const pages = await db.landingPage.findMany({
    where: { isActive: true, isFeatured: true },
    select: { slug: true, title: true, subtitle: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const withBadge = await Promise.all(
    pages.map(async (p) => {
      const full = await db.landingPage.findUnique({
        where: { slug: p.slug },
        select: { content: true },
      });
      const badge = (full?.content as Record<string, unknown>)?.heroBadge || '';
      return { ...p, heroBadge: badge };
    })
  );
  return NextResponse.json(withBadge);
}

export const dynamic = 'force-dynamic';
