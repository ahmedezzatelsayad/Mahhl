import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reqLang, locProduct, CDN_CACHE } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const lang = reqLang(req);
  const bestSellers = await db.product.findMany({
    where: { isBestSeller: true },
    take: 44,
    orderBy: { soldCount: 'desc' },
    include: { category: true },
  });
  return NextResponse.json(bestSellers.map((p) => locProduct(p, lang)), {
    headers: { 'Cache-Control': CDN_CACHE },
  });
}
