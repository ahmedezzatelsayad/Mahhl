import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deepSeekChat } from '@/lib/deepseek';
import { formatKwdPlain } from '@/lib/utils/format';
import { verifyAffiliate } from '@/lib/affiliate-auth';
import { affiliateBuckets } from '@/lib/commission';

export const maxDuration = 60;

interface MktProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  commission: number;
  suggestedPrice: number | null;
  demandTier: string | null;
  adChannel: string | null;
  categoryName: string | null;
}

interface MktLink {
  label: string;
  action: 'guide-ads' | 'guide-campaigns' | 'affiliate-products' | 'affiliate-commissions';
}

const CHANNEL_AR: Record<string, string> = {
  snapchat: 'سناب شات',
  tiktok: 'تيك توك',
  instagram: 'إنستقرام',
  whatsapp: 'واتساب',
};

const DEMAND_AR: Record<string, string> = {
  hot: '🔥 طلب مرتفع',
  warm: '⚖️ طلب متوسط',
  cold: '💎 منتج تميّز',
};

function chip(p: {
  id: string; slug: string; name: string; salePrice: number; thumb?: string | null; images?: string | null;
  commission: number; suggestedPrice: number | null; demandTier: string | null; adChannel: string | null;
  category?: { name: string } | null;
}): MktProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.salePrice,
    image: p.thumb || (p.images ? p.images.split(',')[0] : null),
    commission: p.commission,
    suggestedPrice: p.suggestedPrice,
    demandTier: p.demandTier,
    adChannel: p.adChannel,
    categoryName: p.category?.name ?? null,
  };
}

const SELECT = {
  id: true, slug: true, name: true, salePrice: true, thumb: true, images: true,
  commission: true, suggestedPrice: true, demandTier: true, adChannel: true,
  category: { select: { name: true } },
} as const;

/**
 * POST /api/ai/marketer — «مساعد المسوقين» الذكي.
 * خبير تسويق رقمي داخل المنصة: يرشّح لك منتجات (عمولة + سعر مقترح + قناة)،
 * يجاوب على العمولات والمحفظة والسحب، ويعطي خطة دعاية مختصرة بسوق الكويت.
 * AI: DeepSeek → z-ai sdk → rule-based fallback (لا يفشل أبداً).
 */
export async function POST(req: NextRequest) {
  let lang: 'ar' | 'en' = 'ar';
  try {
    const body = await req.json();
    lang = body.lang === 'en' ? 'en' : 'ar';
    const history: { role: string; content: string }[] = Array.isArray(body.messages)
      ? body.messages.slice(-8)
      : [];
    const q = ([...history].reverse().find((m) => m.role === 'user')?.content || '').trim();

    // ===== personal context (optional — يعمل أيضاً للزائر من بوابة المسوقين) =====
    const aff = await verifyAffiliate(req);
    let personal = '';
    if (aff) {
      const b = await affiliateBuckets(aff.id);
      personal = lang === 'en'
        ? `\nThe asker is a REGISTERED MARKETER: ${aff.name} (code ${aff.code}). Wallet: available ${formatKwdPlain(b.available)} KWD, in delivery pipeline ${formatKwdPlain(b.expected)} KWD, lifetime earned ${formatKwdPlain(b.paid + b.expected + b.available)} KWD. Referral link: /?ref=${aff.code}`
        : `\nاللي يسأل مسوّق مسجّل: ${aff.name} (كوده ${aff.code}). محفظته: المتاح ${formatKwdPlain(b.available)} د.ك، قيد التحصيل ${formatKwdPlain(b.expected)} د.ك، إجمالي أرباحه ${formatKwdPlain(b.paid + b.expected + b.available)} د.ك. رابط الإحالة: /?ref=${aff.code}`;
    }

    // ===== product search / recommendations =====
    const isRecommend = /شنو\s*أبيع|ايش\s*أبيع|أفضل منتج|افضل منتج|best product|best seller|الترند|ترند|أكثر طلب|الاكثر طلب|وين أبدأ|وين البداية|what.*sell|recommend/i.test(q);
    const tokens = q.split(/\s+/).filter((t) => t.length > 2).slice(0, 4);

    let products: MktProduct[] = [];
    if (isRecommend) {
      const recs = await db.product.findMany({
        where: { disableOOS: false, demandTier: 'hot' },
        orderBy: [{ soldCount: 'desc' }, { demandRank: { sort: 'asc', nulls: 'last' } }],
        take: 8,
        select: SELECT,
      });
      products = recs.map(chip);
    } else if (tokens.length) {
      const found = await db.product.findMany({
        where: {
          OR: tokens.flatMap((t) => [
            { name: { contains: t } },
            { nameEn: { contains: t } },
            { keywords: { contains: t } },
            { description: { contains: t } },
          ]),
        },
        take: 6,
        orderBy: [{ isBestSeller: 'desc' }, { soldCount: 'desc' }],
        select: SELECT,
      });
      products = found.map(chip);
    }

    // ===== rule-based intents (بلغة الكويت — فورية وبدون انتظار AI) =====
    const AR = lang !== 'en';
    const catalog = products
      .map((p) => {
        const d = p.demandTier ? (AR ? DEMAND_AR[p.demandTier] || p.demandTier : p.demandTier) : '';
        const ch = p.adChannel ? (AR ? CHANNEL_AR[p.adChannel] || p.adChannel : p.adChannel) : '';
        const s = p.suggestedPrice ? `${AR ? 'سعر بيع مقترح' : 'suggested price'} ${formatKwdPlain(p.suggestedPrice)} د.ك` : '';
        return `- ${p.name} — ${formatKwdPlain(p.price)} د.ك | ${AR ? 'عمولتك' : 'your commission'} ${formatKwdPlain(p.commission)} د.ك${s ? ` | ${s}` : ''}${d ? ` | ${d}` : ''}${ch ? ` | ${ch}` : ''}`;
      })
      .join('\n');

    const links: MktLink[] = [];
    let reply = '';

    if (!q) {
      reply = AR
        ? 'هلا بيك! أنا مساعدك الذكي للدروب شيبنج 🤝\nأقدر أرشح لك المنتجات الأكثر طلباً، أجاوبك عن العمولات والمحفظة، وأعطيك خطة دعاية سريعة لسوق الكويت.\nشنو تبغى تعرف اليوم؟'
        : 'Welcome! I\'m your dropshipping assistant 🤝\nI can recommend hot products, explain commissions & wallet, and give you a quick Kuwait ads plan.\nWhat do you want to know today?';
    } else if (/عمول|كم.*ربح|كيف.*ربح|ارباح|شلون.*ربح/i.test(q) && !/سحب|استلام|محفظ/i.test(q)) {
      reply = AR
        ? 'العمولة عندنا مفتوحة وواضحة على كل منتج 💰\n• المنتجات الأكثر تنافسية: عمولة 1.000 د.ك\n• المتوسطة: 1.500 د.ك\n• المميزة وذات المنافسة الأقل: 2.000 د.ك\nكل منتج في الكتالوج مكتوب عليه عمولتك بالضبط — تتحسب تلقائياً لما يوصَل الطلب عبر رابطك، وتطلب سحبها من محفظتك متى ما تبى.'
        : 'Commissions are open and clear on every product 💰\n• Most competitive: 1.000 KWD\n• Medium: 1.500 KWD\n• Niche items: 2.000 KWD\nEvery product shows your exact commission — credited when the order is delivered through your link, withdrawable anytime.';
      if (personal) reply += '\n' + personal.trim();
      links.push({ label: AR ? 'شوف الكتالوج والعمولات' : 'Browse catalog & commissions', action: 'affiliate-products' });
    } else if (/سحب|اسحب|أستلم|استلم|محفظة|محفظتي|متى.*فلوس|withdraw|payout/i.test(q)) {
      reply = AR
        ? 'المحفظة والمحاسبة شفافة 100% 📊\nعمولتك تتحسب لحظة تسليم كل طلب، وتشوف رصيدك (المتاح وقيد التحصيل) في تبويب «عمولاتي والسحب». تطلب السحب من نفس الصفحة وتختار وسيلة الدفع — وطلب السحب يوصل الإدارة ويرد عليك بأسرع وقت. ما فيه حد أدنى معقد ولا رسوم خفية.'
        : 'Your wallet is 100% transparent 📊\nCommission is credited on delivery, visible in "Commissions & Withdrawals". Request a payout from the same tab and pick your method — the team processes it quickly. No hidden fees.';
      links.push({ label: AR ? 'عمولاتي والسحب' : 'Commissions & withdrawals', action: 'affiliate-commissions' });
    } else if (/رابط|كود|ref|share|شارك|انسب|يحسب.*لي/i.test(q)) {
      reply = AR
        ? 'كل مسوّق عنده كود ورابط خاص 🖇️\nتفتح أي منتج، تضغط «انسخ رابط التسويق»، ويتولد لك رابط فيه ?ref=كودك — أي زائر يفتح رابطك ويطلب خلال 30 يوم يتحسب الطلب لك تلقائياً. روّج الرابط في سناب وتيك توك وإنستا وحتى ستوريات واتساب.'
        : 'Every marketer gets a unique code & link 🖇️\nOpen any product, copy the marketing link with ?ref=YOURCODE — anyone who orders within 30 days of clicking counts for you automatically. Share it on Snapchat, TikTok, Instagram and WhatsApp stories.';
      links.push({ label: AR ? 'المنتجات والروابط' : 'Products & links', action: 'affiliate-products' });
    } else if (/حملة|دعاية|دعايه|إعلان|اعلان|اعلانات|سناب|تيك|انستا|إنستا|خطة|ads|campaign|snapchat|tiktok|instagram/i.test(q)) {
      reply = AR
        ? 'خلاصة الدعاية بالكويت 🎯\n1) سناب شات هو الملك محلياً — ابدأ فيه بميزانية يومية صغيرة (2–3 د.ك) وصلّص على الفيديو القصير.\n2) تيك توك أرخص CPM — مثالي للمنتجات الوظيفية اللي تشتغل قدام الكاميرا.\n3) إنستقرام للجمال والأشياء اللي تبان "فخمة".\nقاعدة الميزانية 70/20/10: 70% على اللي يثبت نجاحه، 20% تجارب، 10% سوايب جريئة. ووقف أي إعلان بعد 1,000 مشاهدة بدون تفاعل.'
        : 'Kuwait ads in a nutshell 🎯\n1) Snapchat is king locally — start small (2–3 KWD/day) with short video.\n2) TikTok has the cheapest CPM — great for demo-driven products.\n3) Instagram suits beauty & premium-looking items.\nBudget rule 70/20/10: 70% proven winners, 20% tests, 10% bold bets. Kill any ad with no engagement after 1,000 views.';
      links.push({ label: AR ? 'دليل الدعاية الكامل 📣' : 'Full advertising guide 📣', action: 'guide-ads' });
      links.push({ label: AR ? 'دليل الحملات والمواسم 📅' : 'Campaigns & seasons guide 📅', action: 'guide-campaigns' });
    } else if (/رمضان|عيد|موسم|مواسم|وطني|هلا|نوفمبر|جمعة|مدارس|شتاء/i.test(q)) {
      reply = AR
        ? 'المواسم الكويتية منجم ذهب 💡\n• رمضان والأعياد: كل شي مرتبط بالبيت والضيافة يبيع.\n• العودة للمدارس (أغسطس/سبتمبر): مستلزمات الأطفال.\n• اليوم الوطني 25-26 فبراير: إكسسوارات وعروض كويتية.\n• الهلا نوفمبر + الجمعة البيضاء: أقوى أسبوعين مبيعات بالسنة — جهّز حملتك قبلها بأسبوعين.'
        : 'Kuwaiti seasons are gold 💡\n• Ramadan & Eid: home & hospitality items fly.\n• Back to school (Aug/Sep): kids\' supplies.\n• National Days (Feb 25–26): accessories & patriotic offers.\n• Hala November + White Friday: the two strongest sales weeks — prepare 2 weeks ahead.';
      links.push({ label: AR ? 'تقويم المواسم الكامل 📅' : 'Full seasons calendar 📅', action: 'guide-campaigns' });
    }

    // ===== AI (يغطي أي سؤال خارج القوائم) =====
    if (!reply) {
      const system = AR
        ? `أنت «مساعد المسوقين» الذكي في محل شوب — منصة دروب شيبنج كويتية. دورك: خبير تسويق رقمي يساعد المسوقين الكويتيين يربحون عمولات من 1 إلى 2 د.ك على كل طلب يوصَل.
قواعدك:
- رد بلهجة كويتية ودّية ومختصرة (3-5 أسطر) — عملي ومباشر، بلا حشو.
- إذا فيه منتجات مطابقة بالقائمة، رشّحها بأسمائها واذكر عمولتها وسعرها.
- عمولات المنصة: 1.000 د.ك للمنتجات الأكثر تنافسية، 1.500 د.ك للمتوسطة، 2.000 د.ك للمنتجات المميزة. العمولة تتحسب عند تسليم الطلب عبر رابط ?ref الخاص بالمسوق (نافذة 30 يوم).
- المنتجات عندها دراسة تسويقية: سعر بيع مقترح + مستوى الطلب (hot/warm/cold) + أنسب قناة إعلانية (سناب/تيك توك/إنستا/واتساب).
- قنوات الكويت: سناب شات الأقوى محلياً، تيك توك أرخص CPM، إنستقرام للجمال والفخامة، واتساب للعلاقات الشخصية والستوريات.
- المواسم: رمضان/الأعياد، العودة للمدارس، اليوم الوطني 25-26 فبراير، الهلا نوفمبر، الجمعة البيضاء.
- لا تختلق منتجات أو أسعار أو أرقام غير موجودة في السياق. إذا ما تعرف، وجهه للأدلة أو الكتالوج.`
        + (personal || '')
        + (catalog ? `\n\nالمنتجات المطابقة:\n${catalog}` : '\n\n(ما فيه منتجات مطابقة — وجهه يبحث بكلمات ثانية أو يفتح الكتالوج)')
        : `You are "Marketers' Assistant" of Mahal Shop — a Kuwaiti dropshipping platform where marketers earn 1–2 KWD per delivered order.
Rules:
- Friendly, concise English (3-5 lines), practical and direct.
- If matching products are listed, recommend them by name with commission and price.
- Commissions: 1.000 KWD (most competitive), 1.500 KWD (medium), 2.000 KWD (niche). Credited on delivery via the marketer's ?ref link (30-day window).
- Each product has a market study: suggested sale price, demand tier (hot/warm/cold), best ad channel (Snapchat/TikTok/Instagram/WhatsApp).
- Kuwait channels: Snapchat strongest locally, TikTok cheapest CPM, Instagram for beauty/premium, WhatsApp for personal selling.
- Seasons: Ramadan/Eid, back-to-school, National Days Feb 25-26, Hala November, White Friday.
- NEVER invent products, prices or numbers not in context.`
        + (personal ? personal.replace(/د\.ك/g, 'KWD') : '')
        + (catalog ? `\n\nMatching products:\n${catalog}` : '\n\n(no matching products — guide them to search differently or open the catalog)');

      const convo = [
        { role: 'system', content: system },
        ...history.map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: String(m.content).slice(0, 800),
        })),
      ];

      const ds = await deepSeekChat(convo as any, { temperature: 0.55, maxTokens: 380, timeoutMs: 20000 });
      if (ds.ok) reply = ds.content;
      if (!reply) {
        try {
          const { default: ZAI } = await import('z-ai-web-dev-sdk');
          const zai = await ZAI.create();
          const completion = await zai.chat.completions.create({ messages: convo as any });
          reply = completion?.choices?.[0]?.message?.content || '';
        } catch {
          /* fall through */
        }
      }
      if (!reply) {
        reply = products.length
          ? (AR ? 'لقيت لك هذي المنتجات — كل واحد عليه عمولته ودراسته التسويقية 👇' : 'Found these for you — each with its commission & marketing study 👇')
          : (AR
            ? 'ما لقيت منتجات بكلامك الحين — جرّب كلمة أبسط (مثلاً: "عجلة" أو "مكواة شعر") أو تصفح الكتالوج كامل من زر المنتجات 👇'
            : 'No match right now — try a simpler word, or browse the full catalog from the products button 👇');
      }
    }

    // default nudge links so the assistant always drives action
    if (!links.length && products.length) {
      links.push({ label: AR ? 'افتح الكتالوج كامل' : 'Open full catalog', action: 'affiliate-products' });
    }

    return NextResponse.json({
      reply,
      products,
      links,
      marketer: aff ? { name: aff.name, code: aff.code } : null,
    });
  } catch {
    return NextResponse.json(
      {
        reply:
          lang === 'en'
            ? 'Small connection hiccup — try again in a moment 🙏'
            : 'صار خطأ بسيط بالاتصال — جرّب بعد شوي 🙏',
        products: [],
        links: [],
      },
      { status: 200 }
    );
  }
}
