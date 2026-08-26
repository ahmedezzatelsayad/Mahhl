import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/admin/landing — list all landing pages (admin)
 */
export async function GET(req: NextRequest) {
  return adminOnly(req, async () => {
    const pages = await db.landingPage.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        isActive: true,
        isFeatured: true,
        views: true,
        createdAt: true,
        productIds: true,
      },
    });
    return NextResponse.json(pages);
  });
}

/**
 * POST /api/admin/landing — create/update a landing page
 * Body: { id? (update), slug?, title, subtitle, content, productIds?, isFeatured? }
 */
export async function POST(req: NextRequest) {
  return adminOnly(req, async () => {
    const body = await req.json();
    const { id, slug, title, subtitle, content, productIds, heroImage, isFeatured } = body;
    if (!title || !subtitle || !content) {
      return NextResponse.json({ error: 'title, subtitle, content required' }, { status: 400 });
    }

    // slugify (Arabic-safe: keep letters, replace spaces with -)
    const makeSlug = (t: string) =>
      t
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .slice(0, 60) || `landing-${Date.now()}`;

    if (id) {
      const page = await db.landingPage.update({
        where: { id },
        data: {
          title: String(title),
          subtitle: String(subtitle),
          content,
          ...(productIds !== undefined ? { productIds } : {}),
          ...(heroImage !== undefined ? { heroImage } : {}),
          ...(typeof isFeatured === 'boolean' ? { isFeatured } : {}),
        },
      });
      return NextResponse.json({ ok: true, page });
    }

    // ensure unique slug
    let finalSlug = slug ? makeSlug(String(slug)) : makeSlug(String(title));
    const exists = await db.landingPage.findUnique({ where: { slug: finalSlug } });
    if (exists) finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;

    const page = await db.landingPage.create({
      data: {
        slug: finalSlug,
        title: String(title),
        subtitle: String(subtitle),
        content,
        productIds: productIds || [],
        heroImage: heroImage || null,
        isFeatured: !!isFeatured,
      },
    });
    return NextResponse.json({ ok: true, page });
  });
}

/**
 * PUT /api/admin/landing — toggle active/featured or delete
 * Body: { id, action: 'toggle-active' | 'toggle-featured' | 'delete' }
 */
export async function PUT(req: NextRequest) {
  return adminOnly(req, async () => {
    const body = await req.json();
    const { id, action } = body;
    if (!id || !action) return NextResponse.json({ error: 'id + action required' }, { status: 400 });

    if (action === 'delete') {
      await db.landingPage.delete({ where: { id } });
      return NextResponse.json({ ok: true, deleted: true });
    }

    const page = await db.landingPage.findUnique({ where: { id } });
    if (!page) return NextResponse.json({ error: 'not found' }, { status: 404 });

    if (action === 'toggle-active') {
      // Only one active homepage at a time
      if (!page.isActive) {
        await db.landingPage.updateMany({ where: { isActive: true }, data: { isActive: false } });
      }
      const updated = await db.landingPage.update({
        where: { id },
        data: { isActive: !page.isActive },
      });
      return NextResponse.json({ ok: true, page: updated });
    }

    if (action === 'toggle-featured') {
      const updated = await db.landingPage.update({
        where: { id },
        data: { isFeatured: !page.isFeatured },
      });
      return NextResponse.json({ ok: true, page: updated });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  });
}

export const dynamic = 'force-dynamic';
