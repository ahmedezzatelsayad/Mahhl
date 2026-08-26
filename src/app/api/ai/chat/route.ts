import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deepSeekChat } from '@/lib/deepseek';
import { formatKwdPlain } from '@/lib/utils/format';

export const maxDuration = 60;

interface ChatProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  categoryName: string | null;
}

/**
 * "تحدث مع المحل" — conversational product finder for Kuwaiti shoppers.
 * 1) keyword search across products + categories
 * 2) AI reply (DeepSeek → z-ai sdk → rule-based) in friendly Kuwaiti Arabic
 * 3) clickable product chips the customer can open directly
 */
export async function POST(req: NextRequest) {
  let lang: 'ar' | 'en' = 'ar';
  try {
    const body = await req.json();
    lang = body.lang === 'en' ? 'en' : 'ar';
    const history: { role: string; content: string }[] = Array.isArray(body.messages)
      ? body.messages.slice(-8)
      : [];
    const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content || '';

    // ---------- 1) Product search ----------
    const q = (lastUser || '').trim();
    const tokens = q.split(/\s+/).filter((t) => t.length > 1).slice(0, 4);
    let products: ChatProduct[] = [];

    if (tokens.length) {
      const where = {
        OR: tokens.flatMap((t) => [
          { name: { contains: t } },
          { nameEn: { contains: t } },
          { description: { contains: t } },
          { descriptionEn: { contains: t } },
        ]),
      };
      const found = await db.product.findMany({
        where,
        take: 6,
        orderBy: [{ isBestSeller: 'desc' }, { soldCount: 'desc' }],
        include: { category: true },
      });
      products = found.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: lang === 'en' && p.nameEn ? p.nameEn : p.name,
        price: p.salePrice ?? p.price,
        image: p.thumb || (p.images ? p.images.split(',')[0] : null),
        categoryName: p.category?.name ?? null,
      }));
    }

    // ---------- 2) AI reply ----------
    const catalog = products
      .map((p) => `- ${p.name} — ${formatKwdPlain(p.price)} د.ك`)
      .join('\n');

    const system = lang === 'en'
      ? `You are "Mahal Shop" — a smart shopping assistant for a Kuwaiti online store (prices in KWD, cash on delivery, delivery to all Kuwait governorates).
Reply in friendly, concise English (2-4 lines max), addressing the customer directly (you can, try, check).
If matching products are listed below, mention them naturally with names and prices. If none, ask the customer to describe what they need in other words or use the search bar.
NEVER invent products or prices not in the list.`
      : `أنت "محل شوب" — مساعد تسوق ذكي لمتجر إلكتروني كويتي (الأسعار بالدينار الكويتي، دفع عند الاستلام، توصيل لكل محافظات الكويت).
رد بلهجة كويتية ودّية ومختصرة (سطرين إلى أربعة أسطر كحد أقصى)، وخاطب العميل بصيغة الشخص الواحد (تقدر، جرّب، شووف).
لو فيه منتجات مناسبة في القائمة تحت، اذكرها بأسمائها وأسعارها بشكل طبيعي. لو ما فيه، اقترح على العميل يوصف اللي يدور عليه بكلمات ثانية أو يستخدم البحث.
لا تختلق منتجات أو أسعار غير موجودة في القائمة.`;

    const convo = [
      { role: 'system', content: system + (catalog ? `\n\nالمنتجات المطابقة:\n${catalog}` : '\n\n(لا توجد نتائج مطابقة الآن)') },
      ...history.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: String(m.content).slice(0, 800),
      })),
    ];

    let reply = '';

    // DeepSeek first (founder's paid key)
    const ds = await deepSeekChat(convo as any, { temperature: 0.6, maxTokens: 300, timeoutMs: 20000 });
    if (ds.ok) reply = ds.content;

    // z-ai workspace sdk fallback
    if (!reply) {
      try {
        const { default: ZAI } = await import('z-ai-web-dev-sdk');
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: convo as any,
        });
        reply = completion?.choices?.[0]?.message?.content || '';
      } catch {
        /* fall through to rule-based */
      }
    }

    // rule-based fallback — always answers, never breaks
    if (!reply) {
      if (products.length) {
        reply =
          (lang === 'en' ? 'Here are the best matches I found:\n' : 'هذي أفضل النتائج اللي لقيتها لك:\n') +
          products.slice(0, 3).map((p) => `• ${p.name} — ${formatKwdPlain(p.price)} ${lang === 'en' ? 'KWD' : 'د.ك'}`).join('\n') +
          (lang === 'en' ? '\nTap any product below to see details 🛍️' : '\nاضغط على أي منتج تحت تشوف تفاصيله 🛍️');
      } else if (q) {
        reply =
          lang === 'en'
            ? 'No exact match for those words.. try a simpler term (e.g. "watch" or "kids toy"), or use the search bar above and I will look again 😊'
            : 'ما لقيت نتيجة دقيقة لكلماتك.. جرّب تصف اللي تدور عليه بكلمة أبسط (مثلاً: "ساعة" أو "لعبة أطفال")، أو استخدم خانة البحث فوق، وأنا أبحث لك مرة ثانية 😊';
      } else {
        reply = lang === 'en' ? 'Hey there! What are you looking for today? Type a product name and I\'ll find the best price 🛒' : 'هلا والله! شنو اللي تدور عليه اليوم؟ اكتب لي اسم المنتج وأجيبه لك بأحسن سعر 🛒';
      }
    }

    return NextResponse.json({ reply, products });
  } catch (e: any) {
    return NextResponse.json(
      { reply: lang === 'en' ? 'Small connection hiccup.. please try again 🙏' : 'صار خطأ بسيط بالاتصال.. جرّب مرة ثانية بعد شوي 🙏', products: [] },
      { status: 200 }
    );
  }
}
