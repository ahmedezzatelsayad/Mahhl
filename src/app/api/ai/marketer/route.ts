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

/** كشف نية بسيط للروابط المقترحة بعد رد الـ AI (مش لتوليد الرد). */
function suggestLinks(q: string, AR: boolean): MktLink[] {
  const links: MktLink[] = [];
  if (/سحب|اسحب|استلم|أستلم|محفظ|withdraw|payout/i.test(q)) {
    links.push({ label: AR ? 'عمولاتي والسحب' : 'Commissions & withdrawals', action: 'affiliate-commissions' });
  }
  if (/حملة|دعاية|إعلان|اعلان|سناب|تيك|انستا|إنستا|ads|campaign|snapchat|tiktok/i.test(q)) {
    links.push({ label: AR ? 'دليل الدعاية الكامل 📣' : 'Full advertising guide 📣', action: 'guide-ads' });
    links.push({ label: AR ? 'دليل الحملات والمواسم 📅' : 'Campaigns & seasons guide 📅', action: 'guide-campaigns' });
  } else if (/متجر خاص|متجري|storefront|دومين|سب دومين|subdomain/i.test(q)) {
    // روابط المتجر تشرح من الرد نفسه
  }
  if (!links.length) {
    links.push({ label: AR ? 'افتح الكتالوج كامل' : 'Open full catalog', action: 'affiliate-products' });
  }
  return links.slice(0, 2);
}

/** رد احتياطي (فقط لو الـ AI فشل بالكامل) — نفس القواعد القديمة مختصرة. */
function fallbackReply(q: string, AR: boolean, products: MktProduct[], personal: string): string {
  if (!q) {
    return AR
      ? 'هلا بيك! أنا مساعدك الذكي للدروب شيبنج 🤝 اسألني أي شي: عمولات، منتجات، دعاية، أو فتح متجرك الخاص.'
      : 'Welcome! I\'m your dropshipping assistant 🤝 Ask me anything: commissions, products, ads, or your free store.';
  }
  if (/عمول|ربح|ارباح/i.test(q)) {
    return AR
      ? 'العمولة مفتوحة: من 1 إلى 10 د.ك على كل منتج — إنت تختار عمولتك وسعر بيعك = سعر المنصة + عمولتك 💰 تتحسب تلقائياً عند تسليم الطلب عبر رابطك.' + (personal ? '\n' + personal.trim() : '')
      : 'Commissions are open: 1–10 KWD per product — you pick yours; your price = platform price + commission 💰 Credited on delivery via your link.' + (personal ? '\n' + personal.trim() : '');
  }
  if (/محفظ|سحب|استلام/i.test(q)) {
    return AR
      ? 'محفظتك شفافة 100%: العمولة تتحسب عند التسليم وتسحبها من «عمولاتي والسحب» بأي وقت 📊'
      : 'Your wallet is 100% transparent: credited on delivery, withdrawable anytime from the Commissions tab 📊';
  }
  if (products.length) {
    return AR
      ? 'لقيت لك هذي المنتجات — كل واحد عليه عمولته ودراسته التسويقية 👇'
      : 'Found these for you 👇';
  }
  return AR
    ? 'جرّب كلمة أبسط أو تصفح الكتالوج 👇'
    : 'Try a simpler word or browse the catalog 👇';
}

/**
 * POST /api/ai/marketer — «مساعد المسوقين» الذكي (AI-FIRST).
 * الفهم أولاً ثم الرد: كل رسالة تمر على نموذج لغوي مع سياق المنصة الكامل
 * (العمولات 1–10، المتجر المجاني، الكتالوج، القنوات، المواسم) + بيانات المسوق
 * + منتجات حقيقية مطابقة — فما فيه ردود محفوظة إلا عند تعطل الـ AI تماماً.
 */
export async function POST(req: NextRequest) {
  let lang: 'ar' | 'en' = 'ar';
  try {
    const body = await req.json();
    lang = body.lang === 'en' ? 'en' : 'ar';
    const history: { role: string; content: string }[] = Array.isArray(body.messages)
      ? body.messages.slice(-10)
      : [];
    const q = ([...history].reverse().find((m) => m.role === 'user')?.content || '').trim();

    // ===== سياق شخصي للمسوق المسجل =====
    const aff = await verifyAffiliate(req);
    let personal = '';
    if (aff) {
      const b = await affiliateBuckets(aff.id);
      personal = lang === 'en'
        ? `\nThe asker is a REGISTERED MARKETER: ${aff.name} (code ${aff.code}). Wallet: available ${formatKwdPlain(b.available)} KWD, in delivery pipeline ${formatKwdPlain(b.expected)} KWD, lifetime earned ${formatKwdPlain(b.paid + b.expected + b.available)} KWD. Referral link: /?ref=${aff.code}`
        : `\nاللي يسأل مسوّق مسجّل: ${aff.name} (كوده ${aff.code}). محفظته: المتاح ${formatKwdPlain(b.available)} د.ك، قيد التحصيل ${formatKwdPlain(b.expected)} د.ك، إجمالي أرباحه ${formatKwdPlain(b.paid + b.expected + b.available)} د.ك. رابط الإحالة: /?ref=${aff.code}`;
    }

    // ===== بحث المنتجات الحقيقي (يتغذى للـ AI كسياق) =====
    const isRecommend = /شنو\s*أبيع|ايش\s*أبيع|أفضل منتج|افضل منتج|best product|best seller|الترند|ترند|أكثر طلب|الاكثر طلب|وين أبدأ|وين البداية|what.*sell|recommend|رشح|ارشح/i.test(q);
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

    const AR = lang !== 'en';
    const catalog = products
      .map((p) => {
        const d = p.demandTier ? (AR ? DEMAND_AR[p.demandTier] || p.demandTier : p.demandTier) : '';
        const ch = p.adChannel ? (AR ? CHANNEL_AR[p.adChannel] || p.adChannel : p.adChannel) : '';
        const s = p.suggestedPrice ? `${AR ? 'سعر بيع مقترح' : 'suggested price'} ${formatKwdPlain(p.suggestedPrice)} د.ك` : '';
        return `- ${p.name} — ${formatKwdPlain(p.price)} د.ك | ${AR ? 'عمولتك' : 'your commission'} ${formatKwdPlain(p.commission)} د.ك${s ? ` | ${s}` : ''}${d ? ` | ${d}` : ''}${ch ? ` | ${ch}` : ''}`;
      })
      .join('\n');

    // ===== الرد: AI أولاً (يفهم الكلام ويرد طبيعي) =====
    const system = AR
      ? `أنت «مساعد المسوقين» الذكي في محل شوب — منصة دروب شيبنج كويتية رقم 1. دورك: خبير تسويق رقمي ودود يساعد الكويتيين يكسبون من الإنترنت. افهم سؤال المستخدم أولاً (حتى لو عام أو عامي أو فيه أخطاء إملائية) ثم رد عليه رداً طبيعياً مخصصاً له — لا تكرر قالب ثابت.
معرفتك بالمنصة:
- العمولات: كل منتج عليه عمولة مقترحة من 1 إلى 10 د.ك حسب قيمته وتنافسيته، والمسوق حر يختار عمولته داخل النطاق (سعر البيع = سعر المنصة + عمولته). تتحسب عند تسليم الطلب عبر رابط ?ref (نافذة 30 يوم) وتسحب من المحفظة بأي وقت.
- المتجر المجاني (أقوى ميزة): كل مسوق يقدر يفتح متجره الخاص ببلاش من تبويب «متجري المجاني» في البوابة — متجر كامل باسمه ولوجوه ولونه، برابط /store/معرف أو سب دومين أو دومينه الخاص، يضيف منتجاتنا بنقرة واحدة، يحدد هامش ربحه فوق سعر المنصة لكل منتج، وزبائنه يطلبون أونلاين بالدفع عند الاستلام والمنصة تشحن وتحاسب — وطلبات المتجر تدخل عمولاته تلقائياً.
- الكتالوج: 2,600+ منتج مع دراسة تسويقية لكل منتج (سعر بيع مقترح + مستوى الطلب hot/warm/cold + أنسب قناة إعلانية). الزائر يشوف أفضل 200 منتج، والتسجيل المجاني يفتح الكل.
- قنوات الكويت: سناب شات الأقوى محلياً (ابدأ 2–3 د.ك/يوم)، تيك توك أرخص CPM، إنستقرام للجمال والفخامة، واتساب للستوريات والبيع الشخصي. قاعدة ميزانية 70/20/10.
- المواسم: رمضان/الأعياد، العودة للمدارس، اليوم الوطني 25–26 فبراير، الهلا نوفمبر، الجمعة البيضاء.
- المنصة ما تبيع مباشرة للزوار — كل زائر مسوق محتمل، وجهه للتسجيل المجاني بلطف.
قواعد الرد:
- رد بلهجة كويتية ودّية، مختصر (2–5 أسطر)، عملي ومباشر — وخلّ ردك يبان مفهوم لسؤاله بالذات.
- إذا فيه منتجات مطابقة بالسياق رشّح منها بالاسم مع العمولة والسعر (لا تخترع منتجات).
- إذا سأل عن «متجره الخاص» اشرح له الميزة بلطف ووجهه لتبويب «متجري المجاني» بعد التسجيل.`
      + (personal || '')
      + (catalog ? `\n\nمنتجات مطابقة لكلامه:\n${catalog}` : '\n\n(ما فيه منتجات مطابقة — اقترح كلمات بحث ثانية أو الكتالوج)')
      : `You are "Marketers' Assistant" of Mahal Shop — Kuwait's #1 dropshipping platform. Understand the user's message first (even casual/slang/typos) then reply naturally and personally — never repeat a canned template.
Platform knowledge:
- Commissions: each product carries a suggested commission of 1–10 KWD; the marketer freely picks his own (selling price = platform price + commission). Credited on delivery via ?ref link (30-day window), withdrawable anytime.
- Free Store (the killer feature): every marketer can open his own FREE store from the "متجري المجاني" tab — full store with his name/logo/color at /store/slug, a subdomain or his custom domain, one-click product imports, his own margin on top of platform prices, customers order online with cash-on-delivery — the platform ships and collects, store orders credit his commissions automatically.
- Catalog: 2,600+ products, each with a market study (suggested price, demand tier, best ad channel). Visitors see top 200; free registration unlocks all.
- Kuwait channels: Snapchat strongest locally, TikTok cheapest CPM, Instagram for premium looks, WhatsApp for personal selling. Budget rule 70/20/10.
- Seasons: Ramadan/Eid, back-to-school, National Days Feb 25–26, Hala November, White Friday.
- The platform does NOT sell directly — every visitor is a potential marketer; gently guide them to free registration.
Reply rules: friendly concise English (2–5 lines), tailored to the actual question; recommend matching products by name with commissions; never invent products.`
      + (personal ? personal.replace(/د\.ك/g, 'KWD') : '')
      + (catalog ? `\n\nMatching products:\n${catalog}` : '\n\n(no matching products — suggest other keywords or the catalog)');

    const convo = [
      { role: 'system', content: system },
      ...history.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: String(m.content).slice(0, 800),
      })),
    ];

    let reply = '';
    const ds = await deepSeekChat(convo as any, { temperature: 0.7, maxTokens: 420, timeoutMs: 22000 });
    if (ds.ok) reply = ds.content;
    if (!reply) {
      try {
        const { default: ZAI } = await import('z-ai-web-dev-sdk');
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({ messages: convo as any, temperature: 0.7, max_tokens: 420 });
        reply = completion?.choices?.[0]?.message?.content || '';
      } catch {
        /* fall through */
      }
    }

    // ===== احتياط فقط عند فشل الـ AI بالكامل =====
    if (!reply) reply = fallbackReply(q, AR, products, personal);

    const links: MktLink[] = suggestLinks(q, AR);

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
