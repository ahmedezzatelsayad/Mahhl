/**
 * /store/[slug] — المتجر العام لمسوّق (الميزة القاتلة).
 * يحل المتجر بالترتيب: slug عادي → customDomain (دومين خاص) → أول لابل
 * من سب دومين wildcard. صفحة مستقلة بهوية المسوّق + طلب COD مباشر
 * يدخل نظام العمولات باسمه تلقائياً.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { loadPublicStorefront, storefrontPrice, kwd } from '@/lib/storefront';
import StorefrontClient, { type StorefrontProductView } from './storefront-client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

/** slug قد يكون: معرف متجر، دومين كامل (من الميدلوير)، أو أول لابل من سب دومين. */
async function resolveStore(rawSlug: string) {
  const s = decodeURIComponent(rawSlug || '').toLowerCase().trim();
  if (!s) return null;

  // 1) دومين كامل (يصل من الميدلوير للدومينات الخاصة)
  if (s.includes('.') && !s.endsWith('.vercel.app')) {
    const byDomain = await loadPublicStorefront({ customDomain: s });
    if (byDomain) return byDomain;
  }

  // 2) معرف مباشر
  const bySlug = await loadPublicStorefront({ slug: s });
  if (bySlug) return bySlug;

  // 3) سب دومين wildcard: ahmed.mahhlkw.com → جرّب «ahmed»
  const firstLabel = s.split('.')[0];
  if (firstLabel && firstLabel !== s) {
    return loadPublicStorefront({ slug: firstLabel });
  }
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await resolveStore(slug).catch(() => null);
  if (!store) return { title: 'المتجر غير موجود' };
  const title = `${store.name} — توصيل لكل الكويت والدفع عند الاستلام`;
  const description =
    store.tagline ||
    `تسوق من ${store.name}: منتج مختار بعناية، توصيل سريع لكل المحافظات، والدفع عند الاستلام.`;
  return {
    title,
    description,
    openGraph: { title, description, images: store.logoUrl ? [store.logoUrl] : undefined },
    robots: { index: true, follow: true },
  };
}

export default async function StorefrontPage({ params }: PageProps) {
  const { slug } = await params;
  const store = await resolveStore(slug);
  if (!store) notFound();

  const products: StorefrontProductView[] = store.products
    .filter((sp) => !(sp.product.disableOOS && sp.product.quantity <= 0))
    .map((sp) => {
      const price = storefrontPrice(sp.product, store.defaultMarkup, sp.price);
      const old = kwd(sp.product.price);
      return {
        id: sp.product.id,
        name: sp.product.name,
        thumb: sp.product.thumb,
        price,
        oldPrice: old > price ? old : null,
        isBestSeller: sp.product.isBestSeller,
        inStock: !sp.product.trackStock || sp.product.quantity > 0,
        category: sp.product.category?.name || null,
        description: sp.product.description || null,
      };
    });

  // JSON-LD للمتجر (SEO لصفحات المسوقين أيضاً)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.name,
    description: store.tagline || undefined,
    logo: store.logoUrl || undefined,
    address: { '@type': 'PostalAddress', addressCountry: 'KW' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StorefrontClient
        store={{
          slug: store.slug,
          name: store.name,
          tagline: store.tagline,
          logoUrl: store.logoUrl,
          primaryColor: store.primaryColor,
          whatsapp: store.whatsapp,
          thankYouNote: store.thankYouNote,
        }}
        products={products}
      />
    </>
  );
}
