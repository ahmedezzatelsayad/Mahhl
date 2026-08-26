import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { getSeoSettings, saveSeoSettings } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return adminOnly(req, async () => {
    return NextResponse.json(await getSeoSettings());
  });
}

export async function PUT(req: NextRequest) {
  return adminOnly(req, async () => {
    const body = await req.json().catch(() => ({}));
    const next = await saveSeoSettings({
      siteTitle: typeof body.siteTitle === 'string' ? body.siteTitle : undefined,
      titleTemplate: typeof body.titleTemplate === 'string' ? body.titleTemplate : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      keywords: typeof body.keywords === 'string' ? body.keywords : undefined,
      siteUrl: typeof body.siteUrl === 'string' ? body.siteUrl : undefined,
      googleVerification: typeof body.googleVerification === 'string' ? body.googleVerification : undefined,
      bingVerification: typeof body.bingVerification === 'string' ? body.bingVerification : undefined,
    });
    return NextResponse.json({ ok: true, settings: next });
  });
}
