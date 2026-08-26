import { NextResponse } from 'next/server';
import { getGa4Settings } from '@/lib/settings';

/**
 * GET /api/settings/ga4 — PUBLIC bootstrap settings.
 * Only exposes whether GA4 is on + the measurement ID (both are
 * public by design — they appear in every page's HTML anyway).
 */
export async function GET() {
  const s = await getGa4Settings();
  return NextResponse.json({ enabled: s.enabled, measurementId: s.measurementId });
}

export const dynamic = 'force-dynamic';
