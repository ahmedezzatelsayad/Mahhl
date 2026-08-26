import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const bestSellers = await db.product.findMany({
    where: { isBestSeller: true },
    take: 44,
    orderBy: { salePrice: 'asc' },
    include: { category: true },
  });
  return NextResponse.json(bestSellers);
}
