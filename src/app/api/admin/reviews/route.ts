import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Founder moderation panel for product reviews.
 * GET   /api/admin/reviews?status=pending|approved|all&search=...
 * PATCH /api/admin/reviews   { id, action: 'approve' | 'reject' | 'verify' }
 * DELETE /api/admin/reviews?id=...
 */

export async function GET(req: NextRequest) {
  return requirePermission(req, 'reviews', 'view', async () => {
    const status = req.nextUrl.searchParams.get('status') || 'pending';
    const search = req.nextUrl.searchParams.get('search')?.trim() || '';

    const where: Record<string, unknown> = {};
    if (status === 'pending') where.isApproved = false;
    else if (status === 'approved') where.isApproved = true;
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { comment: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [reviews, pendingCount, approvedCount, verifiedCount] = await Promise.all([
      db.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          customerName: true,
          rating: true,
          title: true,
          comment: true,
          isVerified: true,
          isApproved: true,
          helpfulCount: true,
          createdAt: true,
          product: { select: { name: true, slug: true, thumb: true } },
        },
      }),
      db.review.count({ where: { isApproved: false } }),
      db.review.count({ where: { isApproved: true } }),
      db.review.count({ where: { isVerified: true } }),
    ]);

    return NextResponse.json({
      reviews,
      stats: { pending: pendingCount, approved: approvedCount, verified: verifiedCount },
    });
  });
}

export async function PATCH(req: NextRequest) {
  return requirePermission(req, 'reviews', 'manage', async () => {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || '');
    const action = String(body.action || '');
    if (!id || !['approve', 'reject', 'verify'].includes(action)) {
      return NextResponse.json({ error: 'id و action صحيحان مطلوبان' }, { status: 400 });
    }

    const data =
      action === 'approve'
        ? { isApproved: true }
        : action === 'reject'
          ? { isApproved: false }
          : { isVerified: true, isApproved: true };

    const updated = await db.review.update({
      where: { id },
      data,
      select: { id: true, isApproved: true, isVerified: true },
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: NextRequest) {
  return requirePermission(req, 'reviews', 'manage', async () => {
    const id = req.nextUrl.searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });
    await db.review.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
