import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Storefront categories. Empty sections are hidden by default (?all=1 returns
 * everything for the admin views). A parent with zero direct products but with
 * product-carrying children is kept visible.
 */
export async function GET(req: NextRequest) {
  const includeEmpty = new URL(req.url).searchParams.get('all') === '1';

  const categories = await db.category.findMany({
    where: { parentId: null },
    include: {
      children: { include: { _count: { select: { products: true } } } },
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });

  if (includeEmpty) return NextResponse.json(categories);

  const visible = categories.filter((c) => {
    if (c._count.products > 0) return true;
    // keep the parent if any sub-category carries products
    return (c.children || []).some((ch) => ch._count?.products > 0);
  });

  return NextResponse.json(visible);
}
