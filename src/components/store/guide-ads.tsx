'use client';

/**
 * guide-ads.tsx — أفضل ممارسات الدعاية والإعلانات في الكويت.
 * محتوى تثقيفي للمسوقين في مركز المسوقين (/?info=guide-ads).
 */
import type { Section } from '@/components/store/guide-renderer';

export const GUIDE_ADS_SECTIONS: Section[] = [
  {
    h: 'ليش الكويت سوق ذهبي للدروب شيبنج؟',
    hEn: 'Why Kuwait is a golden market for dropshipping',
    blocks: [
      {
        type: 'p',
        ar: 'الكويت من أعلى دول الخليج قوةً شرائية لنصيب الفرد، وجمهورها من أكثر الجماهير تفاعلاً مع الإعلانات الرقمية في المنطقة — أكثر من 90% من السكان يستخدمون السوشيال ميديا يومياً، ومتوسط الوقت على سناب شات وتيك توك من الأعلى عالمياً. هذا يعني أن منتجاً بسيطاً بعرض واضح ممكن يوصل لآلاف المشترين خلال أيام إذا أعلنت صح.',
        en: 'Kuwait has one of the highest per-capita purchasing powers in the Gulf and one of the most engaged social media audiences — over 90% of residents use social media daily, with world-class time spent on Snapchat and TikTok. A simple product with a clear offer can reach thousands of buyers within days.',
      },
      {
        type: 'p',
        ar: 'ميزة الكويت الثانية: حجم السوق معقول والدفع عند الاستلام هو طريقة الدفع المفضلة — يعني حاجز الثقة منخفض إذا قدمت العرض صح. وميزتنا كمنصة أنك ما تحتاج تشتري بضاعة ولا تخزن شي: اختر منتج، أعلن له، وإحنا نشحن ونحصّل ونحوّل عمولتك لحسابك.',
        en: 'Cash on delivery is the preferred payment method, which lowers the trust barrier when your offer is right. And as our platform handles storage, shipping and collection — you only pick a product and market it.',
      },
    ],
  },
  {
    h: 'القنوات الإعلانية في الكويت — إمتى تستخدم كل وحدة؟',
    hEn: 'Ad channels in Kuwait — when to use each',
    blocks: [
      {
        type: 'p',
        ar: 'كل قناة لها طبيعة جمهور مختلفة. القاعدة الذهبية: ابدأ بقناة واحدة وأتقنها قبل ما تشتت ميزانيتك. هذي خريطة القنوات حسب تجربة السوق الكويتي:',
        en: 'Each channel has a different audience. Golden rule: master one channel before splitting your budget. Here is the channel map based on the Kuwaiti market:',
      },
      {
        type: 'table',
        head: ['القناة', 'Channel'],
        rows: [
          ['سناب شات — الأقوى محلياً: وصول واسع للكويتيين، تكلفة مشاهدات منخفضة، مثالي للمنتجات العملية والمنزلية والمطبخ. ابدأ هنا إذا محتار.', 'Snapchat — the strongest local reach in Kuwait, low view costs, ideal for practical/home/kitchen products. Start here if unsure.'],
          ['تيك توك — صانع الفيروسات: أفضل قناة للإلكترونيات والألعاب والأدوات اللي لها «لقطة مبهرة». الفيديو الأول 3 ثواني يقرر مصير الإعلان.', 'TikTok — the viral maker: best for electronics, toys and visually striking gadgets. The first 3 seconds decide the ad.'],
          ['إنستقرام — معرض الجمال: الأفضل لمنتجات الصحة والجمال والرياضة ومشدات الجسم — محتوى قبل/بعد وصور ستايل شوبينج يعمل بشكل ممتاز.', 'Instagram — the beauty showroom: best for beauty, fitness and body-shaping products; before/after and lifestyle shots perform excellently.'],
          ['واتساب — قناة الثقة: الأنسب للمنتجات الطبية والمساج والمستلزمات الصحية. جهّز رسالة جاهزة وصور المنتج، ورد على العملاء بسرعة.', 'WhatsApp — the trust channel: ideal for medical, massage and health products. Prepare a ready message with product photos and reply fast.'],
          ['جوجل — نية الشراء: للمنتجات اللي الناس تدور عليها بالاسم (مكواة شعر، جهاز معين). تكلفة أعلى لكن زوّار جاهزين للشراء.', 'Google — purchase intent: for products people search by name (hair iron, a specific device). Higher cost but ready-to-buy visitors.'],
        ],
      },
      {
        type: 'callout',
        ar: 'قاعدة عملية: المنزل/المطبخ/الكهربائيات → سناب شات · إلكترونيات/ألعاب/سيارات → تيك توك · جمال/رياضة/مشدات → إنستقرام · طبية → واتساب. وهذه الحقوق معبّرة أيضاً عن تجربة السوق الكويتي.',
        en: 'Practical rule: home/kitchen → Snapchat · electronics/toys/cars → TikTok · beauty/fitness/shapewear → Instagram · medical → WhatsApp.',
      },
    ],
  },
  {
    h: 'القواعد السبع لإعلان يبيع في الكويت',
    hEn: 'The 7 rules of an ad that sells in Kuwait',
    blocks: [
      {
        type: 'list',
        ar: [
          'أول 3 ثواني = كل شي: ابدأ بالمنتج وهو يشتغل أو بالمشكلة اللي يحلها — لا مقدمات ولا لوجو. المشاهد يقرر الاستمرار أو التخطي في ثواني.',
          'اكتب بالعامية الكويتية: «وينك من ذاك الزمن؟» أقوى من الفصحى الجافة. الجمهور الكويتي يتفاعل مع اللي يشبه كلامه اليومي.',
          'أبرز الدفع عند الاستلام في أول مشهد نصي: هذي أقوى كلمة بيع في الكويت — ترفع نسبة التفاعل بشكل ملحوظ لأنها تشيل خوف الخداع.',
          'فيديو مش صورة: إعلانات الفيديو تتفوق على الصور الثابتة في معظم الحالات. صوّر المنتج بجوالك بإضاءة طبيعية — المصداقية أهم من الإخراج.',
          'CTA واحد واضح: «اطلب الحين — دفع عند الاستلام» أو «أرسل كلمة (طلب) واتساب». طلبين في إعلان واحد = صفر طلبات.',
          'أثبت اجتماعي: «منتج مطلوب في الكويت» + رقم مبيعات أو تقييمات حقيقية إذا توفرت — الناس تشتري اللي غيرها اشترى.',
          'اختبر دائماً: نفس المنتج بفيديوهين مختلفين أو عرضين مختلفين (خصم مقابل شحن مجاني) — خل الإعلانات نفسها تقرر لك الأفضل.',
        ],
        en: [
          'First 3 seconds = everything: open with the product in action or the problem it solves — no intros, no logos.',
          'Write in Kuwaiti dialect: local slang outperforms formal Arabic.',
          'Show "Cash on Delivery" in the first text scene — the strongest selling phrase in Kuwait.',
          'Video beats static images. Film on your phone with natural light — authenticity wins.',
          'One clear CTA: "Order now — COD" or "WhatsApp us the word ORDER". Two CTAs = zero orders.',
          'Social proof: "in demand in Kuwait" + real ratings/sales numbers when available.',
          'Always A/B test: two videos or two offers (discount vs free shipping) and let data decide.',
        ],
      },
    ],
  },
  {
    h: 'الميزانية — شلون تصرف فلوسك بذكاء؟',
    hEn: 'Budget — how to spend smart',
    blocks: [
      {
        type: 'p',
        ar: 'لا تحتاج رأس مال كبير للبداية. ابدأ بـ 3 إلى 5 دنانير يومياً لكل إعلان تجريبي، وشغّل 2–3 إعلانات مختلفة لنفس المنتج في نفس الوقت. بعد 48 ساعة قيّم: اللي جاب تفاعل رخيص زوّد ميزانيته تدريجياً (20–30% كل يوم)، واللي ضاع منه الفلوس أوقفه بدون وجع قلب.',
        en: 'You do not need big capital. Start with 3–5 KWD daily per test ad and run 2–3 variations of the same product. After 48 hours, scale the cheap-engagement winner by 20–30% daily and kill the losers without hesitation.',
      },
      {
        type: 'table',
        head: ['القاعدة', 'Rule'],
        rows: [
          ['70/20/10 — صرّف 70% من الميزانية على الإعلان الرابح، 20% على تحسينه، و10% على تجربة منتجات/إعلانات جديدة كل أسبوع.', '70/20/10 — spend 70% on your winning ad, 20% on optimizing it, 10% on new weekly experiments.'],
          ['قاعدة الإيقاف: إذا بعد 1,000 مشاهدة ما صار نقرة ولا رسالة — أوقف الإعلان، المشكلة بالفيديو أو بالعرض مش بالميزانية.', 'Kill rule: after 1,000 views with zero clicks or messages — stop the ad; the problem is the video or offer, not the budget.'],
          ['لا تزيد الميزانية أكثر من 30% باليوم الواحد على إعلان شغال — الزيادة المفاجئة تخرج الخوارزمية من وضع التعلم وتخرب الأداء.', 'Never scale a working ad by more than 30% per day — sudden jumps reset the learning phase.'],
          ['خصص 20–30% من ميزانيتك لإعادة الاستهداف: اللي تفاعل وما اشترى — ذكّرهم بالإعلان مرة ثانية، هذي أرخص مبيعاتك.', 'Reserve 20–30% of budget for retargeting engaged non-buyers — the cheapest sales you will get.'],
        ],
      },
    ],
  },
  {
    h: 'أرقام واقعية تتوقعها في السوق الكويتي',
    hEn: 'Realistic benchmarks for the Kuwaiti market',
    blocks: [
      {
        type: 'p',
        ar: 'هذي أرقام تقديرية استرشادية من سلوك السوق — تختلف حسب المنتج والقناة، لكنها تعطيك مؤشر أداء صحي: إذا كنت أعلى منها فأنت على الطريق الصح، وإذا أقل راجع الفيديو والعرض.',
        en: 'Estimated benchmarks from market behavior — they vary by product and channel, but they give you a healthy compass.',
      },
      {
        type: 'table',
        head: ['المؤشر', 'Metric'],
        rows: [
          ['تكلفة الألف مشاهدة (CPM): 1.5 – 4 د.ك في سناب شات وتيك توك.', 'CPM: 1.5–4 KWD on Snapchat and TikTok.'],
          ['نسبة النقر (CTR): 1% مقبولة، 2%+ ممتازة — أقل من 1% غيّر الفيديو.', 'CTR: 1% is okay, 2%+ is excellent — below 1% change the creative.'],
          ['معدل التحويل من رسالة/زيارة إلى طلب: 5–15% في واتساب، 1–3% من إعلان مباشر للصفحة.', 'Conversion to order: 5–15% on WhatsApp flows, 1–3% direct from ads.'],
          ['العائد على الإنفاق (ROAS): استهدف 2× فوق تكلفة المنتج — وعمولتنا المقترحة (1–10 د.ك) للمنتج تجعل نقطة التعادل سريعة.', 'ROAS: target 2× over product cost — and our suggested 1–10 KWD commission per product lowers your break-even point.'],
        ],
      },
      {
        type: 'callout',
        ar: 'تذكر: عمولتك المقترحة (من 1 إلى 10 د.ك على كل منتج — وإنت تختار) تُحسب تلقائياً — يعني كل تحسين صغير في تكلفة الإعلان ينعكس مباشرة على ربحك الصافي.',
        en: 'Remember: your suggested commission (1–10 KWD per product — you pick) is automatic — every small improvement in ad cost goes straight to your net profit.',
      },
    ],
  },
  {
    h: 'الأخطاء السبعة اللي تحرق ميزانية المسوق المبتدئ',
    hEn: 'The 7 mistakes that burn a beginner’s budget',
    blocks: [
      {
        type: 'list',
        ar: [
          'الانتشار بين 5 منتجات في نفس الأسبوع — ركّز على منتج واحد لين تتقن سوقه.',
          'التوقف عن الإعلان في أول يوم ضعيف — الخوارزمية تحتاج 48–72 ساعة تتعلم جمهورك.',
          'نسخ إعلان منافس حرفياً — الجمهور شافه قبلك، وتميّزك هو اللي يبيع.',
          'إخفاء سعر المنتج — الشفافية ترفع جودة العملاء اللي يوصلك وتقلل الرد المجهول.',
          'تجاهل الرد السريع على واتساب — العميل في الكويت ينتظر دقائق، مش ساعات.',
          'الإنفاق كله على قناة واحدة بدون اختبار — جمهورك مو بالضرورة وين أنت تحب تنشر.',
          'عدم تتبع الأرقام — من ما يعرف تكلفة طلبه ما يقدر يطور ربحه. سجّل أرقامك يومياً.',
        ],
        en: [
          'Spreading across 5 products in one week — master one product first.',
          'Stopping the ad after one weak day — algorithms need 48–72 hours to learn.',
          'Copying a competitor’s ad word for word — the audience already saw it.',
          'Hiding the product price — transparency brings better customers.',
          'Slow WhatsApp replies — Kuwaiti customers expect minutes, not hours.',
          'Spending on one channel only — test before you commit.',
          'Not tracking numbers — you cannot improve what you do not measure.',
        ],
      },
    ],
  },
];
