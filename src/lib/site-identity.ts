import { db } from '@/lib/db';

/**
 * Site identity — runtime-editable branding (no redeploy needed).
 * Stored in SiteSetting key "site_identity":
 * { siteName, tagline, announcement, whatsapp, logo, favicon, categoryImages }
 */

export interface SiteIdentity {
  siteName: string;
  tagline: string;
  announcement: string;
  /** Kuwait number without +, e.g. "66046358" (display adds +965) */
  whatsapp: string;
  /** base64 data-URL of the uploaded logo */
  logo: string;
  /** base64 data-URL of the browser icon */
  favicon: string;
  /** slug -> image URL map for category tiles */
  categoryImages: Record<string, string>;
}

export const DEFAULT_IDENTITY: SiteIdentity = {
  siteName: 'محل شوب',
  tagline: 'منصة دروب شيبنج رقم 1 في الكويت',
  announcement: 'منصة دروب شيبنج رقم 1 في الكويت 🇰🇼 — عمولات مقترحة من 1 إلى 10 د.ك على كل منتج، وإنت تختار عمولتك',
  whatsapp: '66046358',
  logo: '',
  favicon: '',
  categoryImages: {},
};

const KEY = 'site_identity';

export async function getSiteIdentity(): Promise<SiteIdentity> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: KEY } });
    if (!row) return DEFAULT_IDENTITY;
    const v = row.value as Partial<SiteIdentity>;
    const merged = { ...DEFAULT_IDENTITY, ...v };
    // ترقية الهوية: الصفوف المحفوظة بالقيم الافتراضية القديمة تتحدّث تلقائياً
    // لهوية «منصة دروب شيبنج» بدون فقدان أي تخصيص آخر من الإدارة
    if (merged.tagline === 'متجرك الكويتي الذكي') merged.tagline = DEFAULT_IDENTITY.tagline;
    if (merged.announcement === 'توصيل لجميع محافظات الكويت — دفع عند الاستلام')
      merged.announcement = DEFAULT_IDENTITY.announcement;
    return merged;
  } catch {
    return DEFAULT_IDENTITY;
  }
}

export async function saveSiteIdentity(
  patch: Partial<SiteIdentity>
): Promise<SiteIdentity> {
  const current = await getSiteIdentity();
  const next: SiteIdentity = { ...current, ...patch };
  await db.siteSetting.upsert({
    where: { key: KEY },
    update: { value: next as any },
    create: { key: KEY, value: next as any },
  });
  return next;
}

/** in-memory cache (60s) so the layout/favicon doesn't hit Neon on every render */
let cache: { at: number; data: SiteIdentity } | null = null;
export async function getSiteIdentityCached(): Promise<SiteIdentity> {
  if (cache && Date.now() - cache.at < 60_000) return cache.data;
  const data = await getSiteIdentity();
  cache = { at: Date.now(), data };
  return data;
}
export function clearIdentityCache() {
  cache = null;
}

/** Build a wa.me link from the configured Kuwait number */
export function waLink(identity: SiteIdentity, text?: string): string {
  const num = identity.whatsapp.replace(/\D/g, '');
  const withCC = num.startsWith('965') ? num : `965${num}`;
  const t = text ? `?type=phone_number&app_absent=0&text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${withCC}${t}`;
}
