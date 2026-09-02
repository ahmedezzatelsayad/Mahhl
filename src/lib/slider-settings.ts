import { db } from '@/lib/db';
import type {
  SlideAction,
  SliderCta,
  SliderSlide,
  SliderSettings,
} from '@/lib/slider-types';

export type { SlideAction, SliderCta, SliderSlide, SliderSettings };

/**
 * Hero slider — founder-managed, real-photo slides (bilingual AR/EN).
 *
 * Stored in SiteSetting key "hero_slider" (JSON):
 *   { slides: SliderSlide[], autoplayMs: number, appendLandingPromos: boolean }
 *
 * The founder controls everything from لوحة التحكم → السلايدر:
 *   - add / edit / delete / reorder / activate slides
 *   - background: real photo (URL, data-URL upload, or a product's own image)
 *   - AI writes the copy per-product (Arabic + English), or builds a whole
 *     dynamic product slider
 */

const KEY = 'hero_slider';

export const MAX_SLIDES = 8;
export const MIN_AUTOPLAY_MS = 3000;
export const MAX_AUTOPLAY_MS = 12000;

/** Royalty-free photos (re-hosted on a stable CDN) — replaced anytime from the dashboard */
const IMG_SHOPPING =
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/8e1b4322cfe2.jpg';
const IMG_KITCHEN =
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/2b32eb48780b.png';
const IMG_TECH =
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/7e5ca7099b59.jpg';

/**
 * Defaults shown until the founder saves his own set (and after a reset).
 * Copy follows the honesty policy: real, verifiable store facts only.
 */
export const DEFAULT_SLIDER: SliderSettings = {
  autoplayMs: 5200,
  appendLandingPromos: true,
  slides: [
    {
      id: 'brand',
      eyebrow: '🇰🇼 منصة دروب شيبنج رقم 1 في الكويت',
      title: 'سوّق واربح،',
      highlight: 'عمولة 1–2 د.ك على كل طلب',
      subtitle:
        'سجّل مجاناً كمُسوّق، شارك أكثر من 2,600 منتج برابطك الخاص، وإحنا نتكفل بالتخزين والشحن والتحصيل — عمولتك تتحسب تلقائياً على كل طلب يوصَل. ولتسوق: دفع عند الاستلام وتوصيل سريع لكل المحافظات.',
      eyebrowEn: '🇰🇼 Kuwait’s #1 Dropshipping Platform',
      titleEn: 'Market & Earn —',
      highlightEn: '1–2 KWD commission per order',
      subtitleEn:
        'Register free as a marketer, share 2,600+ products with your own link, and we handle storage, shipping and collection — your commission is calculated automatically on every delivered order. Shopping: cash on delivery and fast delivery everywhere in Kuwait.',
      image: IMG_SHOPPING,
      tone: 'dark',
      chips: ['عمولة 1–2 د.ك', 'تسجيل مجاني', 'بدون رأس مال', 'COD'],
      chipsEn: ['1–2 KWD commission', 'Free registration', 'Zero capital', 'COD'],
      cta: { label: 'سوّق معنا واربح', action: 'affiliate-login', labelEn: 'Sell With Us & Earn' },
      ctaSecondary: { label: 'تسوق المنتجات', action: 'shop', labelEn: 'Shop Products' },
      active: true,
    },
    {
      id: 'kitchen',
      eyebrow: '🍳 أدوات المطبخ والأجهزة المنزلية',
      title: 'مطبخك عنده مقيم؟',
      highlight: 'جهّزه بأقل الأسعار',
      subtitle:
        'خلاطات، محضّرات قهوة، أدوات طبخ وتنظيم — اختيارات عملية توفر وقتك ومجهودك كل يوم، بأسعار تبدأ من دنانير قليلة.',
      eyebrowEn: '🍳 Kitchen tools & home appliances',
      titleEn: 'Is your kitchen due',
      highlightEn: 'for an upgrade?',
      subtitleEn:
        'Blenders, coffee makers, cooking and organization tools — practical picks that save you time and effort every day, at prices starting from just a few dinars.',
      image: IMG_KITCHEN,
      tone: 'gold',
      chips: ['أجهزة عملية', 'أسعار تنافسية', 'توصيل لباب البيت'],
      chipsEn: ['Practical appliances', 'Competitive prices', 'Doorstep delivery'],
      cta: { label: 'اكتشف أدوات المطبخ', action: 'shop', labelEn: 'Explore Kitchen Tools' },
      ctaSecondary: { label: 'كل المنتجات', action: 'shop', labelEn: 'All Products' },
      active: true,
    },
    {
      id: 'tech',
      eyebrow: '🎧 إلكترونيات وأجهزة ذكية',
      title: 'سماعات وساعات ذكية —',
      highlight: 'تقنية بأسعار محلية',
      subtitle:
        'منتجات تقنية مختارة تناسب الاستخدام اليومي: سماعات لاسلكية، ساعات ذكية، ملحقات وشواحن — مع ضمان استبدال عند العيب المصنعي.',
      eyebrowEn: '🎧 Electronics & smart devices',
      titleEn: 'Earbuds & smartwatches —',
      highlightEn: 'tech at local prices',
      subtitleEn:
        'Carefully picked tech for everyday use: wireless earbuds, smartwatches, accessories and chargers — with a replacement warranty against manufacturing defects.',
      image: IMG_TECH,
      tone: 'blue',
      chips: ['منتجات مختارة بعناية', 'دفع عند الاستلام', 'توصيل 24–48 ساعة'],
      chipsEn: ['Carefully picked', 'Cash on delivery', '24–48h delivery'],
      cta: { label: 'تسوّق التقنية', action: 'shop', labelEn: 'Shop Tech' },
      ctaSecondary: { label: 'تتبع طلبك', action: 'track', labelEn: 'Track Your Order' },
      active: true,
    },
  ],
};

const TONES = new Set(['dark', 'gold', 'green', 'blue']);
const ACTIONS = new Set(['shop', 'category', 'landing', 'track', 'product', 'affiliate-login']);

function cleanCta(raw: unknown): SliderCta | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const label = String(c.label || '').trim().slice(0, 40);
  const action = String(c.action || 'shop');
  const labelEn = String(c.labelEn || '').trim().slice(0, 60);
  if (!label) return null;
  return {
    label,
    action: (ACTIONS.has(action) ? action : 'shop') as SlideAction,
    payload: c.payload ? String(c.payload).trim().slice(0, 300) : undefined,
    ...(labelEn ? { labelEn } : {}),
  };
}

/** Sanitize one incoming slide — trusts nothing from the client. */
export function normalizeSlide(raw: unknown, fallbackId?: string): SliderSlide | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;

  const title = String(s.title || '').trim().slice(0, 90);
  const subtitle = String(s.subtitle || '').trim().slice(0, 300);
  if (!title || !subtitle) return null;

  const cta = cleanCta(s.cta) ?? { label: 'تسوق الآن', action: 'shop' as SlideAction };
  const ctaSecondary = cleanCta(s.ctaSecondary) ?? undefined;

  let image = typeof s.image === 'string' ? s.image.trim() : '';
  // data-URLs capped at ~600KB; plain URLs capped at 2000 chars
  if (image.startsWith('data:')) {
    if (image.length > 800_000) image = '';
  } else if (image.length > 2000) {
    image = '';
  }

  const chips = Array.isArray(s.chips)
    ? s.chips.map((c) => String(c).trim().slice(0, 30)).filter(Boolean).slice(0, 4)
    : undefined;
  const chipsEn = Array.isArray(s.chipsEn)
    ? s.chipsEn.map((c) => String(c).trim().slice(0, 40)).filter(Boolean).slice(0, 4)
    : undefined;

  const tone = String(s.tone || 'dark');

  const en = (v: unknown, max: number) => {
    const str = String(v || '').trim().slice(0, max);
    return str || undefined;
  };

  return {
    id: String(s.id || fallbackId || `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).slice(0, 60),
    eyebrow: s.eyebrow ? String(s.eyebrow).trim().slice(0, 70) : undefined,
    title,
    highlight: s.highlight ? String(s.highlight).trim().slice(0, 60) : undefined,
    subtitle,
    // ===== English copy (sanitized the same way) =====
    eyebrowEn: en(s.eyebrowEn, 80),
    titleEn: en(s.titleEn, 110),
    highlightEn: en(s.highlightEn, 70),
    subtitleEn: en(s.subtitleEn, 340),
    chipsEn: chipsEn && chipsEn.length ? chipsEn : undefined,
    image: image || undefined,
    tone: (TONES.has(tone) ? tone : 'dark') as SliderSlide['tone'],
    chips: chips && chips.length ? chips : undefined,
    cta,
    ctaSecondary,
    active: s.active === undefined ? true : !!s.active,
  };
}

/** Validate + persist a full slides payload coming from the dashboard. */
export async function saveSliderSettings(
  partial: Partial<SliderSettings>
): Promise<SliderSettings> {
  const current = await getSliderSettings();

  const slidesRaw = Array.isArray(partial.slides) ? partial.slides : current.slides;
  const slides = slidesRaw
    .map((s, i) => normalizeSlide(s, `s_${i + 1}`))
    .filter((s): s is SliderSlide => !!s)
    .slice(0, MAX_SLIDES);

  const autoplay = Number(partial.autoplayMs ?? current.autoplayMs);
  const next: SliderSettings = {
    slides,
    autoplayMs: Math.min(
      MAX_AUTOPLAY_MS,
      Math.max(MIN_AUTOPLAY_MS, Number.isFinite(autoplay) ? autoplay : 5200)
    ),
    appendLandingPromos:
      typeof partial.appendLandingPromos === 'boolean'
        ? partial.appendLandingPromos
        : current.appendLandingPromos,
  };

  await db.siteSetting.upsert({
    where: { key: KEY },
    update: { value: next as any },
    create: { key: KEY, value: next as any },
  });
  return next;
}

/** Reset to the built-in defaults (founder action). */
export async function resetSliderSettings(): Promise<SliderSettings> {
  await db.siteSetting.upsert({
    where: { key: KEY },
    update: { value: DEFAULT_SLIDER as any },
    create: { key: KEY, value: DEFAULT_SLIDER as any },
  });
  return DEFAULT_SLIDER;
}

export async function getSliderSettings(): Promise<SliderSettings> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: KEY } });
    if (!row) return DEFAULT_SLIDER;
    const v = row.value as Partial<SliderSettings>;
    const slides = (Array.isArray(v.slides) ? v.slides : [])
      .map((s, i) => normalizeSlide(s, `s_${i + 1}`))
      .filter((s): s is SliderSlide => !!s);
    return {
      slides: slides.length ? slides : DEFAULT_SLIDER.slides,
      autoplayMs: Number(v.autoplayMs) || DEFAULT_SLIDER.autoplayMs,
      appendLandingPromos:
        typeof v.appendLandingPromos === 'boolean' ? v.appendLandingPromos : true,
    };
  } catch {
    return DEFAULT_SLIDER;
  }
}

/** in-memory cache (45s) — the homepage hits this on every first visit */
let cache: { at: number; data: SliderSettings } | null = null;
export async function getSliderSettingsCached(): Promise<SliderSettings> {
  if (cache && Date.now() - cache.at < 45_000) return cache.data;
  const data = await getSliderSettings();
  cache = { at: Date.now(), data };
  return data;
}
export function clearSliderCache() {
  cache = null;
}
