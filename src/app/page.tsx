import type { Metadata } from 'next';
import {
  getSeoSettings,
  getSiteUrl,
  productTitle,
  productDescription,
  firstImage,
  resolveSeoPage,
} from '@/lib/seo';
import { StoreApp, InitialUrlState } from '@/components/store/store-app';
import { SeoHtml } from '@/components/store/seo-html';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const INDEX_FOLLOW = { index: true, follow: true };
const NO_INDEX = { index: false, follow: false };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const [page, seo, siteUrl] = await Promise.all([
    resolveSeoPage(sp),
    getSeoSettings(),
    getSiteUrl(),
  ]);

  const ogBase = {
    siteName: 'محل شوب',
    locale: 'ar_KW',
    type: 'website' as const,
  };

  switch (page.kind) {
    case 'product': {
      const p = page.product;
      const canonical = `${siteUrl}/?p=${encodeURIComponent(p.slug)}`;
      const image = firstImage(p);
      return {
        title: productTitle(p),
        description: productDescription(p),
        keywords: [
          p.name,
          p.category?.name || '',
          'شراء أونلاين الكويت',
          'محل شوب',
          `${p.sku}`,
        ].filter(Boolean),
        alternates: { canonical },
        robots: INDEX_FOLLOW,
        openGraph: {
          ...ogBase,
          title: `${p.name} | محل شوب`,
          description: productDescription(p),
          url: canonical,
          images: image ? [{ url: image, width: 800, height: 800, alt: p.name }] : undefined,
        },
        twitter: {
          card: 'summary_large_image',
          title: `${p.name} — ${p.salePrice} د.ك | محل شوب`,
          description: productDescription(p),
          images: image ? [image] : undefined,
        },
      };
    }
    case 'category': {
      const c = page.category;
      const canonical = `${siteUrl}/?cat=${encodeURIComponent(c.slug)}`;
      return {
        title: `${c.name} — تسوق أونلاين بأفضل الأسعار في الكويت`,
        description: `تصفح منتجات ${c.name} في محل شوب بأسعار بالدينار الكويتي. دفع عند الاستلام وتوصيل سريع لجميع محافظات الكويت.`,
        keywords: [c.name, `${c.name} الكويت`, 'تسوق أونلاين', 'محل شوب', 'أسعار الكويت'],
        alternates: { canonical },
        robots: INDEX_FOLLOW,
        openGraph: {
          ...ogBase,
          title: `${c.name} | محل شوب`,
          description: `منتجات ${c.name} بأسعار تنافسية — توصيل لكل الكويت ودفع عند الاستلام.`,
          url: canonical,
        },
      };
    }
    case 'landing': {
      const canonical = `${siteUrl}/?l=${encodeURIComponent(
        new URLSearchParams(
          Object.entries(sp).flatMap(([k, v]) =>
            k === 'l' && typeof v === 'string' ? [[k, v] as [string, string]] : []
          )
        ).get('l') || ''
      )}`;
      return {
        title: page.title,
        description: `${page.title} — عرض خاص من محل شوب الكويت: أسعار بالدينار الكويتي، دفع عند الاستلام، وتوصيل سريع لجميع المحافظات.`,
        alternates: { canonical },
        robots: INDEX_FOLLOW,
        openGraph: { ...ogBase, title: page.title, url: canonical },
      };
    }
    case 'search':
      // thin search results — keep out of the index, follow links
      return { title: `نتائج البحث: ${page.q}`, robots: { index: false, follow: true } };
    case 'account':
      return {
        title: 'حسابي — طلباتي ومتابعة الطلب | محل شوب',
        description: 'سجل دخولك برقم هاتفك وتابع طلباتك خطوة بخطوة — كلمة المرور الافتراضية هي رقم هاتفك.',
        alternates: { canonical: `${siteUrl}/?account=1` },
        robots: NO_INDEX,
      };
    case 'track':
      return {
        title: 'تتبع طلبك — وين وصل شحنتك؟ | محل شوب',
        description: 'اكتب رقم الطلب ورقم هاتفك وشوف حالة طلبك من محل شوب: تم الاستلام، تم الشحن، وفي الطريق إليك.',
        alternates: { canonical: `${siteUrl}/?track=1` },
        robots: INDEX_FOLLOW,
        openGraph: { ...ogBase, title: 'تتبع طلبك | محل شوب', url: `${siteUrl}/?track=1` },
      };
    case 'wishlist':
      return { title: 'المفضلة', robots: NO_INDEX };
    case 'info':
      return {
        title: page.title,
        description: page.description,
        alternates: { canonical: `${siteUrl}/?info=${page.page}` },
        robots: INDEX_FOLLOW,
        openGraph: { ...ogBase, title: page.title, url: `${siteUrl}/?info=${page.page}` },
      };
    case 'admin':
      return { title: 'دخول الإدارة', robots: NO_INDEX };
    default:
      return {
        title: seo.siteTitle,
        description: seo.description,
        keywords: seo.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        alternates: { canonical: siteUrl },
        robots: INDEX_FOLLOW,
        openGraph: {
          ...ogBase,
          title: seo.siteTitle,
          description: seo.description,
          url: siteUrl,
        },
        twitter: {
          card: 'summary_large_image',
          title: seo.siteTitle,
          description: seo.description,
        },
      };
  }
}

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;
  const [page, siteUrl] = await Promise.all([resolveSeoPage(sp), getSiteUrl()]);

  // Build the initial client state so deep links open the right SPA view
  const initial: InitialUrlState = { view: 'home' };
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  if (page.kind === 'product') {
    initial.view = 'product';
    initial.productSlug = page.product.slug;
  } else if (page.kind === 'category') {
    initial.view = 'shop';
    initial.categoryId = page.category.id;
    initial.categorySlug = page.category.slug;
  } else if (page.kind === 'landing') {
    initial.view = 'landing';
    initial.landingSlug = one('l') || null;
  } else if (page.kind === 'search') {
    initial.view = 'shop';
    initial.searchQuery = page.q;
  } else if (page.kind === 'account') {
    initial.view = 'account';
  } else if (page.kind === 'track') {
    initial.view = 'track-order';
  } else if (page.kind === 'wishlist') {
    initial.view = 'wishlist';
  } else if (page.kind === 'info') {
    initial.view = 'info';
    initial.infoPage = page.page;
  } else if (one('all') === '1') {
    initial.view = 'shop';
  }

  return (
    <>
      <SeoHtml page={page} siteUrl={siteUrl} />
      <StoreApp initial={initial} />
    </>
  );
}
