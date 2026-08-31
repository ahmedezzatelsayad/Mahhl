import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import {
  getSiteIdentity,
  saveSiteIdentity,
  clearIdentityCache,
  SiteIdentity,
} from '@/lib/site-identity';

export async function GET(req: NextRequest) {
  return requirePermission(req, 'settings', 'view', async () => {
    const identity = await getSiteIdentity();
    return NextResponse.json(identity);
  });
}

export async function PUT(req: NextRequest) {
  return requirePermission(req, 'settings', 'manage', async () => {
    const body = (await req.json()) as Partial<SiteIdentity>;
    // sanity limits for base64 images (logo 1.5MB, favicon 512KB)
    if (body.logo && body.logo.length > 2_000_000)
      return NextResponse.json({ error: 'حجم اللوجو كبير جداً (الحد 1.5MB)' }, { status: 400 });
    if (body.favicon && body.favicon.length > 700_000)
      return NextResponse.json({ error: 'حجم الأيقونة كبيرة جداً (الحد 512KB)' }, { status: 400 });

    const saved = await saveSiteIdentity(body);
    clearIdentityCache();
    return NextResponse.json(saved);
  });
}
