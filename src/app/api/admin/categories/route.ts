import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
  return requirePermission(req, 'categories', 'view', async () => {
  const categories = await db.category.findMany({
    include: {
      _count: { select: { products: true } },
      children: { include: { _count: { select: { products: true } } } },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(categories);
  });
}

export async function POST(req: NextRequest) {
  return requirePermission(req, 'categories', 'manage', async () => {
  const body = await req.json();
  const { name, parentId } = body;
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  const slug = (name as string)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '') || `cat-${Date.now()}`;
  try {
    const category = await db.category.create({
      data: {
        name,
        slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
        parentId: parentId || null,
        isSub: !!parentId,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  });
}
