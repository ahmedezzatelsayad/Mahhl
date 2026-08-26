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
