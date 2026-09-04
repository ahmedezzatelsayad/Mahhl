<div dir="rtl">

# محل شوب 🇰🇼 — منصة دروب شيبنج رقم 1 في الكويت

منصة تسويق بالعمولة (Affiliate) كاملة وجاهزة للإنتاج: نوفر **2,600+ منتج** بدراسة تسويقية لكل منتج، والمسوق يربح **عمولة من 1 إلى 10 د.ك** يختارها بمزاجه على كل طلب يوصَل — والمنصة تتكفل بالتخزين والشحن والتحصيل والمحاسبة. **لا بيع مباشر** — كل زائر مسوّق محتمل.

> 🏪 **الميزة القاتلة — المتجر المجاني:** كل مسوّق يقدر يفتح **متجره الإلكتروني الخاص ببلاش** خلال دقيقة — باسمه ولوجوه ولونه، برابط خاص (`/store/اسمه`) أو **سب دومين** أو حتى **دومينه الخاص**، يضيف منتجاتنا **بنقرة واحدة**، يحدد هامش ربحه فوق سعر المنصة، وزبائنه يطلبون أونلاين بالدفع عند الاستلام — والمنصة تشحن وتحاسب وعمولته تدخل محفظته تلقائياً.

</div>

---

## ✨ الميزات

| # | الميزة | التفاصيل |
|---|--------|----------|
| 1 | **المتجر المجاني (Killer Feature)** | متجر متعدد المستأجرين لكل مسوّق — هوية كاملة (اسم/لوجو/لون/واتساب)، تسعير حر فوق سعر المنصة، صفحة عامة سريعة `/store/[slug]`، طلب COD يدخل نظام العمولات تلقائياً، ودعم دومينات عبر middleware |
| 2 | **نظام العمولات والمحاسبة** | عمولة مقترحة 1–10 د.ك لكل منتج + حرية الاختيار، سجل قيود مالية كامل (earned/reversal/payout)، محفظة وسحوبات، إسناد طلبات عبر `?ref=CODE` بنافذة 30 يوم |
| 3 | **دراسة تسويقية لكل منتج** | سعر بيع مقترح بنهايات نفسية، مستوى الطلب (hot/warm/cold)، وأنسب قناة إعلانية (سناب/تيك توك/إنستا/واتساب) — لكل منتج من الـ2,638 |
| 4 | **مساعد المسوقين الذكي (AI-first)** | بوت يفهم اللهجة الكويتية ويرد طبيعياً (مش ردود محفوظة) — يعرف العمولات والمتاجر والكتالوج، ويغذى بسياق شخصي للمسوّق المسجّل ومنتجات حقيقية مطابقة |
| 5 | **بوابة كتالوج 200/2,600** | الزائر يتصفح أفضل 200 منتج من كل الأقسام، والتسجيل المجاني يفتح الكتالوج الكامل |
| 6 | **SEO + GEO كامل** | sitemap ديناميكي لكل الصفحات، JSON-LD، OpenGraph، `llms.txt`، geo tags للكويت، صفحات معلومات مفهرسة |
| 7 | **أدلة تسويقية** | دليل أفضل ممارسات الدعاية في الكويت + دليل الحملات والمواسم الكويتية (بالعامية) |
| 8 | **لوحة أدمن شاملة** | منتجات، طلبات، عمولات، سحوبات، مسوقين، سلايدر، SEO، AI، تقارير |
| 9 | **DevOps** | GitHub Actions CI (lint + build على كل push/PR)، headers أمنية OWASP، health check `/api/health` |

## 🧱 التقنيات

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + shadcn/ui — RTL أولاً + إنجليزي
- **Prisma 6** + **Neon PostgreSQL** (serverless pooler)
- **Zustand** لإدارة الحالة + SPA view-router مع URLs قابلة للفهرسة
- نشر على **Vercel**

## 🚀 التشغيل المحلي

```bash
# 1) انسخ متغيرات البيئة
cp .env.example .env   # ثم عبّي DATABASE_URL و DIRECT_URL من Neon

# 2) الثوتات + عميل Prisma
npm install

# 3) توليد عميل Prisma
npx prisma generate

# 4) شغّل
npm run dev            # http://localhost:3000
```

## 🏗️ البناء والنشر

```bash
npm run build          # بناء إنتاجي (Vercel-compatible)
npm start              # تشغيل نسخة الإنتاج محلياً
```

> ⚠️ **مهم لـ Vercel:** `output: "standalone"` **معطّل افتراضياً** — Vercel ما يدعمه (يسبب ENOENT في `next-server.js.nft.json`). للسيرفر الخاص فقط: `BUILD_STANDALONE=1 npm run build:standalone`

### النشر على Vercel
1. اربط الريبو بمشروع Vercel — أي push على `main` ينشر تلقائياً
2. أضف Environment Variables: `DATABASE_URL` (pooler) و `DIRECT_URL` (direct) و `NEXT_PUBLIC_SITE_URL`
3. Build command الافتراضي `npm run build` يشتغل بدون إعداد إضافي

### 🌐 دومينات المتاجر (الميزة القاتلة)

| النوع | الرابط | المتطلبات |
|-------|--------|-----------|
| مسار (شغال فوراً) | `yoursite.com/store/ahmed` | لا شيء — يعمل مباشرة |
| سب دومين | `ahmed.yourdomain.com` | أضف في Vercel: Domains → أضف `*.yourdomain.com` (wildcard) — الـ middleware يعيد التوجيه تلقائياً |
| دومين خاص بالمسوّق | `souq-ahmed.com` | المسوّق يسجل دومينه في «متجري»، ثم يضيفه في Vercel Domains، ويربط CNAME → `cname.vercel-dns.com` |

الـ middleware (`src/middleware.ts`) يحل المضيف تلقائياً: الموقع الرئيسي والمعاينات واللوكال يشتغلون عادي، وأي دومين خارجي يُعاد توجيهه لصفحة متجره (تحل من `customDomain` ثم من أول لابل للسب دومين).

## 🗂️ بنية المشروع

```
src/
├── app/
│   ├── page.tsx                  # الواجهة (SPA router بـ searchParams للـ SEO)
│   ├── store/[slug]/             # 🏪 المتجر العام للمسوقين (server + client)
│   ├── api/
│   │   ├── storefront/           # APIs المتاجر (me, me/products, [slug], [slug]/orders)
│   │   ├── ai/marketer/          # مساعد المسوقين (AI-first: DeepSeek → z-ai → fallback)
│   │   ├── affiliate/            # بوابة المسوقين (login/orders/commissions/withdrawals)
│   │   └── ...                   # products, orders, settings, sitemap, health
│   ├── sitemap.ts · robots.ts · manifest.ts · llms.txt
├── middleware.ts                 # 🌐 توجيه دومينات المتاجر
├── components/
│   ├── store/                    # واجهة المتجر (home, shop, product, footer, ...)
│   ├── affiliate/                # بوابة المسوقين (dashboard, متجري, طلباتي, ...)
│   └── admin/                    # لوحة الأدمن
├── lib/
│   ├── storefront.ts             # منطق المتاجر (تسعير/تحقق/روابط)
│   ├── create-order.ts           # مصدر واحد لإنشاء الطلبات (checkout/affiliate/storefront)
│   ├── commission.ts · catalog-gate.ts · seo.ts · deepseek.ts
└── prisma/schema.prisma          # Product, Order, Affiliate, CommissionEntry, Storefront, ...
scripts/                          # سكربتات الصيانة (commission, pricing, storefront)
```

## 🔑 واجهات API المهمة

| Endpoint | الوصف |
|----------|-------|
| `POST /api/storefront/me` | إنشاء/تحديث متجري (اسم، لوجو، دومين، هامش) — مصادقة مسوّق |
| `POST /api/storefront/me/products` | إضافة منتجات بنقرة واحدة |
| `GET /api/storefront/[slug]` | واجهة عامة: بيانات المتجر + منتجاته بأسعاره |
| `POST /api/storefront/[slug]/orders` | طلب زائر COD — تسعير server-side + إسناد تلقائي للمسوّق |
| `POST /api/ai/marketer` | المساعد الذكي (يفهم ثم يرد) |
| `GET /api/products` | الكتالوج مع بوابة 200/2,600 (Bearer يفتح الكل) |
| `GET /api/health` | فحص الصحة |

## 🛠️ سكربتات الصيانة

```bash
# إعادة ضبط العمولات (1–10 د.ك) بعد إضافة منتجات جديدة
node scripts/commission/apply-1-10.mjs

# إعادة تشغيل الدراسة التسويقية (سعر مقترح/طلب/قناة)
node scripts/pricing/study.mjs

# تحديث سلايدر الإنتاج بالصور
node scripts/storefront/update-slider-images.mjs

# اختبار E2E كامل لميزة المتاجر (يفتح متجر اختبار ويطلب وينظف)
node scripts/storefront/test-storefront.mjs
```

> كل السكربتات تحتاج: `export DATABASE_URL="$NEON_DATABASE_URL"`

## 🔒 الأمان

- تسعير الطلبات **server-side بالكامل** — الزائر لا يحدد أي سعر، ومحاولات التلاعب تُرفض
- حماية من البيع تحت سعر المنصة (للمسوّق نفسه)
- منع تكرار الطلبات (نافذة 90 ثانية) + حجز مخزون ذري ضد السباق
- توكنات مصادقة موقعة وتُتحقق من قاعدة البيانات كل طلب (التعليق فوري المفعول)
- Headers أمنية OWASP + `poweredByHeader: false`

---

<div dir="ltr">

### English Summary

**Mahal Shop** is Kuwait's production-ready dropshipping **platform** (not a direct-sale store): 2,600+ products each with a market study (suggested price, demand tier, best ad channel), commissions of **1–10 KWD freely chosen by the marketer**, transparent ledger & withdrawals, an **AI-first assistant** that understands Kuwaiti dialect, and the killer feature — every marketer gets a **free branded storefront** (`/store/slug`, subdomain or custom domain) with one-click product imports, custom margins, and COD orders that auto-credit the owner's wallet. Stack: Next.js 16, React 19, TypeScript, Tailwind v4, Prisma 6, Neon Postgres, deployed on Vercel with GitHub Actions CI.

</div>
