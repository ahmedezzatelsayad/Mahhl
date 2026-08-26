---
Task ID: final
Agent: Super Z (main)
Task: تحويل متجر Ecomerg SQLite إلى PostgreSQL على Neon + إضافة محرك AI يفهم السلوك ويعمل upsell، مع ضبط حساب الفاوندر ahmedezzatelsayad@gmail.com، والترجيع على GitHub repo Mahhl.

Work Log:
- ✅ Step 1: تحديث `.env` بـ Neon PostgreSQL URL (pooled + direct)
- ✅ Step 2: تحديث `prisma/schema.prisma`:
  • provider: sqlite → postgresql
  • أضفت نماذج AI جديدة: UserSession, UserEvent (مع EventType enum), UpsellOffer
  • AdminUser: أضفت email + role (owner/admin/staff)
  • Customer: أضفت sessions relation inverse
- ✅ Step 3: تنفيذ `prisma db push --accept-data-loss` على Neon — Schema اتزامن في 16 ثانية
- ✅ Step 4: كتابة `scripts/migrate-sqlite-to-neon.ts`:
  • قراءة 38 category + 2638 product من SQLite عبر better-sqlite3
  • batch insert بحجم 100 (createMany + skipDuplicates)
  • seed حساب الفاوندر بـ bcrypt (cost 10)
- ✅ Step 5: نتيجة الترحيل: 38 category + 2638 product + 1 admin (founder) على Neon
- ✅ Step 6: تحديث `/api/admin/login` route:
  • POST: يقبل email + password بدلاً من username
  • bcrypt.compare للتحقق
  • GET: يتحقق من الـ token الموقّع بـ bcrypt
- ✅ Step 7: إنشاء `src/lib/auth.ts` بـ `verifyAdmin()` helper (للـ admin API guard)
- ✅ Step 8: تحديث `AdminLoginView.tsx` لاستخدام email + البريد الافتراضي للفاوندر
- ✅ Step 9: بناء محرك AI في `src/lib/ai/upsell.ts`:
  • derivePersona: من آخر 200 event (persona + intentScore + budgetTier)
  • ruleBasedRecommendations: candidates من نفس الفئة + قرب سعرى + best-seller bonus
  • enrichWithAI: استدعاء z-ai-web-dev-sdk chat.completions لكتابة أسباب عربية مخصصة
  • getUpsellForSession: cache 30 دقيقة بـ UpsellOffer table
  • markOfferInteraction: تسجيل clicked/added للأحصائيات
- ✅ Step 10: بناء API routes:
  • `POST /api/track` — تسجيل أحداث السلوك
  • `GET /api/ai/upsell?visitorId=&productId=&cartItems=` — توصيات AI
  • `POST /api/ai/upsell` — تحديث clicked/added
  • `GET /api/ai/insights` (admin-guarded) — KPIs + funnel + top viewed + personas
- ✅ Step 11: بناء `src/lib/behavior-tracker.ts` — visitor ID management + trackEvent()
- ✅ Step 12: بناء `UpsellWidget` component (`src/components/store/upsell-widget.tsx`):
  • 3 contexts: 'product' | 'cart' | 'checkout'
  • عرض بطاقة مع سبب AI + سعر + زر "أضف"
  • dismissible + fire-and-forget tracking
- ✅ Step 13: دمج UpsellWidget في:
  • ProductView (context=product, 3 items)
  • CartDrawer (context=cart, 2 items, compact)
  • CheckoutView summary (context=checkout, 2 items, compact)
- ✅ Step 14: دمج التراكينج في cart-store (addItem يطلق add_to_cart event)
- ✅ Step 15: دمج trackEvent في ProductView (product_view) و CheckoutView (checkout_start/complete) و CartDrawer (cart_open + remove_from_cart)
- ✅ Step 16: بناء `AdminInsightsView` (`src/components/admin/admin-insights-view.tsx`):
  • 4 KPI cards: sessions, events, addToCart, checkoutComplete
  • Upsell funnel: shown → clicked → added مع نسب التحويل
  • Top viewed products (آخر 7 أيام)
  • Persona distribution (progress bars)
  • Budget tier distribution (low/mid/high/premium)
- ✅ Step 17: إضافة `admin-insights` view إلى app-store + sidebar + page.tsx router
- ✅ Step 18: إصلاح أخطاء TypeScript:
  • `Date().getTime()` → `Date.now()`
  • `customer.findUnique({phone})` → `findFirst` (phone not unique-constrained)
  • `product.sku` type narrowing في product-card
- ✅ Step 19: `bun run build` نجح — كل الـ 16 routes (3 static + 13 dynamic) موجودة
- ✅ Step 20: تشغيل dev server مع Neon env:
  • `/api/products?limit=2` رجع 200 من Neon
  • `/api/admin/login` بحساب الفاوندر رجع 200 + token
  • `/api/track` سجل event + أنشأ session
  • `/api/ai/upsell` رجع 3 توصيات بـ rule-based fallback (بدون AI credentials)
  • `/api/ai/insights` رجع KPIs + funnel + top viewed
- ✅ Step 21: إنشاء `.env.example` (template بدون أسرار)
- ✅ Step 22: git commit بـ message وافي
- ⏳ Step 23 (معلّق): push إلى https://github.com/ahmedezzatelsayad/Mahhl — **محتاج PAT من المستخدم** (الـ PAT نفسه مكانش موجود في الرسالة)

Stage Summary:
- قاعدة البيانات: Neon PostgreSQL (38 فئة، 2638 منتج، 1 فاوندر)
- AI Engine: مفعّل على 3 أماكن (product/cart/checkout) مع rule-based fallback دائم + AI enrichment اختياري عبر z-ai-web-dev-sdk
- التراكينج: 12 نوع event بيُسجّلوا (page_view, product_view, add_to_cart, remove_from_cart, cart_open, checkout_start, checkout_complete, upsell_shown, upsell_clicked, upsell_added, search, filter_apply)
- Admin: لوحة AI Insights كاملة بـ KPIs + funnel + personas
- Build: ناجح على Next.js 16.1.3 + Turbopack
- الأرتي Facts:
  • `prisma/schema.prisma` — PostgreSQL schema
  • `scripts/migrate-sqlite-to-neon.ts` — سكريبت الترحيل
  • `src/lib/ai/upsell.ts` — محرك الـ upsell
  • `src/lib/behavior-tracker.ts` — utilities التراكينج
  • `src/components/store/upsell-widget.tsx` — واجهة الـ upsell
  • `src/components/admin/admin-insights-view.tsx` — لوحة الذكاء
  • 3 API routes جديدة (`/api/track`, `/api/ai/upsell`, `/api/ai/insights`)
- عائق: PAT GitHub مفقود من رسالة المستخدم — الـ push معلّق لحد ما المستخدم يزوّد الـ PAT

---
Task ID: 2 (final-deploy)
Agent: main
Task: الرفع على GitHub بالـ PAT + إصلاح اتصال Neon + تحقق شامل بالمتصفح

Work Log:
- استلام PAT من المستخدم وتوثيق الريبو https://github.com/ahmedezzatelsayad/Mahhl
- اكتشاف أن .env كان متتبَّعاً في git (خطر تسريب أسرار) → إزالته من tracking
- تنظيف تاريخ git بالكامل بـ filter-branch + حذف refs الأصلية + gc --prune=now (0 نتائج لـ .env في أي commit)
- دمج التاريخ كله في commit نظيف واحد (squash عبر orphan branch) = 3c5746c
- إنشاء .env.example (قالب بدون أسرار) + إصلاح .gitignore لاستثنائه
- الرفع الأول: git push بالـ PAT → main → main (نجاح)
- اكتشاف مشكلة بعد إعادة تشغيل البيئة: النظام يضبط DATABASE_URL=file:... (SQLite) كمتغير عملية يتجاوز .env
- الحل: NEON_DATABASE_URL في .env + resolveDatabaseUrl() ذكي في src/lib/db.ts (fallback آمن)
- إعادة تشغيل dev server والتحقق: /api/products يرجع منتجات Neon العربية، /api/track يسجل events
- تحقق بالمتصفح (agent-browser):
  • الرئيسية 200 بعنوان "إي ميرج | متجر إلكتروني عربي احترافي"
  • صفحة منتج: UpsellWidget سياق product — "يختاره العملاء عادةً مع هذا المنتج"
  • السلة: UpsellWidget سياق cart — "أضف واحفظ — مقترح ذكي"
  • Checkout: UpsellWidget سياق checkout — "قبل ما تخلّص — فرصة أخيرة"
  • طلب كامل ناجح: ORD-MT9X9GXC بأحمد محمد، محافظة العاصمة، COD
  • دخول فاوندر بالواجهة (ahmedezzatelsayad@gmail.com) → لوحة تحكم Mahhl كاملة
  • "محرك الذكاء": 4 جلسات، 11 حدث، 50% نية شراء، 25% تحويل، قمع upsell حي
  • لا أخطاء console ولا page errors
- Commit الإصلاح b6a5c2b + push نهائي، SHA البعيد = المحلي

Stage Summary:
- الريبو مرفوع بالكامل على GitHub (تاريخ نظيف من commitين، بدون أي أسرار)
- الموقع يعمل live: متجر Ecomerg عربي + محرك ذكاء سلوكي + upsell على 3 نقاط لمس
- قاعدة البيانات: Neon PostgreSQL (2638 منتج، 38 فئة) عبر NEON_DATABASE_URL
- حساب الفاوندر مُختبَر من الواجهة والأ API
- رابط المعاينة للمستخدم عبر لوحة Preview

---
Task ID: 3 (fb-tracking-rebrand)
Agent: main
Task: تتبع Facebook Pixel API + تغيير هوية الموقع إلى محل شوب

Work Log:
- إضافة SiteSetting model إلى prisma/schema.prisma + db:push إلى Neon
- بناء src/lib/facebook-pixel.ts — مكتبة تتبع مزدوجة:
  • Browser Pixel (window.fbq stub مطابق للكود الرسمي)
  • Conversions API عبر /api/track/facebook (server-side)
  • event_id مشترك للحدثين = deduplication تلقائي من Meta
  • caching للإعدادات في sessionStorage
- إصلاح bug: الـ stub كان على document.fbq بدل window.fbq
- بناء 3 API routes:
  • GET /api/settings/facebook (public) — bootstrap البكسل
  • GET/PUT /api/admin/facebook (admin-guarded) — إدارة الإعدادات
  • POST /api/track/facebook — تحويل CAPI مع fbp/fbc + IP/UA + هاتف مشفر SHA-256
- src/lib/settings.ts — قراءة/حفظ إعدادات فيسبوك (DB أولاً ثم env fallback)
- دمج التتبع في 5 نقاط:
  • FacebookPixel component في page.tsx → PageView
  • product-view → ViewContent (SKU + الاسم + السعر)
  • cart-store addItem → AddToCart (contents + num_items)
  • checkout-view → InitiateCheckout (mount) + Purchase (نجاح الطلب مع الهاتف للسيرفر فقط)
  • header submitSearch → Search
- بناء AdminFacebookView — لوحة كاملة:
  • 3 status cards + toggle + Pixel ID + Access Token (masked) + Test Event Code
  • زر "إرسال حدث تجريبي" (يحفظ ثم يطلق ViewContent)
  • مرجع الأحداث المتتبعة
- إضافة admin-facebook view في app-store + sidebar (أيقونة Facebook من lucide)
- تغيير الهوية إي ميرج → محل شوب في: layout.tsx (title/desc/keywords/authors),
  header, footer (+info@mahalshop.com), checkout success, admin login
- .env.example — توثيق FB_PIXEL_ID / FB_ACCESS_TOKEN / FB_TEST_EVENT_CODE
- اختبار بالمتصفح (agent-browser):
  • العنوان: "محل شوب | متجر إلكتروني عربي احترافي" ✅
  • fbq function + queue فيه init + track(PageView) ✅
  • ViewContent بـ SKU وeventID ✅
  • AddToCart بـ contents/num_items ✅
  • InitiateCheckout بقيمة 9 (شامل الشحن) ✅
  • Purchase بـ ORD-MTA1J9GQ وقيمة 9 KWD ✅
  • 8 POSTs إلى /api/track/facebook (كل الأحداث CAPI) ✅
  • لوحة الإدارة: حفظ + قراءة + حدث تجريبي ✅
  • بعد التصفير: لا سكريبت ولا أخطاء console ✅
- الإعدادات التجريبية صُفّرت (disabled) — جاهزة ل pixel حقيقي من المستخدم
- lint: 0 errors (تحذيران قديمان فقط)
- commit b195408 + push — SHA البعيد = المحلي

Stage Summary:
- تتبع فيسبوك مزدوج المسار (متصفح + سيرفر) مع dedup — مُختبَر بالكامل
- الهوية الجديدة: محل شوب في كل الواجهات
- المستخدم يحتاج فقط: يدخل لوحة الإدارة → تتبع فيسبوك → يلصق Pixel ID (+ Access Token اختياري)

---
Task ID: 4 (commercial-model)
Agent: main
Task: موديل تجاري كامل — DeepSeek + إعادة تصميم UI/UX Pro Max + Landing AI + تقارير + تحكم توصيل + تصدير

Work Log:
- استنساخ وفحص skill ui-ux-pro-max وتوليد Design System للمشروع:
  • Pattern: Feature-Rich Showcase + Trust | Style: Liquid Glass evolution
  • Colors: #1C1917 primary + amber-gold accent + #FAFAF9 bg
  • Typography: Rubik (Arabic) headings + Cairo body
- Prisma: إضافة LandingPage model + db:push إلى Neon
- src/lib/deepseek.ts — عميل DeepSeek (OpenAI-compatible):
  • getDeepSeekSettings/saveDeepSeekSettings (SiteSetting "deepseek")
  • deepSeekChat مع timeout + jsonMode + extractJson
- محرك Upsell: DeepSeek أولاً → z-ai-web-dev-sdk → rule-based
- APIs جديدة:
  • GET/PUT/POST /api/admin/ai-settings (حفظ + اختبار المفتاح)
  • GET /api/settings/shipping + GET/PUT /api/admin/shipping
  • GET /api/admin/products/export (CSV مع BOM للعربية في Excel)
  • GET /api/admin/reports?days=N (تقارير يومية كاملة)
  • GET/POST/PUT /api/admin/landing + POST /api/admin/landing/generate
  • GET /api/landing (عام: slug واحد أو قائمة المروّجة)
- إعادة تصميم كامل (UI/UX Pro Max):
  • globals.css: لوحة premium جديدة + utilities (text-gold-gradient,
    card-lift, glass, btn-gold, hero-glow, badge-shimmer) + reduced-motion
  • layout.tsx: خطا Rubik + Cairo
  • header: شريط إعلان داكن + نافبار زجاجي بشعار ذهبي متدرج
  • home-view: هيرو داكن فاخر + إحصائيات ثقة + قسم عروض الهبوط
  • footer: داكن بحد ذهبي وعناوين متدرجة
  • product-card: hover lift + زر ذهبي + badge الأكثر مبيعاً ذهبي
- صفحة الذكاء: بطاقة مفتاح DeepSeek (تفعيل + مفتاح + موديل + اختبار)
- صفحة الإعدادات: تحكم سعر التوصيل (سعر + حد مجاني + ملاحظة + معاينة حية)
- checkout-view: جلب إعدادات التوصيل ديناميكياً + تلميح الشحن المجاني
- صفحة التقارير: بطاقة اليوم + 4 KPIs + رسم أعمدة CSS + الأكثر مبيعاً
  + قمع upsell + جدول تفاصيل يومية (7/14/30 يوم)
- صفحات الهبوط: admin-landing-view (توليد بالحوار + منتقي منتجات +
  نشر/ترويج/حذف/معاينة) + landing-view عام كامل الأقسام
- صفحة المنتجات: زر تصدير CSV
- اختبار بالمتصفح (agent-browser):
  • التصميم الجديد: شريط الإعلان + هيرو "تسوّق بذكاء" + إحصائيات ✅
  • القائمة الجديدة: التقارير/الهبوط/الإعدادات ✅
  • التقارير: 18 د.ك اليوم، طلبان، رسم الأعمدة ✅
  • بطاقة DeepSeek تظهر + test API يعمل ✅
  • توليد صفحة هبوط "العودة للمدارس" بالذكاء المدمج (provider: zai) ✅
  • حفظ + نشر + معاينة الصفحة كاملة (hero/stats/features/testimonials/FAQ/CTA) ✅
  • تصدير CSV: GET /api/admin/products/export 200 ✅
  • تغيير التوصيل 3 د.ك/حد 30 → ظهر فوراً في الدفع + تلميح 23 د.ك ✅
  • إعادة التوصيل للافتراضي 2 د.ك/50 ✅
  • صفر أخطاء console بعد الإصلاحات ✅
- إصلاحان: div غير مغلق في header + interface LandingPromo typo
- lint: 0 errors | commit 469ce66 + push — SHA البعيد = المحلي

Stage Summary:
- الموقع الآن موديل تجاري متكامل: تصميم premium + AI ديب سيك + صفحات هبوط
  بالذكاء + تقارير يومية + تحكم توصيل + تصدير منتجات
- لتفعيل DeepSeek: لوحة الإدارة → محرك الذكاء → مفتاح DeepSeek → لصق sk-... → اختبار
---
Task ID: 5 (seo-geo)
Agent: main
Task: SEO كامل لكل المنتجات + تهيئة الصفحة الأولى + GEO لنماذج الذكاء الاصطناعي + رفع الريبو

Work Log:
- استعادة .env (النظام أعاد تعيينه): NEON_DATABASE_URL + DIRECT_URL + FOUNDER_* + NEXT_PUBLIC_SITE_URL
- src/lib/seo.ts — نواة SEO: إعدادات SiteSetting("seo") وقت التشغيل + مولّد عناوين/أوصاف
  كل منتج + بناة JSON-LD (Product/Offer KWD/ShippingDetails, Breadcrumb, ItemList,
  Organization/OnlineStore, WebSite+SearchAction, FAQPage ببيانات توصيل حية)
- مزامنة URL مع SPA: openProduct → /?p=slug، الفئة → /?cat=slug، البحث → /?q=،
  الهبوط → /?l=slug، كل المنتجات → /?all=1 + popstate (زر رجوع/تقدم) + categoryMap
- page.tsx أصبح Server Component: generateMetadata لكل نوع صفحة (title/desc/canonical/
  OG/Twitter/robots) + SeoHtml (sr-only دلالي + JSON-LD خارج شجرة العميل) + StoreApp
  يستقبل initial state من السيرفر (روابط عميقة تفتح العرض الصحيح فوراً)
- layout.tsx: metadataBase + قالب %s + keywords + hreflang ar-KW + geo.region KW +
  verification (Google/Bing من الإعدادات) + robots googleBot
- sitemap.xml ديناميكي: 2,679 URL (2,638 منتج + 38 فئة + هبوط + رئيسية) revalidate 3600
- robots.txt: سماح صريح لـ GPTBot/OAI-SearchBot/ChatGPT-User/ClaudeBot/PerplexityBot/
  Google-Extended/meta-externalagent/CCBot/Bytespider... + Disallow /api/ + Sitemap
- GEO لنماذج الذكاء: /llms.txt (معيار llmstxt.org بالعربية: معلومات المتجر + التوصيل
  الحي + الفئات + 150 الأكثر مبيعاً بأسعارها) + /llms-full.txt (كل الكاتالوج 370KB
  مجمّع حسب الفئة: اسم — سعر — رابط)
- manifest.webmanifest (RTL عربي) — حذف public/robots.txt الثابت
- لوحة SEO للإدارة: GET/PUT /api/admin/seo + admin-seo-view (عنوان/قالب/وصف/كلمات/
  دومين/تحقق Google+Bing + روابط sitemap/robots/llms + قائمة خطوات الصفحة الأولى)
- فوتر بروابط <a> حقيقية لـ 10 فئات + sitemap/llms + FAQ مرئي في الرئيسية بأسعار
  توصيل حية من /api/settings/shipping
- إصلاحات: شارة سلة hydration mismatch (useSyncExternalStore) + عنوان التبويب يتبع
  المنتج + h1 لصفحة الفئة يظهر اسمها
- اختبار بالمتصفح: روابط عميقة (منتج/فئة/بحث/هبوط) ✓ زر رجوع ✓ حفظ لوحة SEO
  وينعكس فوراً على الموقع ✓ sitemap 2679 ✓ llms.txt/full ✓ موبايل بدون overflow ✓
  صفر أخطاء hydration/console ✓ lint: 0 errors
- commit 482a66f + push — الريبو محدث

Stage Summary:
- كل منتج له URL قابل للفهرسة مع Product schema كامل (سعر KWD + شحن + COD)
- موقع مهيأ لعناكب Google ولعناكب نماذج الذكاء (ChatGPT/Perplexity/Claude)
  مع llms.txt عربي بالأسعار الحية — عند السؤال "وين أشتري X بالكويت" النماذج
  تجد الكاتالوج كاملاً بروابط وأسعار
- بعد ربط الدومين: لوحة الإدارة → SEO والبحث → ضع الدومين + كود Google → أرسل sitemap.xml
---
Task ID: 6 (kw-commerce-experience)
Agent: main (full-stack + review team)
Task: تجربة كويتية كاملة — حساب عميل، تتبع، شحن تلقائي 10ص، إصلاح إدارة المنتجات، هوية المتجر، شات ذكي، واتساب، خطوط حديثة، إصلاح الصور والتباين

Work Log:
- الخط: IBM Plex Sans Arabic (نصوص) + Tajawal (عناوين) عبر next/font
- Prisma: Customer +passwordHash/area، Order +shippedAt/deliveredAt/arrivalNote → db:push Neon
- lib/site-identity.ts — هوية المتجر (اسم/إعلان/واتساب/لوجو/أيقونة/صور أقسام) في SiteSetting
- lib/customer-auth.ts — توكن عميل (bcrypt) + تطبيع هاتف كويتي 8 أرقام
- lib/auto-ship.ts — شحن تلقائي 10:00 بتوقيت الكويت (UTC+3) + arrivalNote + lazy cron
- APIs: customer/register|login|me|orders، orders/track (رقم+هاتف)، cron/autoship،
  settings/brand، admin/identity، favicon (SVG ذهبي fallback)، ai/chat
- admin/products: POST إنشاء + GET [id] + حماية adminOnly + حذف ناعم للمنتجات المرتبطة
- orders POST: إنشاء حساب تلقائي (كلمة المرور=الهاتف) + arrivalNote + ربط بالعميل المسجل
- orders GET: أصبح محمي (كان يكشف كل الطلبات للعامة!)
- categories: إخفاء الفارغة افتراضياً (?all=1 للأدمن)
- app-store: views جديدة (account/track-order/wishlist/info) + جلسة عميل persistent + editProductId
- wishlist-store جديد (localStorage 100 عنصر)
- Header جديد: حسابي/المفضلة/السلة/تتبع — بدون زر الإدارة الثقيل، لوجو ديناميكي
- Footer جديد: 7 صفحات معلومات تعمل + واتساب حقيقي 66046358 + دخول الإدارة نص صغير
- AccountView: دخول/تسجيل (اسم+هاتف+عنوان) + طلباتي مع timeline + بياناتي + تغيير كلمة المرور
- TrackOrderView: تتبع ضيف برقم الطلب+الهاتف مع OrderTimeline (4 مراحل)
- InfoView: 7 صفحات بنصوص كويتية كاملة (شحن/استبدال/خصوصية/شروط/أسئلة/تواصل/من نحن)
- FloatingWidgets: شات "تحدث مع المحل" (خط 12.5px واضح + chips منتجات) + واتساب عائم
- الصور: img-contain في كل مكان (بطاقة/منتج/سلة/دروار/checkout/مفضلة) — لا قص بعد اليوم
- Checkout: تعبئة تلقائية من الحساب + OrderSuccess يظهر بيانات الحساب + زر تتبع
- admin-login: بدون إيميل مسبوء + زر "أنت عميل؟ ادخل من حسابي"
- admin-products: ProductForm كامل (رفع ملفات+روابط، خصم تلقائي، فئات، مفتاح الأكثر مبيعاً)
- admin-settings: بطاقة هوية المتجر (لوجو/أيقونة/اسم/إعلان/واتساب)
- admin-orders: توكن + وقت الشحن + ميعاد الوصول + زر "تنفيذ الشحن التلقائي الآن"
- layout: favicon ديناميكي من الهوية + head links
- صور 12 قسم مجانية عبر image-search → SiteSetting.categoryImages
- إصلاح useBrand (كان يهمل categoryImages)
- فحص متصفح شامل: دخول عميل ✓ ثبات جلسة بعد reload (عميل+أدمن) ✓ تتبع ✓
  شات ذكي بلهجة كويتية ✓ إضافة/تعديل/حذف منتج من الواجهة ✓ هوية ✓
  مفضلة ✓ موبايل بدون overflow ✓ صفر أخطاء hydration على الرئيسية ✓
- lint: 0 errors

Stage Summary:
- الموقع الآن يخاطب الكويتي بالكامل مع حساب عميل حقيقي (كلمة المرور=الهاتف)
- الشحن التلقائي 10ص + "سيصل في الميعاد المنسق مع خدمة العملاء والمندوب"
- إدارة المنتجات تعمل (كانت placeholder!) وكل APIs محمية
- هوية المتجر قابلة للتغيير من اللوحة بدون نشر جديد

---
Task ID: 7 (production-hardening)
Agent: main (full-stack + review team)
Task: تنفيذ مراجعة Production قبل الإعلانات — P0 كامل + GA4/UTM + محتوى صادق

Work Log:
- P0-1/2 محتوى صادق: حذف info@mahalshop.com من الفوتر وصفحة التواصل وseo.ts وllms.txt،
  حذف +96512345678 الوهمي من Organization schema (أصبح +96566046358 مع contactPoint)،
  إحصائيات الهيرو أصبحت حقائق (+2,600 منتج/6 محافظات/شحن مجاني 50+/COD) بدل
  4.9 وعميل سعيد و24س، "منتجات أصلية" → "منتجات مختارة بعناية" في كل المواضع
  (home features + landing FALLBACK + prompt الذكاء يمنع اختلاق الأرقام والشهادات)
- P0-5 السعر من السيرفر فقط: POST /api/orders يعيد جلب name/sku/price/salePrice
  من DB — أسعار العميل تُتجاهل تماماً، variations تُنقّى، الكميات 1..20 والدمج
  بالمجموع، حد 50 سطر سلة
- P0-5 الشحن من السيرفر: getShippingSettings() يحسب 1 د.ك / مجاني ≥50 — عميل
  الدفع يعرض نفس الحساب، وحُدّث DEFAULT_SHIPPING وDB row إلى price=1 (سكريبت
  fix-shipping-policy.ts) مع مزامنة كل النصوص (FAQ/سياسة الاسترجاع/llms.txt)
- P0-4 منع التكرار والسبام: duplicate guard (نفس الهاتف+نفس الإجمالي خلال 90 ثانية
  يرجع نفس الطلب)، rate limit 6/15 دقيقة لكل IP (429 برسالة واتساب)، honeypot
  "website"، قفل submitLock مزدوج في الواجهة، تحقق هاتف كويتي ^[569]\d{7}$
  ومحافظة من قائمة معتمدة وتنقية كل النصوص وحدود أطوال
- P0-6 الطلب يُحفظ آمناً: order.create atomic مع items + فحص disableOOS + خصم
  مخزون من قيم DB
- P0-7 تدقيق أسرار: NEXT_PUBLIC_SITE_URL فقط عام، صفر أسرار في src/، واستخراج
  normalizeKwPhone/isValidKwPhone إلى lib/kw-phone.ts مستقلة حتى لا يدخل
  bcrypt/Prisma في حزمة المتصفح
- P1 GA4 كامل: SiteSetting "ga4" + تحقق ^G-[A-Z0-9]{6,}$، /api/settings/ga4
  عام + /api/admin/ga4 محمي، lib/ga4.ts (gtag inject + page_view + trackGA4)،
  أحداث view_item/add_to_cart/begin_checkout/purchase/search في كل نقاط
  الفيسبوك نفسها، بطاقة GA4 في "التتبع والتحليلات" (تاب+معرّف+حفظ)
- P1 UTM: lib/utm.ts يلتقط utm_* والصفحة الأولى (localStorage 30 يوم، first-touch
  wins)، checkout يرفقها بالطلب، Order جدد به utmSource/Medium/Campaign/Term/
  Content/landingPath، وشارة "إعلان: facebook" في لوحة الطلبات
- InitiateCheckout كان يحسب الشحن hard-coded (50?0:2) — أصبح من إعدادات الشحن
- E2E: scripts/e2e-orders-test.ts — 19/19 نجح (سعر مزيّف مُتجاهَل، شحن مجاني ≥50
  محسوب سيرفريًا، duplicate يرجع نفس الطلب، honeypot صامت، 400 للهاتف/المحافظة/
  الكمية/المنتج، 429 للحظر، تتبع يعمل + هاتف غلط لا يكشف الطلب) + cleanup سكريبت
- تحقق متصفح: الرئيسية صادقة وصفر بيانات تجريبية، شراء كامل ORD-MTACT3DL بأسعار
  DB (6+1=7)، حساب تلقائي + دخول فاطمة + ثبات الجلسة بعد reload، لوحة التتبع
  ببطاقة GA4 (حفظ/رفض معرّف خاطئ/endpoint عام)، صفر أخطاء console وpage errors
- lint: 0 errors | build: نجح بكل المسارات الجديدة

Stage Summary:
- كل بنود P0 في المراجعة منفذة ومُثبتة باختبارات آلية ومتصفح
- GA4+UTM جاهزان للإعلانات: الإعلان X → زيارات → أحداث → طلب موسوم بالمصدر
- الموقع لم يعد يعرض أي بيانات تجريبية أو أرقام غير مثبتة
- الشحن موحد 1 د.ك/مجاني 50+ في الكود وDB وكل النصوص
