import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Public product-reviews API.
 * GET  /api/reviews?slug=<productSlug>  → approved reviews + rating summary
 * POST /api/reviews                      → submit a review (moderated)
 *
 * Global best practice (Kissmetrics / Baymard): products with reviews convert
 * up to 270% better and 92% of buyers hesitate when reviews are missing.
 */

// ---- light in-memory rate limit (per IP) — 5 submissions / hour ----
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();
function allowRateLimit(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (list.length >= RATE_LIMIT_MAX) {
    hits.set(ip, list);
    return false;
  }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // safety valve
  return true;
}

// ---- 60s summary cache (keyed by slug+page) ----
const PAGE_SIZE = 7; // Amazon-style: 7 reviews per numbered page
const cache = new Map<string, Summary>();
const CACHE_TTL = 60_000;

function normalizeKwPhone(raw: string): string {
  const digits = (raw || '').replace(/[^\d]/g, '');
  // strip leading 965 country code
  return digits.startsWith('965') ? digits.slice(3) : digits;
}

type Summary = {
  count: number;
  average: number;
  distribution: { '5': number; '4': number; '3': number; '2': number; '1': number };
  reviews: unknown[];
  soldCount?: number;
  page?: number;
  pages?: number;
  cachedAt: number;
};

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim();
  if (!slug) return NextResponse.json({ error: 'slug مطلوب' }, { status: 400 });
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1);
  const cacheKey = `${slug}#${page}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return NextResponse.json(cached, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const product = await db.product.findUnique({
      where: { slug },
      select: { id: true, soldCount: true },
    });
    if (!product) return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });

    const [reviews, agg, soldAgg, countAgg] = await Promise.all([
      db.review.findMany({
        where: { productId: product.id, isApproved: true },
        orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          customerName: true,
          rating: true,
          title: true,
          comment: true,
          isVerified: true,
          helpfulCount: true,
          createdAt: true,
        },
      }),
      db.review.groupBy({
        by: ['rating'],
        where: { productId: product.id, isApproved: true },
        _count: { _all: true },
      }),
      // honest social proof: real units ordered (non-cancelled)
      db.orderItem.aggregate({
        where: { productId: product.id, order: { status: { notIn: ['cancelled', 'pending_payment'] } } },
        _sum: { quantity: true },
      }),
      db.review.count({ where: { productId: product.id, isApproved: true } }),
    ]);
    const realSold = soldAgg._sum.quantity || 0;
    // display counter = founder baseline (soldCount) + real orders, at least real orders
    const displaySold = Math.max(realSold, product.soldCount + realSold);

    const dist = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 } as Summary['distribution'];
    let count = 0;
    let total = 0;
    for (const row of agg) {
      const n = row._count._all;
      const key = String(row.rating) as keyof typeof dist;
      if (key in dist) dist[key] = n;
      count += n;
      total += row.rating * n;
    }

    const summary: Summary = {
      count,
      average: count ? Math.round((total / count) * 10) / 10 : 0,
      distribution: dist,
      reviews,
      soldCount: displaySold,
      page,
      pages: Math.max(1, Math.ceil(countAgg / PAGE_SIZE)),
      cachedAt: Date.now(),
    };
    cache.set(cacheKey, summary);
    // keep the cache small
    if (cache.size > 600) {
      for (const k of cache.keys()) {
        if (cache.size <= 600) break;
        cache.delete(k);
      }
    }
    return NextResponse.json(summary, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { count: 0, average: 0, distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }, reviews: [], soldCount: 0, page: 1, pages: 1 },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!allowRateLimit(ip)) {
    return NextResponse.json(
      { error: 'أرسلت تقييمات كثيرة، جرب بعد ساعة' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 });
  }

  const slug = String(body.slug || '').trim();
  const customerName = String(body.customerName || '').trim();
  const rating = Math.round(Number(body.rating));
  const title = String(body.title || '').trim().slice(0, 120);
  const comment = String(body.comment || '').trim().slice(0, 1000);
  const phone = normalizeKwPhone(String(body.phone || ''));

  if (!slug) return NextResponse.json({ error: 'المنتج مطلوب' }, { status: 400 });
  if (customerName.length < 2 || customerName.length > 60) {
    return NextResponse.json({ error: 'الاسم يجب أن يكون بين 2 و 60 حرف' }, { status: 400 });
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'التقييم يجب أن يكون من 1 إلى 5 نجوم' }, { status: 400 });
  }
  if (!comment && !title) {
    return NextResponse.json({ error: 'اكتب رأيك أو عنواناً مختصراً' }, { status: 400 });
  }

  try {
    const product = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });

    // Verified purchase: real, non-cancelled order containing this product
    // with a matching phone number → review publishes instantly.
    let isVerified = false;
    if (phone.length >= 8) {
      const orderCount = await db.orderItem.count({
        where: {
          productId: product.id,
          order: {
            phone: { contains: phone.slice(-8) },
            status: { notIn: ['cancelled', 'pending_payment'] },
          },
        },
      });
      isVerified = orderCount > 0;
    }

    // duplicate guard: same product + same comment opening in last 30 days
    if (comment.length >= 10) {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dup = await db.review.count({
        where: {
          productId: product.id,
          comment: { contains: comment.slice(0, 40) },
          createdAt: { gte: since },
        },
      });
      if (dup > 0) {
        return NextResponse.json({ error: 'تم استلام تقييم مشابه لهذا المنتج' }, { status: 409 });
      }
    }

    const review = await db.review.create({
      data: {
        productId: product.id,
        customerName,
        rating,
        title: title || null,
        comment: comment || null,
        // verified buyers publish instantly; others await founder approval
        isApproved: isVerified,
        isVerified,
      },
      select: { id: true, isApproved: true },
    });

    // invalidates every cached page for this product
    for (const k of cache.keys()) if (k.startsWith(`${slug}#`)) cache.delete(k);
    return NextResponse.json({
      ok: true,
      isApproved: review.isApproved,
      message: review.isApproved
        ? 'شكراً! تقييمك نُشر الآن (مشترٍ موثّق ✓)'
        : 'شكراً! تقييمك وصل وسيراجعه فريقنا قبل النشر',
    });
  } catch {
    return NextResponse.json({ error: 'تعذر حفظ التقييم، جرب مرة أخرى' }, { status: 500 });
  }
}
