import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { getFacebookSettings, saveFacebookSettings } from '@/lib/settings';

/**
 * GET /api/admin/facebook — full settings (admin-guarded, includes token)
 */
export async function GET(req: NextRequest) {
  return requirePermission(req, 'facebook', 'view', async () => {
    const s = await getFacebookSettings();
    return NextResponse.json(s);
  });
}

/**
 * PUT /api/admin/facebook — save settings
 * Body: { enabled?, pixelId?, accessToken?, testEventCode? }
 */
export async function PUT(req: NextRequest) {
  return requirePermission(req, 'facebook', 'manage', async () => {
    const body = await req.json().catch(() => ({}));
    const next = await saveFacebookSettings({
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      pixelId: typeof body.pixelId === 'string' ? body.pixelId : undefined,
      accessToken: typeof body.accessToken === 'string' ? body.accessToken : undefined,
      testEventCode: typeof body.testEventCode === 'string' ? body.testEventCode : undefined,
    });
    return NextResponse.json({ ok: true, settings: next });
  });
}

export const dynamic = 'force-dynamic';
