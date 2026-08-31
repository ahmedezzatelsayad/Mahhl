import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { getGa4Settings, saveGa4Settings } from '@/lib/settings';

/** GET /api/admin/ga4 — full settings (admin-guarded) */
export async function GET(req: NextRequest) {
  return requirePermission(req, 'facebook', 'view', async () => {
    const s = await getGa4Settings();
    return NextResponse.json(s);
  });
}

/** PUT /api/admin/ga4 — save { enabled?, measurementId? } */
export async function PUT(req: NextRequest) {
  return requirePermission(req, 'facebook', 'manage', async () => {
    const body = await req.json().catch(() => ({}));
    try {
      const next = await saveGa4Settings({
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        measurementId: typeof body.measurementId === 'string' ? body.measurementId : undefined,
      });
      return NextResponse.json({ ok: true, settings: next });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'فشل الحفظ' }, { status: 400 });
    }
  });
}

export const dynamic = 'force-dynamic';
