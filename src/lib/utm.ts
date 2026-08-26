/**
 * utm.ts
 * ------
 * Ad-traffic attribution for orders (Meta/Google ads readiness).
 *
 * On the first landing of a session we persist utm_* params +
 * landing path in localStorage (30-day window). When an order is
 * placed, checkout attaches them so the founder can answer:
 * "which ad/campaign brought this order?"
 */

const UTM_KEY = 'mahhl_utm';
const LANDING_KEY = 'mahhl_landing_path';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface UtmData {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  landingPath: string;
}

const UTM_PARAMS: { key: keyof UtmData; query: string }[] = [
  { key: 'utmSource', query: 'utm_source' },
  { key: 'utmMedium', query: 'utm_medium' },
  { key: 'utmCampaign', query: 'utm_campaign' },
  { key: 'utmTerm', query: 'utm_term' },
  { key: 'utmContent', query: 'utm_content' },
];

/** Call once on app mount — captures ?utm_* and the landing path. */
export function captureUtm() {
  if (typeof window === 'undefined') return;

  // Always remember the first landing path of the attribution window
  try {
    if (!localStorage.getItem(LANDING_KEY)) {
      localStorage.setItem(
        LANDING_KEY,
        JSON.stringify({ path: location.pathname + location.search, at: Date.now() })
      );
    }
  } catch {
    /* ignore */
  }

  try {
    const params = new URLSearchParams(location.search);
    const hasUtm = UTM_PARAMS.some(({ query }) => params.get(query));
    if (!hasUtm) return;

    const prev = readUtmRaw();
    const data: UtmData & { at: number } = {
      utmSource: clean(params.get('utm_source')),
      utmMedium: clean(params.get('utm_medium')),
      utmCampaign: clean(params.get('utm_campaign')),
      utmTerm: clean(params.get('utm_term')),
      utmContent: clean(params.get('utm_content')),
      landingPath: (location.pathname + location.search).slice(0, 300),
      at: Date.now(),
    };

    // Never overwrite existing attribution mid-window (first-touch wins)
    if (prev && Date.now() - prev.at < MAX_AGE_MS && prev.utmSource) return;
    localStorage.setItem(UTM_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function clean(v: string | null): string {
  return (v || '').replace(/[^\w\-.\u0600-\u06FF+ ]/g, '').slice(0, 120);
}

function readUtmRaw(): (UtmData & { at: number }) | null {
  try {
    const raw = localStorage.getItem(UTM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - (parsed.at || 0) > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Attach to POST /api/orders body — server stores it on the order. */
export function getUtmForOrder(): Partial<UtmData> {
  const data = readUtmRaw();
  if (!data) return {};
  const out: Partial<UtmData> = {};
  if (data.utmSource) out.utmSource = data.utmSource;
  if (data.utmMedium) out.utmMedium = data.utmMedium;
  if (data.utmCampaign) out.utmCampaign = data.utmCampaign;
  if (data.utmTerm) out.utmTerm = data.utmTerm;
  if (data.utmContent) out.utmContent = data.utmContent;
  if (data.landingPath) out.landingPath = data.landingPath.slice(0, 300);
  return out;
}
