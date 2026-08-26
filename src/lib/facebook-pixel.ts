/**
 * facebook-pixel.ts
 * -----------------
 * Client-side Facebook Pixel (Meta Pixel) integration.
 *
 * Dual-path tracking with event-ID deduplication:
 *  1) Browser Pixel  -> window.fbq('track', event, params, { eventID })
 *  2) Conversions API-> POST /api/track/facebook (server forwards to Meta)
 *
 * Meta deduplicates automatically when both share the same event_id.
 * All calls are fire-and-forget and fail silently — tracking must never
 * break the shopping experience.
 */

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

const FB_SETTINGS_KEY = 'mahhl_fb_settings';

/** Cached public settings so views can check status without refetching. */
export interface FBPublicSettings {
  enabled: boolean;
  pixelId: string;
}

let cachedSettings: FBPublicSettings | null = null;

export function getFBCachedSettings(): FBPublicSettings | null {
  if (cachedSettings) return cachedSettings;
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(FB_SETTINGS_KEY);
      if (raw) cachedSettings = JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  return cachedSettings;
}

function setCachedSettings(s: FBPublicSettings) {
  cachedSettings = s;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(FB_SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }
}

/** Fetch public Facebook settings from our API (cached in sessionStorage). */
export async function loadFBSettings(): Promise<FBPublicSettings | null> {
  if (cachedSettings) return cachedSettings;
  try {
    const res = await fetch('/api/settings/facebook');
    if (!res.ok) return null;
    const data = await res.json();
    const s: FBPublicSettings = { enabled: !!data.enabled, pixelId: data.pixelId || '' };
    setCachedSettings(s);
    return s;
  } catch {
    return null;
  }
}

/** Inject the Meta Pixel base code once. Safe to call multiple times. */
export function initFacebookPixel(pixelId: string) {
  if (typeof window === 'undefined' || !pixelId) return;

  if (window.fbq) {
    window.fbq('init', pixelId);
    return;
  }

  // Official Meta Pixel base stub (window.fbq queue until fbevents.js loads)
  /* eslint-disable */
  const n: any = (window as any).fbq = function (...args: any[]) {
    n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
  };
  if (!(window as any)._fbq) (window as any)._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  /* eslint-enable */

  const s = document.createElement('script') as HTMLScriptElement;
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);

  window.fbq?.('init', pixelId);
}

/** Read the Meta cookies for Conversions API user matching. */
function getFbCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === 'undefined') return {};
  const read = (name: string) =>
    document.cookie
      .split('; ')
      .find((c) => c.startsWith(name + '='))
      ?.split('=')[1];
  const fbp = read('_fbp');
  const fbc = read('_fbc');
  return { ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}) };
}

export interface FBEventParams {
  value?: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: { id: string; quantity: number; item_price?: number }[];
  num_items?: number;
  search_string?: string;
  order_id?: string;
  [key: string]: unknown;
}

/** Stable per-event id for browser/CAPI deduplication. */
function makeEventId(eventName: string): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${eventName.toLowerCase()}_${Date.now()}_${rnd}`;
}

/**
 * Track a Meta standard event.
 * Fires BOTH the browser pixel and (in parallel) the server-side
 * Conversions API forwarder. Completely silent on failure.
 *
 * `extra` holds PII (e.g. phone) that only the server path may see.
 */
export async function trackFB(
  eventName:
    | 'PageView'
    | 'ViewContent'
    | 'AddToCart'
    | 'InitiateCheckout'
    | 'AddPaymentInfo'
    | 'Purchase'
    | 'Search',
  params: FBEventParams = {},
  extra: { phone?: string } = {}
) {
  if (typeof window === 'undefined') return;
  try {
    const settings = getFBCachedSettings();
    if (!settings?.enabled || !settings.pixelId) return;

    const eventId = makeEventId(eventName);

    // 1) Browser pixel (dedup key = eventID)
    window.fbq?.('track', eventName, params, { eventID: eventId });

    // 2) Conversions API (server -> Meta, same event_id => dedup)
    const body = {
      eventName,
      eventId,
      eventData: params,
      ...getFbCookies(),
      ...(extra.phone ? { phone: extra.phone } : {}),
    };
    fetch('/api/track/facebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* swallow — never break UX */
  }
}
