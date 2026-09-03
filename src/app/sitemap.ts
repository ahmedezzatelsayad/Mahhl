import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { getSiteUrl } from '@/lib/seo';

export const revalidate = 3600;

/**
 * Dynamic sitemap covering the entire catalog:
 * home + shop-all + 38 categories + every one of the 2,638 products + active landings.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/?all=1`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ];

  try {
    const [cats, products, landings] = await Promise.all([
      db.category.findMany({
        select: { slug: true, updatedAt: true },
      }),
      db.product.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.landingPage.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    for (const c of cats) {
      entries.push({
        url: `${base}/?cat=${encodeURIComponent(c.slug)}`,
        lastModified: c.updatedAt,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
    for (const p of products) {
      entries.push({
        url: `${base}/?p=${encodeURIComponent(p.slug)}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
    for (const l of landings) {
      entries.push({
        url: `${base}/?l=${encodeURIComponent(l.slug)}`,
        lastModified: l.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    // صفحات المعلومات + مركز المسوقين (footer pages) — للفهرسة والأجوبة الذكية
    const INFO_PAGES: { page: string; priority: number }[] = [
      { page: 'about', priority: 0.7 },
      { page: 'affiliate-program', priority: 0.8 },
      { page: 'faq', priority: 0.6 },
      { page: 'contact', priority: 0.5 },
      { page: 'shipping', priority: 0.5 },
      { page: 'returns', priority: 0.5 },
      { page: 'privacy', priority: 0.3 },
      { page: 'terms', priority: 0.3 },
      { page: 'guide-ads', priority: 0.7 },
      { page: 'guide-campaigns', priority: 0.7 },
    ];
    for (const { page, priority } of INFO_PAGES) {
      entries.push({
        url: `${base}/?info=${page}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority,
      });
    }
  } catch {
    /* DB unavailable — return static entries */
  }

  return entries;
}
