import { NextResponse } from 'next/server';
import { getFacebookSettings } from '@/lib/settings';

/**
 * GET /api/settings/facebook — PUBLIC
 * Returns only what the browser needs to boot the pixel.
 * The pixel id is public by design (it ships in every page's HTML).
 */
export async function GET() {
  try {
    const s = await getFacebookSettings();
    return NextResponse.json({
      enabled: s.enabled && !!s.pixelId,
      pixelId: s.enabled ? s.pixelId : '',
    });
  } catch {
    return NextResponse.json({ enabled: false, pixelId: '' });
  }
}
