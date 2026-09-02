/**
 * seo.ts — Server-side SEO + GEO (Generative Engine Optimization) helpers.
 *
 * Generates per-product / per-category metadata for 2,638+ products,
 * JSON-LD structured data (Product, Breadcrumb, FAQ, Organization...),
 * and runtime-editable SEO settings stored in SiteSetting (key = "seo").
 *
 * URL contract (single-route SPA on "/"):
 *   /               → home
 *   /?p=<slug>      → product page
 *   /?cat=<slug>    → category listing
 *   /?q=<text>      → search results
 *   /?l=<slug>      → AI landing page
 */
import { cache } from 'react';
import { db } from '@/lib/db';
import { getShippingSettings } from '@/lib/settings';

export const SITE_NAME = 'محل شوب';
export const SITE_NAME_EN = 'Mahal Shop';
export const DEFAULT_SITE_URL = 'http://localhost:3000';

// ===== Runtime SEO settings (admin-editable) =====

export interface SeoSettings {
  siteTitle: string;
  titleTemplate: string; // use %s for page title
  description: string;
  keywords: string; // comma-separated
  siteUrl: string; // e.g. https://mahalshop.com
  googleVerification: string;
  bingVerification: string;
}

export const DEFAULT_SEO: SeoSettings = {
  siteTitle: 'محل شوب | متجر إلكتروني عربي احترافي في الكويت',
  titleTemplate: '%s | محل شوب',
  description:
    'محل شوب — متجر إلكتروني عربي احترافي في الكويت. أكثر من 2600 منتج بأسعار تنافسية بالدينار الكويتي، توصيل سريع لجميع محافظات الكويت، ودفع عند الاستلام.',
  keywords:
    'محل شوب, متجر إلكتروني الكويت, تسوق اونلاين الكويت, محل شوب الكويت, شراء اونلاين, دفع عند الاستلام الكويت, توصيل الكويت, متجر عربي, mahal shop, عروض الكويت, خصومات الكويت',
  siteUrl: '',
  googleVerification: '',
  bingVerification: '',
};

const SEO_KEY = 'seo';

export const getSeoSettings = cache(async (): Promise<SeoSettings> => {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: SEO_KEY } });
    if (row?.value) {
      const v = row.value as Record<string, unknown>;
      return {
        siteTitle: String(v.siteTitle || DEFAULT_SEO.siteTitle),
        titleTemplate: String(v.titleTemplate || DEFAULT_SEO.titleTemplate),
        description: String(v.description || DEFAULT_SEO.description),
        keywords: String(v.keywords || DEFAULT_SEO.keywords),
        siteUrl: String(v.siteUrl || '').replace(/\/+$/, ''),
        googleVerification: String(v.googleVerification || ''),
        bingVerification: String(v.bingVerification || ''),
      };
    }
  } catch {
    /* fall through to defaults */
  }
  return DEFAULT_SEO;
});

export async function saveSeoSettings(
  partial: Partial<SeoSettings>
): Promise<SeoSettings> {
  const current = await getSeoSettings();
  const next: SeoSettings = {
    siteTitle: (partial.siteTitle ?? current.siteTitle).trim().slice(0, 120),
    titleTemplate: (partial.titleTemplate ?? current.titleTemplate)
      .trim()
      .slice(0, 80),
    description: (partial.description ?? current.description)
      .trim()
      .slice(0, 400),
    keywords: (partial.keywords ?? current.keywords).trim().slice(0, 1000),
    siteUrl: (partial.siteUrl ?? current.siteUrl).trim().replace(/\/+$/, ''),
    googleVerification: (
      partial.googleVerification ?? current.googleVerification
    )
      .trim()
      .slice(0, 120),
    bingVerification: (partial.bingVerification ?? current.bingVerification)
      .trim()
      .slice(0, 120),
  };
  await db.siteSetting.upsert({
    where: { key: SEO_KEY },
    create: { key: SEO_KEY, value: next as any },
    update: { value: next as any },
  });
  return next;
}

/** Canonical public site URL: env var wins, then admin setting, then localhost. */
export async function getSiteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
  if (fromEnv && fromEnv !== DEFAULT_SITE_URL) return fromEnv;
  const s = await getSeoSettings();
  if (s.siteUrl) return s.siteUrl;
  return fromEnv || DEFAULT_SITE_URL;
}

// ===== Per-entity SEO text generation (all 2,638 products) =====

export interface ProductLike {
  name: string;
  description?: string | null;
  metaDescription?: string | null;
  metaTitle?: string | null;
  keywords?: string | null;
  price: number;
  salePrice: number;
  thumb?: string | null;
  images?: string | null;
  category?: { name: string; slug: string } | null;
  isBestSeller?: boolean;
}

export function formatKwd(n: number): string {
  // Kuwaiti fils convention — 3 decimals, consistent with src/lib/utils/format.ts
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

/** Append store brand to a title (Next.js never applies the root-layout
 *  template to the root page — same segment — so we do it here). */
export function withBrand(title: string): string {
  const t = title.trim();
  if (!t || t.includes('محل شوب')) return t;
  const branded = `${t} | محل شوب`;
  return branded.length > 68 ? t : branded;
}

export function productTitle(p: ProductLike): string {
  // per-product curated SEO title wins (50-60 chars target)
  const raw =
    (p.metaTitle && p.metaTitle.trim()) ||
    `${p.name}${p.category?.name ? ` - ${p.category.name}` : ''}`;
  const base = raw.length > 62 ? `${raw.slice(0, 61)}…` : raw;
  return withBrand(base);
}

/** Per-product keyword list: curated keywords first, then sensible fallbacks. */
export function productKeywords(
  p: ProductLike & { sku?: string }
): string[] {
  const fromField = (p.keywords || '')
    .split(/[,،]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 1)
    .slice(0, 8);
  if (fromField.length >= 3) return fromField;
  const fallback = [p.name, p.category?.name || '', 'شراء أونلاين الكويت', 'محل شوب'];
  if (p.sku) fallback.push(p.sku);
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const k of [...fromField, ...fallback]) {
    const key = k.toLowerCase();
    if (k && !seen.has(key)) {
      seen.add(key);
      merged.push(k);
    }
    if (merged.length >= 10) break;
  }
  return merged;
}

export function productDescription(p: ProductLike): string {
  // curated per-product metaDescription (SEO pack pipeline / admin) wins as-is —
  // it already carries its own COD+delivery close, don't double-append
  const md = (p.metaDescription || '').trim();
  if (md.length >= 80) {
    return md.replace(/\s+/g, ' ').slice(0, 178);
  }
  const raw = (p.description && p.description.trim()) || '';
  const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const core =
    clean.length >= 50
      ? clean.slice(0, 155).trim() + (clean.length > 155 ? '…' : '')
      : `اشترِ ${p.name} من محل شوب بسعر ${formatKwd(p.salePrice)} د.ك`;
  const hasClose = /دفع عند الاستلام|توصيل سريع/.test(core);
  const suffix = hasClose ? '' : ` توصيل سريع لجميع محافظات الكويت ودفع عند الاستلام.`;
  return (core + suffix).slice(0, 200);
}

export function firstImage(p: { thumb?: string | null; images?: string | null }): string | null {
  if (p.thumb) return p.thumb;
  const first = (p.images || '').split(',')[0]?.trim();
  return first || null;
}

// ===== JSON-LD builders =====

export function organizationJsonLd(url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': `${url}/#store`,
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url,
    logo: `${url}/icon.svg`,
    telephone: '+96566046358',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+96566046358',
      contactType: 'customer service',
      availableLanguage: ['Arabic', 'Kuwaiti Arabic'],
      areaServed: 'KW',
    },
    description: DEFAULT_SEO.description,
    areaServed: {
      '@type': 'Country',
      name: 'الكويت (Kuwait)',
    },
    currenciesAccepted: 'KWD',
    paymentAccepted: 'الدفع عند الاستلام (Cash on Delivery)',
    knowsAbout: [
      'توصيل سريع لجميع محافظات الكويت',
      'الدفع عند الاستلام',
      'أسعار بالدينار الكويتي',
    ],
  };
}

export function websiteJsonLd(url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}/#website`,
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url,
    inLanguage: 'ar-KW',
    publisher: { '@id': `${url}/#store` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function productJsonLd(
  p: ProductLike & { sku?: string; slug: string; quantity?: number },
  url: string,
  shippingPrice: number,
  rating?: { average: number; count: number }
) {
  const image = firstImage(p);
  const available =
    p.quantity === undefined || p.quantity > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: productDescription(p),
    sku: p.sku || p.slug,
    image: image ? [image] : undefined,
    category: p.category?.name,
    brand: { '@type': 'Brand', name: SITE_NAME },
    url: `${url}/?p=${encodeURIComponent(p.slug)}`,
    // aggregateRating → star snippets in Google results (only when real reviews exist)
    ...(rating && rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Math.round(rating.average * 10) / 10,
            reviewCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url: `${url}/?p=${encodeURIComponent(p.slug)}`,
      price: p.salePrice,
      priceCurrency: 'KWD',
      availability: available,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${url}/#store` },
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: shippingPrice,
          currency: 'KWD',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'KW',
        },
      },
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function itemListJsonLd(
  items: { name: string; url: string }[],
  name: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 60).map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

/** Real FAQ answers derived from live shipping settings — no invented facts. */
export async function buildFaqJsonLd(url: string) {
  const shipping = await getShippingSettings();
  const freeText =
    shipping.freeThreshold > 0
      ? ` التوصيل مجاني للطلبات من ${formatKwd(shipping.freeThreshold)} د.ك فأكثر.`
      : '';
  const faqs: { q: string; a: string }[] = [
    {
      q: 'هل يوجد توصيل لجميع محافظات الكويت؟',
      a: `نعم، محل شوب يوصّل لجميع محافظات الكويت (العاصمة، حولي، الفروانية، الأحمدي، الجهراء، مبارك الكبير). سعر التوصيل ${formatKwd(shipping.price)} د.ك.${freeText}`,
    },
    {
      q: 'ما هي طرق الدفع المتاحة في محل شوب؟',
      a: 'الدفع عند الاستلام (COD) — تدفع نقداً للمندوب عند استلام طلبك. جميع الأسعار بالدينار الكويتي.',
    },
    {
      q: 'كم عدد المنتجات في محل شوب؟',
      a: 'أكثر من 2600 منتج في 38 فئة: أجهزة كهربائية، مستلزمات مطبخ، أحزمة ومشدات، ألعاب، أدوات، عناية شخصية والمزيد.',
    },
    {
      q: 'كيف أطلب من محل شوب؟',
      a: 'اختر المنتج، أضفه للسلة، اكتب اسمك ورقم هاتفك ومحافظتك ومنطقتك، ثم أكّد الطلب — سنتصل بك لتأكيد التوصيل.',
    },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function faqEntries(): { q: string; aKey: 'shipping' | 'cod' | 'count' | 'how' }[] {
  return [
    { q: 'هل يوجد توصيل لجميع محافظات الكويت؟', aKey: 'shipping' },
    { q: 'ما هي طرق الدفع المتاحة؟', aKey: 'cod' },
    { q: 'كم عدد المنتجات في محل شوب؟', aKey: 'count' },
    { q: 'كيف أطلب من محل شوب؟', aKey: 'how' },
  ];
}

// ===== Page-level SEO data for the current URL =====

export type SeoPageData =
  | { kind: 'home' }
  | {
      kind: 'product';
      product: NonNullable<Awaited<ReturnType<typeof loadProduct>>>;
    }
  | {
      kind: 'category';
      category: NonNullable<Awaited<ReturnType<typeof loadCategory>>>;
      products: { name: string; slug: string; salePrice: number }[];
    }
  | { kind: 'search'; q: string }
  | { kind: 'landing'; title: string }
  | { kind: 'account' }
  | { kind: 'track' }
  | { kind: 'wishlist' }
  | { kind: 'info'; page: InfoPageKind; title: string; description: string }
  | { kind: 'admin' };

export type InfoPageKind =
  | 'about'
  | 'contact'
  | 'faq'
  | 'shipping'
  | 'returns'
  | 'privacy'
  | 'terms';

export const loadProduct = cache(async (slug: string) => {
  try {
    return await db.product.findUnique({
      where: { slug },
      select: {
        id: true, slug: true, name: true, sku: true,
        description: true, metaDescription: true,
        metaTitle: true, keywords: true, legacySlug: true,
        price: true, salePrice: true, quantity: true,
        thumb: true, images: true, isBestSeller: true,
        updatedAt: true,
        category: { select: { name: true, slug: true } },
      },
    });
  } catch {
    return null;
  }
});

/**
 * Resolve an old (legacy) product slug — used for 301 redirects after
 * slug upgrades so indexed/shared links keep working.
 */
export const findProductByLegacySlug = cache(async (slug: string) => {
  try {
    return await db.product.findFirst({
      where: { legacySlug: slug },
      select: { slug: true },
    });
  } catch {
    return null;
  }
});

export const loadCategory = cache(async (slug: string) => {
  try {
    return await db.category.findUnique({
      where: { slug },
      select: {
        id: true, name: true, slug: true,
        children: { select: { id: true, name: true, slug: true } },
      },
    });
  } catch {
    return null;
  }
});

/** Resolve the SEO story for a URL (searchParams already awaited). */
export async function resolveSeoPage(sp: Record<string, string | string[] | undefined>): Promise<SeoPageData> {
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const p = one('p');
  const cat = one('cat');
  const l = one('l');
  const view = one('view');
  const q = one('q');

  if (view?.startsWith('admin') || view?.startsWith('affiliate')) return { kind: 'admin' };

  if (p) {
    const product = await loadProduct(p);
    if (product) return { kind: 'product', product };
  }
  if (cat) {
    const category = await loadCategory(cat);
    if (category) {
      let products: { name: string; slug: string; salePrice: number }[] = [];
      try {
        // include sub-categories products
        const ids = [category.id, ...category.children.map((c) => c.id)];
        products = await db.product.findMany({
          where: { categoryId: { in: ids } },
          select: { name: true, slug: true, salePrice: true },
          orderBy: [{ isBestSeller: 'desc' }, { createdAt: 'desc' }],
          take: 60,
        });
      } catch {
        /* ignore */
      }
      return { kind: 'category', category, products };
    }
  }
  if (l) {
    try {
      const lp = await db.landingPage.findUnique({
        where: { slug: l },
        select: { title: true, isActive: true },
      });
      if (lp) return { kind: 'landing', title: lp.title };
    } catch {
      /* ignore */
    }
  }
  if (q && q.trim()) return { kind: 'search', q: q.trim() };

  const INFO_META: Record<InfoPageKind, { title: string; description: string }> = {
    about: {
      title: 'من نحن — محل شوب متجرك الكويتي الذكي',
      description: 'محل شوب: متجر إلكتروني كويتي بأكثر من 2,600 منتج بأسعار الدينار الكويتي، توصيل لكل المحافظات ودفع عند الاستلام.',
    },
    contact: {
      title: 'تواصل معنا — واتساب محل شوب',
      description: 'تواصل مع فريق محل شوب على واتسوب يومياً من 9 صباحاً حتى 11 مساءً — نرد عليك بأسرع وقت.',
    },
    faq: {
      title: 'الأسئلة الشائعة — كل ما تحتاج تعرفه | محل شوب',
      description: 'شلون أطلب؟ شلون أدفع؟ متى يوصل طلبي؟ — إجابات واضحة على أكثر أسئلة عملائنا في الكويت.',
    },
    shipping: {
      title: 'الشحن والتوصيل — لكل محافظات الكويت | محل شوب',
      description: 'توصيل لكل محافظات الكويت، الطلبات تشحن تلقائياً الساعة 10 صباحاً، وسيصل طلبك في الميعاد المنسق مع خدمة العملاء والمندوب.',
    },
    returns: {
      title: 'الاستبدال والاسترجاع — خلال 3 أيام | محل شوب',
      description: 'سياسة استبدال واسترجاع واضحة: خلال 3 أيام من الاستلام للمنتجات بحالتها الأصلية — تواصل معنا على الواتساب.',
    },
    privacy: {
      title: 'سياسة الخصوصية — بياناتك أمانة | محل شوب',
      description: 'نجمع فقط الاسم والهاتف والعنوان لتنفيذ طلبك — لا نخزن بطاقات ولا نشارك بياناتك مع أي طرف ثالث.',
    },
    terms: {
      title: 'الشروط والأحكام | محل شوب',
      description: 'شروط استخدام متجر محل شوب: الأسعار بالدينار الكويتي، الدفع عند الاستلام، والتوصيل لكل محافظات الكويت.',
    },
  };

  const info = one('info') as InfoPageKind | undefined;
  if (info && info in INFO_META) {
    return { kind: 'info', page: info, ...INFO_META[info] };
  }
  if (one('account') === '1') return { kind: 'account' };
  if (one('track') === '1') return { kind: 'track' };
  if (one('wishlist') === '1') return { kind: 'wishlist' };

  return { kind: 'home' };
}
