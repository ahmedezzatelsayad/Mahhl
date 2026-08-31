import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import {
  getSliderSettings,
  saveSliderSettings,
  resetSliderSettings,
  clearSliderCache,
  MAX_SLIDES,
} from '@/lib/slider-settings';

/** GET — full managed set (active + inactive) for the dashboard */
export async function GET(req: NextRequest) {
  return requirePermission(req, 'slider', 'view', async () => {
    const settings = await getSliderSettings();
    return NextResponse.json(settings);
  });
}

/** PUT — save the whole set (slides + autoplay + landing-promo toggle) */
export async function PUT(req: NextRequest) {
  return requirePermission(req, 'slider', 'manage', async () => {
    const body = await req.json().catch(() => ({}));
    try {
      const saved = await saveSliderSettings(body);
      clearSliderCache();
      return NextResponse.json(saved);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'فشل حفظ السلايدر' },
        { status: 400 }
      );
    }
  });
}

/** DELETE — reset to the curated defaults (real photos included) */
export async function DELETE(req: NextRequest) {
  return requirePermission(req, 'slider', 'manage', async () => {
    const defaults = await resetSliderSettings();
    clearSliderCache();
    return NextResponse.json({ ...defaults, reset: true, max: MAX_SLIDES });
  });
}
