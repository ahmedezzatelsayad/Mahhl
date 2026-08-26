import { NextResponse } from 'next/server';
import { getSliderSettings } from '@/lib/slider-settings';

/**
 * Public slider bootstrap — active slides only, ordered as saved.
 * Reads straight from the DB (no in-memory cache) so founder saves are
 * reflected immediately; the CDN (s-maxage=60) handles scale instead.
 */
export async function GET() {
  const settings = await getSliderSettings();
  return NextResponse.json(
    {
      slides: settings.slides.filter((s) => s.active),
      autoplayMs: settings.autoplayMs,
      appendLandingPromos: settings.appendLandingPromos,
    },
    { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=60' } }
  );
}

export const dynamic = 'force-dynamic';
