'use client';

/**
 * guide-campaigns.tsx — دليل الحملات والمواسم الكويتية للمسوقين.
 * تقويم مواسم الكويت + قوالب حملات جاهزة + نصوص إعلانية بالعامية.
 * (محتوى تثقيفي في مركز المسوقين — /?info=guide-campaigns)
 */
import type { Section } from '@/components/store/guide-renderer';

export const GUIDE_CAMPAIGNS_SECTIONS: Section[] = [
  {
    h: 'تقويم المواسم الكويتية — متى تبيع شنو؟',
    hEn: 'Kuwaiti season calendar — what to sell and when',
    blocks: [
      {
        type: 'p',
        ar: 'التوقيت في الكويت نصف البيع. في مواسم ينفتح فيها المحفظة على مصراعيها ومواسم هادئة — اللي يبيع المنتج الصح في الموسم الصح يوصل نتيجة ضعف المسوق اللي يبيع نفس المنتج في توقيت غلط. هذا تقويمك السنوي:',
        en: 'Timing is half the sale in Kuwait. Some seasons open wallets wide, others are quiet — selling the right product in the right season doubles your results. This is your yearly calendar:',
      },
      {
        type: 'table',
        head: ['الموسم', 'Season'],
        rows: [
          ['رمضان — ذروة المساء: أعلى تفاعل بين 9 مساءً و2 صباحاً. الأنسب: أدوات المطبخ، المنظمات، مستلزمات الإفطار والجلسات، عبايات ومشاحن. ابدأ الحملة من الأسبوع الثاني من شعبان.', 'Ramadan — night-time peak: highest engagement 9pm–2am. Best: kitchen tools, organizers, iftar items. Start campaigns mid-Sha’ban.'],
          ['عيد الفطر وعيد الأضحى — موسم الهدايا والزيارات: ألعاب أطفال، عطور ومباخر، هدايا عائلية، مستلزمات السفر للعيد. الميزانيات ترتفع والمنافسة أقوى — ابدأ مبكراً.', 'Both Eids — gifting and visiting season: kids’ toys, perfumes and incense, family gifts, travel gear. Budgets rise and competition peaks — start early.'],
          ['العودة للمدارس (أغسطس–سبتمبر) — موسم ثابت كل سنة: منظمات دراسة، أجهزة وحوامل، مستلزمات الطلاب والغداء المدرسي.', 'Back to school (Aug–Sep): study organizers, devices and holders, student supplies, lunch gear.'],
          ['اليوم الوطني والتحرير (25–26 فبراير) — حماس وطني وهدايا أعلام: مستلزمات الاحتفالات والإضاءة وأدوات السيارات للمسيرات.', 'National & Liberation Days (Feb 25–26): celebration supplies, lighting, car accessories for parades.'],
          ['الهلا نوفمبر — موسم الزفاف والعرائس: كل ما يخص البيت الجديد، المطبخ، المفروشات، الأجهزة الصغيرة. من أقوى مواسم الكهربائيات في السنة.', 'Hala November — wedding & new-home season: everything for new households, kitchens, furniture, small appliances.'],
          ['الجمعة البيضاء والسايبر (نوفمبر) — ذروة الشراء بالسنة كلها: كل المنتجات تنفع، والعروض القوية تنافس. جهّز إعلاناتك من أول نوفمبر.', 'White Friday & Cyber (November): the biggest buying peak of the year — everything sells; prepare creatives from early November.'],
          ['ديسمبر–يناير — الشتاء والمحلات: أجهزة التدفئة والتدليك، مستلزمات الشتاء، منتجات الراحة المنزلية.', 'Dec–Jan — winter: heaters, massage devices, winter supplies, home-comfort products.'],
        ],
      },
    ],
  },
  {
    h: 'قالب 1: حملة إطلاق منتج جديد (7 أيام)',
    hEn: 'Template 1: new-product launch campaign (7 days)',
    blocks: [
      {
        type: 'p',
        ar: 'الهدف: تحويل منتج جديد إلى مبيعات أولى خلال أسبوع بميزانية صغيرة (25–40 د.ك إجمالاً). قسّم الأسبوع كالتالي:',
        en: 'Goal: first sales within a week with a small budget (25–40 KWD total). Split the week as follows:',
      },
      {
        type: 'table',
        head: ['اليوم', 'Day'],
        rows: [
          ['اليوم 1–2: انشر 3 فيديوهات مختلفة لنفس المنتج بميزانية 3 د.ك لكل واحد. الهدف اختبار أي زاوية تجذب الجمهور — مش البيع.', 'Days 1–2: publish 3 different videos at 3 KWD each. Goal: test angles, not sell.'],
          ['اليوم 3: قف الإعلانات الضعيفة، وزوّد الرابح إلى 5 د.ك. ابدأ الرد على كل استفسارات واتساب والسناب خلال دقائق.', 'Day 3: kill weak ads, scale the winner to 5 KWD. Reply to every inquiry within minutes.'],
          ['اليوم 4–5: أضف إعلان إعادة استهداف لمن تفاعل وما طلب: «باقي الكمية — الدفع عند الاستلام».', 'Days 4–5: add a retargeting ad for engaged non-buyers: “Limited stock — COD available”.'],
          ['اليوم 6: اجمع أفضل لحظات الفيديو الرابح في فيديو جديد أطول شوي (15–20 ثانية) مع تقييمات حقيقية.', 'Day 6: cut the winning footage into a slightly longer 15–20s video with real reviews.'],
          ['اليوم 7: قيّم — إذا صار 5 طلبات أو أكثر كمّل نفس المنتج أسبوع ثاني؛ إذا أقل، بدّل منتج واستفد من الدروس.', 'Day 7: evaluate — 5+ orders means continue week two; less than that, switch products and apply lessons.'],
        ],
      },
    ],
  },
  {
    h: 'قالب 2: حملة موسمية (رمضان / الأعياد / الجمعة البيضاء)',
    hEn: 'Template 2: seasonal campaign (Ramadan / Eids / White Friday)',
    blocks: [
      {
        type: 'list',
        ar: [
          'قبل الموسم بأسبوعين: اختر 3 منتجات موسمية من المنصة وابنِ محتواها (صوّر، جهّز نصوص) — اللي يجهز أول يكون أول من يبيع.',
          'أول الموسم: شغّل حملاتك بميزانية أعلى من المعتاد (5–8 د.ك يومياً) — تكلفة الوصول ترتفع مع ذروة المنافسة، والبكير يوصل أرخص.',
          'وسط الموسم: ركّز 70% من الميزانية على المنتج الرابح، واعرض «عرض الموسم»: شحن مجاني أو سعر خاص لفترة محدودة.',
          'آخر أيام الموسم: عدّل الرسالة إلى «آخر فرصة / توصيل قبل العيد» — خوف الفوات هو أقوى محفز شراء في آخر الموسم.',
          'بعد الموسم: خفّض الميزانيات تدريجياً ووجّه نفس الجمهور لمنتجات المرحلة اللي بعدها (بعد رمضان → العيد، بعد العيد → المدارس).',
        ],
        en: [
          'Two weeks before the season: pick 3 seasonal products and build creatives early — early birds sell first.',
          'Season start: raise daily budgets (5–8 KWD) — reach costs spike with competition.',
          'Mid-season: concentrate 70% of budget on the winner with a seasonal offer (free shipping or limited price).',
          'Final days: switch messaging to “last chance / delivery before Eid” — urgency peaks.',
          'After the season: scale down and redirect the same audience to the next season’s products.',
        ],
      },
    ],
  },
  {
    h: 'نصوص إعلانية جاهزة — انسخ وعدّل اسم المنتج',
    hEn: 'Ready-made ad copy — copy and swap the product name',
    blocks: [
      {
        type: 'p',
        ar: 'هذي قوالب نصوص بالعامية الكويتية مجرّبة الأجواء — بدّل [المنتج] و[Sعر] وابدأ. الأفضل تجرب نصين مختلفين لنفس المنتج:',
        en: 'Kuwaiti-dialect copy templates — swap [product] and [price] and go. Test two variants per product:',
      },
      {
        type: 'list',
        ar: [
          'قالب المشكلة/الحل: «تعبانة من [المشكلة]؟ 😩 هذا [المنتج] بيحلها لك بكل سهولة… [السعر] د.ك بس والدفع عند الاستلام 🚚 اطلبين الحين قبل نفاد الكمية!»',
          'قالب العرض المباشر: «[المنتج] 🔥 وصل أخيراً للكويت — جودة عالية وسعر ما يلقى: [السعر] د.ك + توصيل لكل المحافظات + دفع عند الاستلام ✅ أرسل (طلب) واتساب الحين»',
          'قالب الإثبات الاجتماعي: «أكثر من [عدد] شخص طلبوا [المنتج] هالأسبوع 😍 وش السبب؟ لأنه فعلاً يشغل… جرّبه بنفسك: [السعر] د.ك والدفع عند الاستلام»',
          'قالب الندرة: «آخر [عدد] قطع متبقية من [المنتج] ⏳ اللي يوصل أول ما يطلب أول من يوصله — [السعر] د.ك بس، الدفع عند الاستلام»',
          'قالب الواتساب (بيع مباشر): «هلا حبيتي 👋 عندنا [المنتج] متوفر بالكويت — صورة المنتج تحت 👇 السعر [السعر] د.ك والتوصيل مجاني فوق 30 د.ك. تبين تحجزين وحدة؟ ردي بـ (نعم) ونحجزها لك»',
        ],
        en: [
          'Problem/solution: “Tired of [problem]? This [product] solves it easily… only [price] KWD, COD 🚚 Order now!”',
          'Direct offer: “[Product] 🔥 finally in Kuwait — high quality at [price] KWD + delivery everywhere + COD ✅ WhatsApp us ‘ORDER’”.',
          'Social proof: “[N] people ordered [product] this week 😍 Why? It actually works… try it: [price] KWD, COD.”',
          'Scarcity: “Only [N] pieces left ⏳ first come first served — [price] KWD, COD.”',
          'WhatsApp direct-sale: “Hi 👋 [product] available in Kuwait — photo below 👇 [price] KWD, free delivery over 30 KWD. Reply YES to reserve.”',
        ],
      },
    ],
  },
  {
    h: 'روتين المسوق الناجح — تشيك ليست يومية',
    hEn: 'The successful marketer’s daily checklist',
    blocks: [
      {
        type: 'list',
        ar: [
          'صباحاً (15 دقيقة): افتح لوحة المسوق واطلع على طلبات الأمس وعمولاتك — وحدّث أسعارك إذا صار خصم جديد على المنصة.',
          'ظهراً (20 دقيقة): صدّر محتوى اليوم — فيديو أو ستوري لمنتجك الأساسي، ورد على كل الرسائل المعلقة.',
          'مساءً (10 دقائق): راجع أرقام الإعلانات (مشاهدات، نقرات، رسائل) وسجّلها في ورقة متابعة بسيطة.',
          'أسبوعياً: اختبر منتج جديد واحد من قسم «الأكثر طلباً» في المنصة — اللي يختبر باستمرار يكتشف الرابح اللي يغير شهره كله.',
        ],
        en: [
          'Morning (15 min): check yesterday’s orders and commissions in your dashboard; sync prices with platform discounts.',
          'Noon (20 min): publish today’s content and answer all pending messages.',
          'Evening (10 min): review ad numbers (views, clicks, messages) and log them.',
          'Weekly: test one new product from the “most demanded” section — consistent testing finds your game-changer.',
        ],
      },
      {
        type: 'callout',
        ar: 'ابدأ الحين: سجّل مجاناً في بوابة المسوقين، اختر منتج من الأكثر طلباً، وشغّل أول حملة لك بنهاية اليوم — عمولة كل طلب يوصَل تتحسب تلقائياً لحسابك.',
        en: 'Start now: register free at the marketers’ portal, pick a top-demand product, and launch your first campaign today — every delivered order’s commission is credited automatically.',
      },
    ],
  },
];
