/** Server-side i18n helpers for API routes. */

export type ApiLang = 'ar' | 'en';

export function reqLang(req: Request): ApiLang {
  try {
    return new URL(req.url).searchParams.get('lang') === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

/** Localize a product row (name/description/category name) for English visitors. */
export function locProduct<T extends Record<string, any>>(p: T | null, lang: ApiLang): T | null {
  if (!p || lang !== 'en') return p;
  return {
    ...p,
    name: p.nameEn || p.name,
    description: p.descriptionEn || p.description,
    category: p.category
      ? { ...p.category, name: p.category.nameEn || p.category.name }
      : p.category,
  };
}

/** CDN cache headers for public catalog reads (archiving/revalidation). */
export const CDN_CACHE = 'public, s-maxage=120, stale-while-revalidate=600';
export const CDN_CACHE_LONG = 'public, s-maxage=300, stale-while-revalidate=900';
