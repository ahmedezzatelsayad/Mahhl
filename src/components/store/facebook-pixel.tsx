'use client';

/**
 * Analytics — boots Meta Pixel + Google Analytics 4 once per page load.
 * Fetches public configs from /api/settings/facebook and /api/settings/ga4,
 * injects the base code, and fires the initial page_view for both.
 * Renders nothing. Fails silently when disabled or blocked.
 */
import { useEffect } from 'react';
import { initFacebookPixel, loadFBSettings, trackFB } from '@/lib/facebook-pixel';
import { bootstrapGA4 } from '@/lib/ga4';

export function FacebookPixel() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) Meta Pixel — browser + Conversions API (deduped by event_id)
      const settings = await loadFBSettings();
      if (!cancelled && settings?.enabled && settings.pixelId) {
        initFacebookPixel(settings.pixelId);
        await trackFB('PageView');
      }
      // 2) Google Analytics 4 — gtag.js + initial page_view
      if (!cancelled) await bootstrapGA4();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
