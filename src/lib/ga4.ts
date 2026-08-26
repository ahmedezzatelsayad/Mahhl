/**
 * ga4.ts
 * ------
 * Client-side Google Analytics 4 (gtag.js) integration.
 * Settings are managed by the founder from the admin panel
 * (SiteSetting key = "ga4") — nothing is hard-coded.
 *
 * All calls are fire-and-forget and fail silently — analytics
 * must never break the shopping experience.
 */

const GA4_SETTINGS_KEY = 'mahhl_ga4_settings';

export interface GA4PublicSettings {
  enabled: boolean;
  measurementId: string;
}

let cached: GA4PublicSettings | null = null;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function setCache(s: GA4PublicSettings) {
  cached = s;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(GA4_SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }
}

/** Fetch public GA4 settings (cached in sessionStorage). */
export async function loadGA4Settings(): Promise<GA4PublicSettings | null> {
  if (cached) return cached;
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(GA4_SETTINGS_KEY);
      if (raw) {
        cached = JSON.parse(raw);
        return cached;
      }
    } catch {
      /* ignore */
    }
  }
  try {
    const res = await fetch('/api/settings/ga4');
    if (!res.ok) return null;
    const data = await res.json();
    const s: GA4PublicSettings = {
      enabled: !!data.enabled,
      measurementId: data.measurementId || '',
    };
    setCache(s);
    return s;
  } catch {
    return null;
  }
}

/** Inject gtag.js once. Safe to call multiple times. */
export function initGA4(measurementId: string) {
  if (typeof window === 'undefined' || !measurementId) return;
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

  if (!w.dataLayer) w.dataLayer = [];
  if (!w.gtag) {
    w.gtag = function (...args: unknown[]) {
      w.dataLayer!.push(args);
    };
    w.gtag('js', new Date());
    const s = document.createElement('script') as HTMLScriptElement;
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(s);
  }
  w.gtag('config', measurementId, { send_page_view: false }); // we fire PageView ourselves
}

let bootstrapped = false;

/**
 * Bootstrap GA4 from server settings (called once from the analytics component).
 * Sends the initial page_view.
 */
export async function bootstrapGA4() {
  if (bootstrapped || typeof window === 'undefined') return;
  bootstrapped = true;
  const s = await loadGA4Settings();
  if (!s?.enabled || !s.measurementId) return;
  initGA4(s.measurementId);
  trackGA4('page_view', {});
}

/**
 * Track a GA4 recommended event.
 * e.g. trackGA4('view_item', { value: 5.5, currency: 'KWD', items: [...] })
 */
export function trackGA4(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  try {
    if (!cached) {
      loadGA4Settings()
        .then((s) => {
          if (s?.enabled && window.gtag) window.gtag('event', eventName, params);
        })
        .catch(() => {});
      return;
    }
    if (!cached.enabled || !cached.measurementId) return;
    if (window.gtag) window.gtag('event', eventName, params);
  } catch {
    /* swallow — never break UX */
  }
}

/** Standard GA4 item shape from cart/product data. */
export function ga4Item(
  item: { sku?: string; name: string; price: number; quantity?: number },
  extra: Record<string, unknown> = {}
) {
  return {
    item_id: item.sku || undefined,
    item_name: item.name,
    ...(item.sku ? {} : {}),
    price: Number(item.price.toFixed(3)),
    quantity: item.quantity ?? 1,
    ...extra,
  };
}
