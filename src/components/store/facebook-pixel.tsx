'use client';

/**
 * FacebookPixel — boots the Meta Pixel once per page load.
 * Fetches the public config (pixel id) from /api/settings/facebook,
 * injects the base code, and fires the initial PageView event.
 * Renders nothing. Fails silently when disabled or blocked.
 */
import { useEffect } from 'react';
import { initFacebookPixel, loadFBSettings, trackFB } from '@/lib/facebook-pixel';

export function FacebookPixel() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const settings = await loadFBSettings();
      if (cancelled || !settings?.enabled || !settings.pixelId) return;
      initFacebookPixel(settings.pixelId);
      // Initial PageView — browser pixel + Conversions API (deduped)
      await trackFB('PageView');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
