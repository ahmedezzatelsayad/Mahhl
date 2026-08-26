/**
 * SeoHtml — server-rendered, crawler-readable HTML + JSON-LD structured data.
 *
 * Rendered OUTSIDE the client app, so it stays in the raw HTML even for
 * crawlers that never execute JavaScript (GPTBot, PerplexityBot, ClaudeBot…).
 * The content mirrors exactly what the SPA shows users after hydration —
 * semantic sr-only markup for machines, JSON-LD for rich results.
 */
import {
  buildFaqJsonLd,
  breadcrumbJsonLd,
  firstImage,
  formatKwd,
  itemListJsonLd,
  organizationJsonLd,
  productJsonLd,
  productDescription,
  websiteJsonLd,
  type SeoPageData,
} from '@/lib/seo';
import { getShippingSettings } from '@/lib/settings';
import { db } from '@/lib/db';

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function abs(url: string, path: string) {
  return `${url}${path}`;
}

const gov = 'العاصمة، حولي، الفروانية، الأحمدي، الجهراء، مبارك الكبير';

export async function SeoHtml({ page, siteUrl }: { page: SeoPageData; siteUrl: string }) {
  const shipping = await getShippingSettings();

  // ===== HOME =====
  if (page.kind === 'home') {
    let topProducts: { name: string; slug: string; salePrice: number; category?: { name: string } | null }[] = [];
    let cats: { name: string; slug: string }[] = [];
    try {
      [topProducts, cats] = await Promise.all([
        db.product.findMany({
          where: { isBestSeller: true },
          select: { name: true, slug: true, salePrice: true, category: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
        db.category.findMany({
          where: { parentId: null },
          select: { name: true, slug: true },
          orderBy: { name: 'asc' },
          take: 38,
        }),
      ]);
    } catch {
      /* db unavailable — still render the static story */
    }
    return (
      <>
        <JsonLd data={organizationJsonLd(siteUrl)} />
        <JsonLd data={websiteJsonLd(siteUrl)} />
        <JsonLd data={await buildFaqJsonLd(siteUrl)} />
        {topProducts.length > 0 && (
          <JsonLd
            data={itemListJsonLd(
              topProducts.map((p) => ({
                name: p.name,
                url: abs(siteUrl, `/?p=${encodeURIComponent(p.slug)}`),
              })),
              'الأكثر مبيعاً في محل شوب'
            )}
          />
        )}
        <div className="sr-only">
          <h1>محل شوب — متجر إلكتروني عربي احترافي في الكويت</h1>
          <p>
            محل شوب متجر تسوق إلكتروني يخدم دولة الكويت بأكثر من 2600 منتج في 38 فئة:
            أجهزة كهربائية، مستلزمات مطبخ، أحزمة ومشدات، ألعاب، أدوات منزلية، عناية شخصية
            وغيرها. جميع الأسعار بالدينار الكويتي، الدفع عند الاستلام، والتوصيل السريع يشمل
            جميع محافظات الكويت: {gov}. سعر التوصيل {formatKwd(shipping.price)} د.ك
            {shipping.freeThreshold > 0
              ? ` والتوصيل مجاني للطلبات من ${formatKwd(shipping.freeThreshold)} د.ك فأكثر`
              : ''}
            .
          </p>
          <h2>تسوق حسب الفئة</h2>
          <ul>
            {cats.map((c) => (
              <li key={c.slug}>
                <a href={`/?cat=${encodeURIComponent(c.slug)}`}>{c.name}</a>
              </li>
            ))}
          </ul>
          {topProducts.length > 0 && (
            <>
              <h2>الأكثر مبيعاً</h2>
              <ul>
                {topProducts.map((p) => (
                  <li key={p.slug}>
                    <a href={`/?p=${encodeURIComponent(p.slug)}`}>
                      {p.name}
                      {p.category?.name ? ` — ${p.category.name}` : ''} — {formatKwd(p.salePrice)} د.ك
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h2>الأسئلة الشائعة</h2>
          <dl>
            <dt>هل يوجد توصيل لجميع محافظات الكويت؟</dt>
            <dd>
              نعم، نوصّل لجميع محافظات الكويت بسعر {formatKwd(shipping.price)} د.ك
              {shipping.freeThreshold > 0
                ? ` ومجاناً للطلبات من ${formatKwd(shipping.freeThreshold)} د.ك فأكثر`
                : ''}
              .
            </dd>
            <dt>ما هي طرق الدفع؟</dt>
            <dd>الدفع عند الاستلام (كاش عند التسليم) وجميع الأسعار بالدينار الكويتي.</dd>
            <dt>كيف أطلب؟</dt>
            <dd>
              اختر المنتج، أضفه للسلة، أدخل اسمك ورقم هاتفك والمحافظة والمنطقة، ثم أكّد —
              سنتصل بك لتأكيد الطلب والتوصيل.
            </dd>
          </dl>
        </div>
      </>
    );
  }

  // ===== PRODUCT =====
  if (page.kind === 'product') {
    const p = page.product;
    const cat = p.category;
    const image = firstImage(p);
    return (
      <>
        <JsonLd
          data={productJsonLd(
            { ...p, category: cat ? { name: cat.name, slug: cat.slug } : null },
            siteUrl,
            shipping.price
          )}
        />
        <JsonLd
          data={breadcrumbJsonLd([
            { name: 'الرئيسية', url: siteUrl },
            ...(cat
              ? [{ name: cat.name, url: abs(siteUrl, `/?cat=${encodeURIComponent(cat.slug)}`) }]
              : []),
            { name: p.name, url: abs(siteUrl, `/?p=${encodeURIComponent(p.slug)}`) },
          ])}
        />
        <article className="sr-only">
          <h1>{p.name}</h1>
          {cat && (
            <p>
              الفئة: <a href={`/?cat=${encodeURIComponent(cat.slug)}`}>{cat.name}</a>
            </p>
          )}
          <p>
            السعر: {formatKwd(p.salePrice)} د.ك
            {p.price > p.salePrice ? ` (بدلاً من ${formatKwd(p.price)} د.ك)` : ''} —{' '}
            {p.quantity > 0 ? 'متوفر' : 'غير متوفر حالياً'} — توصيل لجميع محافظات الكويت
            ({gov}) بسعر {formatKwd(shipping.price)} د.ك، والدفع عند الاستلام.
          </p>
          {image && <img src={image} alt={p.name} width={600} height={600} />}
          <h2>وصف المنتج</h2>
          <p>{p.description || productDescription(p)}</p>
          <p>
            اشترِ {p.name} أونلاين من محل شوب الكويت بسعر {formatKwd(p.salePrice)} د.ك مع
            خدمة الدفع عند الاستلام والتوصيل السريع. رقم المنتج: {p.sku}.
          </p>
          <a href="/">العودة إلى محل شوب — الصفحة الرئيسية</a>
        </article>
      </>
    );
  }

  // ===== CATEGORY =====
  if (page.kind === 'category') {
    const c = page.category;
    const catUrl = abs(siteUrl, `/?cat=${encodeURIComponent(c.slug)}`);
    return (
      <>
        <JsonLd
          data={breadcrumbJsonLd([
            { name: 'الرئيسية', url: siteUrl },
            { name: c.name, url: catUrl },
          ])}
        />
        {page.products.length > 0 && (
          <JsonLd
            data={itemListJsonLd(
              page.products.map((p) => ({
                name: p.name,
                url: abs(siteUrl, `/?p=${encodeURIComponent(p.slug)}`),
              })),
              `منتجات ${c.name}`
            )}
          />
        )}
        <section className="sr-only">
          <h1>{c.name} — تسوق أونلاين في الكويت | محل شوب</h1>
          <p>
            تصفح منتجات {c.name} في محل شوب. {page.products.length > 0 ? `${page.products.length}+ منتج` : 'منتجات'}{' '}
            بأسعار بالدينار الكويتي مع الدفع عند الاستلام والتوصيل السريع لجميع محافظات
            الكويت: {gov}.
          </p>
          <ul>
            {page.products.map((p) => (
              <li key={p.slug}>
                <a href={`/?p=${encodeURIComponent(p.slug)}`}>
                  {p.name} — {formatKwd(p.salePrice)} د.ك
                </a>
              </li>
            ))}
          </ul>
        </section>
      </>
    );
  }

  // ===== LANDING =====
  if (page.kind === 'landing') {
    return (
      <div className="sr-only">
        <h1>{page.title}</h1>
        <p>
          {page.title} — عرض خاص من محل شوب، متجر إلكتروني في الكويت. أسعار بالدينار
          الكويتي، دفع عند الاستلام، وتوصيل سريع لجميع المحافظات.
        </p>
        <a href="/">محل شوب — الصفحة الرئيسية</a>
      </div>
    );
  }

  // search results & admin — intentionally minimal (noindex in metadata)
  return null;
}
