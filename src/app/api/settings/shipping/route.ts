import { NextResponse } from 'next/server';
import { getShippingSettings } from '@/lib/settings';

/** GET /api/settings/shipping — public, used by checkout */
export async function GET() {
  try {
    const s = await getShippingSettings();
    return NextResponse.json(s);
  } catch {
    return NextResponse.json({ price: 2, freeThreshold: 50, note: '' });
  }
}
