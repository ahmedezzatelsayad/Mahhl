import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  // Top-level categories with product counts
  const categories = await db.category.findMany({
    where: { parentId: null },
    include: {
      children: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(categories);
}
