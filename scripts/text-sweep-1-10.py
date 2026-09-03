#!/usr/bin/env python3
"""
Task 11 text sweep: عمولات 1–2 → من 1 إلى 10 د.ك (المسوق حر يختار)
+ إزالة لغة «البيع المباشر» من النصوص العامة.
Each replacement asserts the expected number of hits — fails loudly if a
pattern drifts, so nothing silently skips.
"""
import sys

REPLACEMENTS = []  # (file, old, new, expected_count)

def R(file, old, new, count=1):
    REPLACEMENTS.append((file, old, new, count))

# ---------- site identity / header ----------
R('src/lib/site-identity.ts',
  "announcement: 'منصة دروب شيبنج رقم 1 في الكويت 🇰🇼 — سوّق واربح عمولة 1–2 د.ك على كل طلب',",
  "announcement: 'منصة دروب شيبنج رقم 1 في الكويت 🇰🇼 — عمولات مقترحة من 1 إلى 10 د.ك على كل منتج، وإنت تختار عمولتك',")

R('src/components/store/header.tsx',
  "announcement: 'منصة دروب شيبنج رقم 1 في الكويت 🇰🇼 — سوّق واربح عمولة 1–2 د.ك على كل طلب',",
  "announcement: 'منصة دروب شيبنج رقم 1 في الكويت 🇰🇼 — عمولات مقترحة من 1 إلى 10 د.ك على كل منتج، وإنت تختار عمولتك',")

# ---------- slider ----------
R('src/lib/slider-settings.ts',
  "highlight: 'عمولة 1–2 د.ك على كل طلب',",
  "highlight: 'عمولات مقترحة من 1 إلى 10 د.ك — إنت تختار',")
R('src/lib/slider-settings.ts',
  "highlightEn: '1–2 KWD commission per order',",
  "highlightEn: 'Suggested commissions 1–10 KWD — you pick your own',")
R('src/lib/slider-settings.ts',
  "chips: ['عمولة 1–2 د.ك', 'تسجيل مجاني', 'بدون رأس مال', 'COD'],",
  "chips: ['عمولات 1–10 د.ك', 'تسجيل مجاني', 'بدون رأس مال', 'بدون بيع مباشر'],")
R('src/lib/slider-settings.ts',
  "chipsEn: ['1–2 KWD commission', 'Free registration', 'Zero capital', 'COD'],",
  "chipsEn: ['1–10 KWD commissions', 'Free registration', 'Zero capital', 'Affiliate-only'],")

# ---------- seo.ts ----------
R('src/lib/seo.ts',
  "واربح عمولة من 1 إلى 2 د.ك على كل طلب يوصَل، بدون رأس مال وبدون هم الشحن. ولعملائنا: أسعار بالدينار الكويتي، توصيل سريع لجميع المحافظات، ودفع عند الاستلام.",
  "وكل منتج عليه عمولة مقترحة من 1 إلى 10 د.ك تختارها بمزاجك — بدون رأس مال وبدون هم الشحن، وطلبات عملائك توصلهم بتوصيل سريع لكل المحافظات مع الدفع عند الاستلام.")
R('src/lib/seo.ts',
  "'عمولات المسوقين 1–2 دينار على كل طلب',",
  "'عمولات المسوقين من 1 إلى 10 دينار',")
R('src/lib/seo.ts',
  "يتحسبلك عمولة من 1 إلى 2 د.ك حسب تنافسية المنتج، بدون رأس مال وبدون هم الشحن أو التحصيل.",
  "يتحسبلك عمولة تُضاف فوق سعر المنتج — المقترحة على كل منتج من 1 إلى 10 د.ك وإنت حر تختار عمولتك بمزاجك — بدون رأس مال وبدون هم الشحن أو التحصيل.")
R('src/lib/seo.ts',
  "أكثر من 2,600 منتج بعمولات 1–2 د.ك للمسوقين، وتسوق بالدينار الكويتي مع توصيل لكل المحافظات ودفع عند الاستلام.",
  "أكثر من 2,600 منتج بعمولات مقترحة من 1 إلى 10 د.ك للمسوقين — سجّل مجاناً وافتح الكتالوج الكامل واختر عمولتك بمزاجك.")
R('src/lib/seo.ts',
  "ودفع عند الاستلام، وعمولات المسوقين 1–2 د.ك على كل طلب مسلّم.",
  "ودفع عند الاستلام، وعمولات مسوّقين مقترحة من 1 إلى 10 د.ك تُضاف فوق سعر كل منتج.")
R('src/lib/seo.ts',
  "title: 'برنامج المسوقين — سوّق واربح عمولة 1–2 د.ك على كل طلب | محل شوب',",
  "title: 'برنامج المسوقين — سوّق واربح عمولة من 1 إلى 10 د.ك على كل منتج | محل شوب',")
R('src/lib/seo.ts',
  "عمولة 1–2 د.ك على كل طلب يوصَل، رابط إحالة خاص فيك،",
  "عمولة مقترحة من 1 إلى 10 د.ك على كل منتج — وإنت تختار، رابط إحالة خاص فيك,")

# ---------- affiliate views ----------
R('src/components/affiliate/affiliate-products-view.tsx',
  "كل منتج عليه عمولة من 1 إلى 2 د.ك حسب تنافسيته — شاركه برابطك الخاص أو ابيعه لعميلك وحط الطلب من «اضف طلب».",
  "كل منتج عليه عمولة مقترحة من 1 إلى 10 د.ك — وإنت حر تحط عمولتك بمزاجك فوق السعر. شاركه برابطك الخاص أو ابيعه لعميلك وحط الطلب من «اضف طلب».")
R('src/components/affiliate/affiliate-app.tsx',
  "نظام عمولات منصة دروب شيبنج — عمولتك محسوبة تلقائياً على كل طلب مسلّم (1–2 د.ك)",
  "نظام عمولات منصة دروب شيبنج — عمولتك محسوبة تلقائياً على كل طلب مسلّم (المقترحة من 1 إلى 10 د.ك حسب المنتج)")
R('src/components/affiliate/affiliate-dashboard-view.tsx',
  "— كل منتج في المنصة عليه عمولة من 1 إلى 2 د.ك",
  "— كل منتج في المنصة عليه عمولة مقترحة من 1 إلى 10 د.ك وإنت تختار")
R('src/components/affiliate/affiliate-login-view.tsx',
  "سوّق آلاف المنتجات واربح من 1 إلى 2 د.ك على كل طلب يوصَل — بدون رأس مال وبدون هم الشحن",
  "سوّق آلاف المنتجات واربح عمولة مقترحة من 1 إلى 10 د.ك على كل منتج — وإنت تختار عمولتك بمزاجك، بدون رأس مال وبدون هم الشحن")
R('src/components/affiliate/affiliate-login-view.tsx',
  "<div className=\"text-lg font-extrabold text-primary\">1–2 د.ك</div>",
  "<div className=\"text-lg font-extrabold text-primary\">1–10 د.ك</div>")
R('src/components/affiliate/affiliate-login-view.tsx',
  "بعد التسجيل تقدر تتصفح كل المنتجات وعمولاتها (1–2 د.ك) فوراً،",
  "بعد التسجيل تقدر تتصفح كل المنتجات وعمولاتها المقترحة (من 1 إلى 10 د.ك) فوراً،",)

# dashboard tier cards → range story
R('src/components/affiliate/affiliate-dashboard-view.tsx',
  """      {/* Commission tiers explainer */}
      <div>
        <h2 className="text-sm font-bold mb-2">🎯 شرائح العمولات — كل منتج عليه عمولة</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-3 flex items-center gap-3">
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">1.000 د.ك</Badge>
            <div className="text-xs text-muted-foreground">
              المنتجات الأكثر تنافسية — بتبيع نفسها بحجم كبير
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white">1.500 د.ك</Badge>
            <div className="text-xs text-muted-foreground">
              منتجات متوسطة الانتشار — توازن ممتاز بين السعر والعمولة
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <Badge className="bg-rose-600 hover:bg-rose-600 text-white">2.000 د.ك</Badge>
            <div className="text-xs text-muted-foreground">
              منتجات نيش وسعر أعلى — حافز أقوى لك لتنشرها
            </div>
          </Card>""",
  """      {/* Commission range explainer */}
      <div>
        <h2 className="text-sm font-bold mb-2">🎯 العمولة المقترحة على كل منتج — من 1 إلى 10 د.ك</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-3 flex items-center gap-3">
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">منتجات رخيصة</Badge>
            <div className="text-xs text-muted-foreground">
              عمولة مقترحة 1–3 د.ك — بتبيع بحجم كبير
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white">منتجات متوسطة</Badge>
            <div className="text-xs text-muted-foreground">
              عمولة مقترحة 2.5–5 د.ك — توازن بين السعر والهامش
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <Badge className="bg-rose-600 hover:bg-rose-600 text-white">منتجات غالية/نيش</Badge>
            <div className="text-xs text-muted-foreground">
              عمولة مقترحة 5–10 د.ك — هامش أكبر لكل طلب
            </div>
          </Card>""")

# ---------- chat API (legacy route kept as fallback client) ----------
R('src/app/api/ai/chat/route.ts',
  "commission 1–2 KWD per delivered order via \"Sell With Us\").",
  "suggested commissions 1–10 KWD per product — the marketer picks his own — via \"Sell With Us\"). The site does not sell directly.")
R('src/app/api/ai/chat/route.ts',
  "If asked about earning/dropshipping, explain the free marketer program (register from \"Sell With Us\", commission 1–2 KWD per delivered order).",
  "If asked about earning/dropshipping, explain the free marketer program (register from \"Sell With Us\", suggested commissions 1–10 KWD per product, marketer picks his own).")

# ---------- guides ----------
R('src/components/store/guide-ads.tsx',
  "ar: 'تذكر: عمولتك من 1 إلى 2 د.ك على كل طلب يوصَل تُحسب تلقائياً",
  "ar: 'تذكر: عمولتك المقترحة (من 1 إلى 10 د.ك على كل منتج — وإنت تختار) تُحسب تلقائياً")
R('src/components/store/guide-ads.tsx',
  "en: 'Remember: your 1–2 KWD commission per delivered order is automatic",
  "en: 'Remember: your suggested commission (1–10 KWD per product — you pick) is automatic")

# ---------- footer ----------
R('src/components/store/footer.tsx',
  "'Kuwait’s #1 dropshipping platform — market 2,600+ products and earn a 1–2 KWD commission on every delivered order, with zero capital and zero shipping hassle. For shoppers: competitive prices in KWD, fast delivery to every governorate, and cash on delivery.'",
  "'Kuwait’s #1 dropshipping platform — 2,600+ products ready to market with a suggested commission of 1–10 KWD per product, and you pick your own. Zero capital, zero inventory, zero shipping hassle: register free, share your link, and earn on every delivered order — your customers get fast delivery and cash on delivery.'")
R('src/components/store/footer.tsx',
  "'منصة دروب شيبنج رقم 1 في الكويت — سوّق أكثر من 2,600 منتج واربح عمولة من 1 إلى 2 د.ك على كل طلب يوصَل، بدون رأس مال وبدون هم الشحن. ولتسوق: أسعار تنافسية بالدينار الكويتي وتوصيل سريع لكل المحافظات ودفع عند الاستلام.'",
  "'منصة دروب شيبنج رقم 1 في الكويت — أكثر من 2,600 منتج جاهز للتسويق بعمولة مقترحة من 1 إلى 10 د.ك على كل منتج وإنت تختار عمولتك. بدون رأس مال وبدون مخزون وبدون هم الشحن: سجّل مجاناً وشارك رابطك واربح على كل طلب يوصَل — وعملاؤك يتوصلون لهم طلباتهم بسرعة مع الدفع عند الاستلام.'")
R('src/components/store/footer.tsx',
  "'Kuwait’s dropshipping platform. Prices in KWD, cash on delivery, delivery to all Kuwait governorates, marketer commissions 1–2 KWD per delivered order.'",
  "'Kuwait’s dropshipping platform — affiliate only (no direct sales). Suggested marketer commissions 1–10 KWD per product, delivery to all Kuwait governorates, cash on delivery.'")
R('src/components/store/footer.tsx',
  "'منصة دروب شيبنج في الكويت. الأسعار بالدينار الكويتي، الدفع عند الاستلام، توصيل لكل المحافظات، وعمولات المسوقين 1–2 د.ك على كل طلب مسلّم.'",
  "'منصة دروب شيبنج في الكويت — للتسويق بالعمولة فقط (لا بيع مباشر). عمولات مقترحة للمسوقين من 1 إلى 10 د.ك على كل منتج، توصيل لكل المحافظات، ودفع عند الاستلام.'")

# ---------- about page (info-view) ----------
R('src/components/store/info-view.tsx',
  """                <b>{brand.siteName}</b> is <b>Kuwait’s dropshipping platform</b>, built around two
                missions: helping marketers earn a real income without capital — <b>1–2 KWD
                commission on every delivered order</b> from 2,600+ ready-to-sell products we
                store, pack, ship and collect payment for — and giving shoppers a fast,
                effortless buying experience with clear prices in Kuwaiti Dinar and zero hidden
                fees.""",
  """                <b>{brand.siteName}</b> is <b>Kuwait’s affiliate-only dropshipping platform</b> —
                no direct sales. Our mission: helping marketers earn a real income without
                capital — <b>suggested commissions of 1–10 KWD per product, and you pick your
                own</b> — from 2,600+ ready-to-sell products we store, pack, ship and collect
                payment for. Browse the top-200 picks for free, register free to unlock the
                full catalog, share your link, and earn on every delivered order.""")
R('src/components/store/info-view.tsx',
  """                <b>{brand.siteName}</b> هي <b>منصة دروب شيبنج كويتية</b>، نبنيها على مهمتين: نعّن
                المسوّقين يربحون دخل حقيقي بدون رأس مال — <b>عمولة من 1 إلى 2 د.ك على كل طلب
                يوصَل</b> من أكثر من 2,600 منتج جاهز للبيع، وإحنا نتكفّل بالتخزين والتغليف
                والشحن وتحصيل الفلوس — ونعطي المتسوق تجربة شراء سريعة بأسعار واضحة
                بالدينار الكويتي وبدون أي رسوم خفية.""",
  """                <b>{brand.siteName}</b> هي <b>منصة دروب شيبنج كويتية للتسويق بالعمولة فقط — ما نبيع مباشرة</b>،
                مهمتنا نعّن المسوّقين يربحون دخل حقيقي بدون رأس مال — <b>عمولة مقترحة من 1 إلى 10 د.ك
                على كل منتج وإنت تختار عمولتك</b> — من أكثر من 2,600 منتج جاهز للبيع، وإحنا نتكفّل
                بالتخزين والتغليف والشحن وتحصيل الفلوس. تصفح أفضل 200 منتج مجاناً، سجّل مجاناً وافتح
                الكتالوج الكامل، شارك رابطك، واربح على كل طلب يوصَل.""")
R('src/components/store/info-view.tsx',
  "['1–2 KWD', 'commission per delivered order'],",
  "['1–10 KWD', 'suggested commission per product — you pick'],")
R('src/components/store/info-view.tsx',
  "['1–2 د.ك', 'عمولة على كل طلب يوصَل'],",
  "['1–10 د.ك', 'العمولة المقترحة على كل منتج — وإنت تختار'],")
R('src/components/store/info-view.tsx',
  "'Marketer commissions (1–2 KWD per delivered order) are calculated automatically in the marketer’s wallet and can be withdrawn from the marketers’ dashboard.'",
  "'Marketer commissions (suggested 1–10 KWD per product — the marketer picks his own) are calculated automatically in the marketer’s wallet and can be withdrawn from the marketers’ dashboard.'")
R('src/components/store/info-view.tsx',
  "'عمولات المسوّقين (1–2 د.ك على كل طلب مسلّم) تُحسب تلقائياً في محفظة المسوّق ويمكن سحبها من لوحة المسوقين.'",
  "'عمولات المسوّقين (المقترحة من 1 إلى 10 د.ك على كل منتج — والمسوق يختار عمولته) تُحسب تلقائياً في محفظة المسوّق ويمكن سحبها من لوحة المسوقين.'")
R('src/components/store/info-view.tsx',
  "'برنامج التسويق بالعمولة في محل شوب: تسوّق، شارك، واربح — عمولة من 1 إلى 2 د.ك على كل طلب يوصَل عبر رابطك الخاص. بدون رأس مال، بدون مخزون، وبدون هم الشحن أو تحصيل الفلوس — إحنا نتكفّل بكل شي وأنت تربح من تسويقك بس.'",
  "'برنامج التسويق بالعمولة في محل شوب: شارك، سوّق، واربح — عمولة مقترحة من 1 إلى 10 د.ك على كل منتج تختارها بمزاجك، وتتحسب على كل طلب يوصَل عبر رابطك الخاص. بدون رأس مال، بدون مخزون، وبدون هم الشحن أو تحصيل الفلوس — إحنا نتكفّل بكل شي وأنت تربح من تسويقك بس.'")
R('src/components/store/info-view.tsx',
  "'Mahal Shop’s affiliate program: share, promote, earn — a 1–2 KWD commission on every order delivered through your own link. No capital, no inventory, no shipping or payment hassle — we handle everything while you earn from your marketing.'",
  "'Mahal Shop’s affiliate program: share, promote, earn — a suggested commission of 1–10 KWD per product (you pick your own), credited on every order delivered through your own link. No capital, no inventory, no shipping or payment hassle — we handle everything while you earn from your marketing.'")
R('src/components/store/info-view.tsx',
  "شرائح العمولات — واضحة على كل منتج', 'Commission tiers — clear on every product",
  "العمولة المقترحة على كل منتج — من 1 إلى 10 د.ك', 'Suggested commission per product — 1 to 10 KWD")
R('src/components/store/info-view.tsx',
  """                ['1.000 د.ك', L(lang, 'المنتجات الأكثر تنافسية — الأسرع بيعاً بالكويت', 'The most competitive — fastest movers in Kuwait'), '1.000 KWD'],
                ['1.500 د.ك', L(lang, 'المنتجات متوسطة التنافسية — التوازن الأفضل', 'Medium competition — the best balance'), '1.500 KWD'],
                ['2.000 د.ك', L(lang, 'منتجات مميزة بمنافسة أقل — هامش أعلى لكل طلب', 'Distinctive, lower-competition items — higher margin per order'), '2.000 KWD'],""",
  """                ['1–3 د.ك', L(lang, 'منتجات اقتصادية — عمولة مقترحة منخفضة وحجم مبيعات كبير', 'Budget products — lower suggested commission, high volume'), '1–3 KWD'],
                ['2.5–5 د.ك', L(lang, 'منتجات متوسطة السعر — التوازن الأفضل بين السعر والهامش', 'Mid-price products — the best price/margin balance'), '2.5–5 KWD'],
                ['5–10 د.ك', L(lang, 'منتجات غالية أو نيش — أعلى هامش لكل طلب', 'Premium or niche items — the highest margin per order'), '5–10 KWD'],""")

# ---------- dropship section ----------
R('src/components/store/dropship-section.tsx',
  " * يشرح نموذج الربح للمسوقين: عمولة 1-2 د.ك على كل منتج حسب تن",
  " * يشرح نموذج الربح للمسوقين: عمولة مقترحة 1-10 د.ك على كل منتج حسب تن")
R('src/components/store/dropship-section.tsx',
  "desc: 'اختر من آلاف المنتجات (كل منتج عليه عمولة معروفة 1–2 ",
  "desc: 'اختر من آلاف المنتجات (كل منتج عليه عمولة مقترحة معروفة من 1 إلى 10 ")
R('src/components/store/dropship-section.tsx',
  "وكل منتج عليه <span className=\"font-bold text-amber-400\">عمولة من 1 إلى 2 د.ك</span> حسب\n              تنافسيته. أنت بس سوّق، وإحنا نشحن ونحاسب ونوصل الفلوس لحسابك.",
  "وكل منتج عليه <span className=\"font-bold text-amber-400\">عمولة مقترحة من 1 إلى 10 د.ك — وإنت تختار عمولتك</span> حسب\n              قيمته وتنافسيته. لا بيع مباشر من الموقع — أنت بس سوّق، وإحنا نشحن ونحاسب ونوصل الفلوس لحسابك.")

# ---------- manifest ----------
R('src/app/manifest.ts',
  "'منصة دروب شيبنج في الكويت: سوّق أكثر من 2600 منتج واربح عمولة 1–2 د.ك على كل طلب، وتسوق بتوصيل سريع ودفع عند الاستلام.',",
  "'منصة دروب شيبنج في الكويت: سوّق أكثر من 2600 منتج بعمولة مقترحة من 1 إلى 10 د.ك على كل منتج وإنت تختار عمولتك — توصيل سريع لكل المحافظات ودفع عند الاستلام.',")

# ---------- llms.txt ----------
R('src/app/llms.txt/route.ts',
  "جاهزين للتسويق بعمولة 1–2 د.ك للمسوّقين على كل طلب يوصَل — والمنصة تتكفل بالتخزين والشحن والتحصيل. للمتسوقين: جميع الأسعار بالدينار الكويتي (KWD)، الدفع عند الاستلام (COD)، وتوصيل لجميع محافظات الكويت",
  "جاهزين للتسويق بعمولة مقترحة من 1 إلى 10 د.ك للمسوّق (حر الاختيار) — المنصة للتسويق بالعمولة فقط ولا تبيع مباشرة، وتتكفل بالتخزين والشحن والتحصيل. طلبات عملاء المسوّقين تصلهم بتوصيل لجميع محافظات الكويت بالدينار الكويتي (KWD) مع الدفع عند الاستلام (COD)")
R('src/app/llms.txt/route.ts',
  "- النوع: منصة دروب شيبنج كويتية (تسويق بالعمولة + متجر إلكتروني)",
  "- النوع: منصة دروب شيبنج كويتية للتسويق بالعمولة فقط (لا بيع مباشر للمستهلك)")
R('src/app/llms.txt/route.ts',
  "- عمولات المسوّقين: من 1 إلى 2 د.ك لكل منتج حسب تنافسيته",
  "- عمولات المسوّقين: مقترحة من 1 إلى 10 د.ك لكل منتج حسب قيمته وتنافسيته — والمسوق حر يختار عمولته داخل النطاق")

# ---------- llms-full.txt ----------
R('src/app/llms-full.txt/route.ts',
  "كل منتج عليه عمولة مسوّق 1–2 د.ك ودراسة تسويقية",
  "كل منتج عليه عمولة مقترحة للمسوّق من 1 إلى 10 د.ك (حر الاختيار) ودراسة تسويقية")

# ---------- shop gate banner + i18n mkt welcome (check) ----------

def main():
    fail = 0
    for file, old, new, count in REPLACEMENTS:
        try:
            src = open(file, encoding='utf-8').read()
        except FileNotFoundError:
            print(f"❌ MISSING FILE: {file}")
            fail += 1
            continue
        n = src.count(old)
        if n != count:
            print(f"⚠️  {file}: expected {count} hit(s), found {n} for: {old[:70]!r}")
            fail += 1
            continue
        open(file, 'w', encoding='utf-8').write(src.replace(old, new))
        print(f"✅ {file}: replaced {count}")
    if fail:
        print(f"\n{fail} pattern(s) failed — fix and re-run")
        sys.exit(1)
    print("\nAll text replacements applied.")

main()
