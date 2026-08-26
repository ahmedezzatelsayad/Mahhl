/**
 * Slider types — client-safe (no db imports).
 * Shared by the storefront HeroSlider, the founder dashboard, and the API.
 *
 * Slides are BILINGUAL: Arabic is the primary copy (title/subtitle/…) and the
 * optional *En fields power the English storefront. When an EN field is empty
 * the Arabic value is shown as a fallback — `localizedSlide()` resolves it.
 */

export type SlideAction = 'shop' | 'category' | 'landing' | 'track' | 'product';

export interface SliderCta {
  label: string;
  action: SlideAction;
  /** category id · landing slug · product slug (unused for shop/track) */
  payload?: string;
  /** English button label (shown when the site language is EN) */
  labelEn?: string;
}

export interface SliderSlide {
  id: string;
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle: string;
  image?: string;
  /** gradient tone shown while the image loads / when no image */
  tone: 'dark' | 'gold' | 'green' | 'blue';
  chips?: string[];
  cta: SliderCta;
  ctaSecondary?: SliderCta;
  active: boolean;

  // ===== English copy (optional — falls back to Arabic when empty) =====
  eyebrowEn?: string;
  titleEn?: string;
  highlightEn?: string;
  subtitleEn?: string;
  chipsEn?: string[];
}

export interface SliderSettings {
  slides: SliderSlide[];
  autoplayMs: number;
  /** keep appending up to 2 active landing promos after the managed slides */
  appendLandingPromos: boolean;
}

/** dashboard display helpers attached to AI-generated slides */
export interface AutoSlide extends SliderSlide {
  _productName?: string;
  _productSlug?: string;
  _price?: number;
  _oldPrice?: number | null;
}

/** A slide resolved for one language — every field guaranteed non-empty. */
export interface LocalizedSlide {
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle: string;
  chips?: string[];
  ctaLabel: string;
  ctaLabel2?: string;
}

/**
 * Resolve a slide's copy for a language.
 * EN falls back to Arabic field-by-field so a half-translated slide never
 * renders empty — the founder sees exactly what visitors see.
 */
export function localizedSlide(s: SliderSlide, lang: 'ar' | 'en'): LocalizedSlide {
  if (lang === 'ar') {
    return {
      eyebrow: s.eyebrow,
      title: s.title,
      highlight: s.highlight,
      subtitle: s.subtitle,
      chips: s.chips,
      ctaLabel: s.cta?.label || 'تسوق الآن',
      ctaLabel2: s.ctaSecondary?.label,
    };
  }
  return {
    eyebrow: s.eyebrowEn || s.eyebrow,
    title: s.titleEn || s.title,
    highlight: s.highlightEn || s.highlight,
    subtitle: s.subtitleEn || s.subtitle,
    chips: (s.chipsEn && s.chipsEn.length ? s.chipsEn : s.chips),
    ctaLabel: s.cta?.labelEn || s.cta?.label || 'Shop Now',
    ctaLabel2: s.ctaSecondary?.labelEn || s.ctaSecondary?.label,
  };
}

/** True when every EN field has a value (dashboard completeness indicator). */
export function slideEnComplete(s: SliderSlide): boolean {
  return Boolean(
    s.titleEn?.trim() &&
      s.subtitleEn?.trim() &&
      s.cta?.labelEn?.trim() &&
      (!s.eyebrow || s.eyebrowEn?.trim()) &&
      (!s.highlight || s.highlightEn?.trim()) &&
      (!s.chips?.length || (s.chipsEn?.length ?? 0) >= s.chips.length) &&
      (!s.ctaSecondary || s.ctaSecondary?.labelEn?.trim())
  );
}
