import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { getShippingSettings, saveShippingSettings } from '@/lib/settings';

export async function GET(req: NextRequest) {
  return adminOnly(req, async () => {
    return NextResponse.json(await getShippingSettings());
  });
}

export async function PUT(req: NextRequest) {
  return adminOnly(req, async () => {
    const body = await req.json().catch(() => ({}));
    const next = await saveShippingSettings({
      price: typeof body.price === 'number' ? body.price : undefined,
      freeThreshold: typeof body.freeThreshold === 'number' ? body.freeThreshold : undefined,
      note: typeof body.note === 'string' ? body.note : undefined,
    });
    return NextResponse.json({ ok: true, settings: next });
  });
}

export const dynamic = 'force-dynamic';
