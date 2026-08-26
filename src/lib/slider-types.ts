/**
 * Slider types — client-safe (no db imports).
 * Shared by the storefront HeroSlider, the founder dashboard, and the API.
 */

export type SlideAction = 'shop' | 'category' | 'landing' | 'track' | 'product';

export interface SliderCta {
  label: string;
  action: SlideAction;
  /** category id · landing slug · product slug (unused for shop/track) */
  payload?: string;
}

export interface SliderSlide {
  id: string;
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle: string;
  /** real background photo — URL, data-URL, or product image */
  image?: string;
  /** gradient tone shown while the image loads / when no image */
  tone: 'dark' | 'gold' | 'green' | 'blue';
  chips?: string[];
  cta: SliderCta;
  ctaSecondary?: SliderCta;
  active: boolean;
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
