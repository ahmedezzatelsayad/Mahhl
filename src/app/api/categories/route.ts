import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reqLang, CDN_CACHE } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';

/**
 * Storefront categories. Empty sections are hidden by default (?all=1 returns
 * everything for the admin views). A parent with zero direct products but with
 * product-carrying children is kept visible.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const includeEmpty = url.searchParams.get('all') === '1';
  const lang = reqLang(req);

  const categories = await db.category.findMany({
    where: { parentId: null },
    include: {
      children: { include: { _count: { select: { products: true } } } },
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });

  const loc = (c: (typeof categories)[number]) => ({
    ...c,
    name: lang === 'en' && c.nameEn ? c.nameEn : c.name,
    children: (c.children || []).map((ch) => ({
      ...ch,
      name: lang === 'en' && ch.nameEn ? ch.nameEn : ch.name,
    })),
  });

  if (includeEmpty) {
    return NextResponse.json(categories.map(loc), { headers: { 'Cache-Control': CDN_CACHE } });
  }

  const visible = categories
    .filter((c) => {
      if (c._count.products > 0) return true;
      // keep the parent if any sub-category carries products
      return (c.children || []).some((ch) => ch._count?.products > 0);
    })
    .map(loc);

  return NextResponse.json(visible, { headers: { 'Cache-Control': CDN_CACHE } });
}
