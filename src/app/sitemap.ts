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
  } catch {
    /* DB unavailable — return static entries */
  }

  return entries;
}
