import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';
import { deepSeekChat, extractJson } from '@/lib/deepseek';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * POST /api/admin/landing/generate — generate landing page content with AI.
 *
 * Body:
 *  - topic (string, required) — e.g. "عرض رمضان على أدوات المطبخ"
 *  - audience? (string) — target audience
 *  - tone? (string) — 'حماسي' | 'فخم' | 'عملي' ...
 *  - productIds? (string[]) — products to showcase
 *
 * Returns a full landing page JSON blueprint.
 */

interface GeneratedLanding {
  title: string;
  subtitle: string;
  heroBadge: string;
  ctaText: string;
  ctaSecondary: string;
  features: { icon: string; title: string; desc: string }[];
  stats: { value: string; label: string }[];
  testimonials: { name: string; text: string; rating: number }[];
  faq: { q: string; a: string }[];
  urgency: string;
}

const FALLBACK: GeneratedLanding = {
  title: 'عرض خاص لفترة محدودة',
  subtitle: 'منتجات مختارة بعناية بأسعار لا تُقاوم — توصيل سريع لكل المحافظات ودفع عند الاستلام.',
  heroBadge: 'عرض حصري',
  ctaText: 'تسوّق الآن',
  ctaSecondary: 'تصفّح كل المنتجات',
  features: [
    { icon: 'truck', title: 'توصيل سريع', desc: 'لكل محافظات الكويت' },
    { icon: 'shield', title: 'دفع آمن', desc: 'عند الاستلام' },
    { icon: 'star', title: 'جودة مضمونة', desc: 'منتجات أصلية' },
    { icon: 'headset', title: 'دعم فوري', desc: 'نرد بسرعة' },
  ],
  stats: [
    { value: '+2600', label: 'منتج' },
    { value: '+500', label: 'عميل سعيد' },
    { value: '24س', label: 'شحن سريع' },
    { value: '4.9', label: 'تقييم العملاء' },
  ],
  testimonials: [
    { name: 'أحمد م.', text: 'منتجات ممتازة والتوصيل كان أسرع من المتوقع. تجربة تسوق راقية.', rating: 5 },
    { name: 'نورة ع.', text: 'أسعار منافسة وجودة عالية. تعاملت معهم أكثر من مرة وأنصح بهم.', rating: 5 },
  ],
  faq: [
    { q: 'كيف أدفع؟', a: 'الدفع عند الاستلام متاح لجميع المحافظات.' },
    { q: 'كم يستغرق التوصيل؟', a: 'من 24 إلى 48 ساعة داخل الكويت.' },
  ],
  urgency: 'العرض ينتهي قريباً — الكمية محدودة!',
};

export async function POST(req: NextRequest) {
  return adminOnly(req, async () => {
    const body = await req.json().catch(() => ({}));
    const { topic, audience, tone, productIds } = body;
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'topic required' }, { status: 400 });
    }

    // Optional product context
    let productsContext = '';
    if (Array.isArray(productIds) && productIds.length > 0) {
      const products = await db.product.findMany({
        where: { id: { in: productIds.slice(0, 10) } },
        select: { name: true, salePrice: true, price: true },
      });
      if (products.length) {
        productsContext =
          '\nمنتجات العرض:\n' +
          products
            .map((p) => `- ${p.name} (${p.salePrice} د.ك${p.price > p.salePrice ? ` بدل ${p.price}` : ''})`)
            .join('\n');
      }
    }

    const prompt = `أنت خبير كتابة إعلانات وصفحات هبوط (Landing Pages) لمتجر إلكتروني كويتي اسمه "محل شوب".

موضوع الصفحة: ${topic}
${audience ? `الجمهور المستهدف: ${audience}` : ''}
${tone ? `النبرة المطلوبة: ${tone}` : 'النبرة: حماسية مقنعة راقية'}${productsContext}

اكتب محتوى صفحة هبوط عربية كاملة قابلة للتحويل (conversion-focused):
- عنوان رئيسي جذاب (≤ 8 كلمات)
- عنوان فرعي يوضح القيمة (≤ 20 كلمة)
- شارة Hero قصيرة
- نص زر CTA رئيسي وثانوي
- 4 ميزات (أيقونة من: truck/shield/star/headset/tag/gift/lock/clock + عنوان + وصف ≤ 8 كلمات)
- 4 أرقام إحصائية للثقة
- شهادتا عميل واقعيتان بالعربية (أسماء كويتية شائعة)
- سؤالان شائعان مع إجابات قصيرة
- جملة استعجال (urgency)

أرجع JSON فقط بهذا الشكل:
{
  "title": "",
  "subtitle": "",
  "heroBadge": "",
  "ctaText": "",
  "ctaSecondary": "",
  "features": [{"icon":"truck","title":"","desc":""}],
  "stats": [{"value":"","label":""}],
  "testimonials": [{"name":"","text":"","rating":5}],
  "faq": [{"q":"","a":""}],
  "urgency": ""
}`;

    // Priority 1: DeepSeek (paid key)
    let generated: GeneratedLanding | null = null;
    let provider = 'none';

    const ds = await deepSeekChat(
      [
        { role: 'system', content: 'أنت كاتب إعلانات محترف يعيد JSON صحيح فقط بالعربية.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.8, maxTokens: 1800, jsonMode: true, timeoutMs: 45000 }
    );
    if (ds.ok) {
      generated = extractJson<GeneratedLanding>(ds.content);
      if (generated?.title) provider = 'deepseek';
    }

    // Priority 2: workspace SDK
    if (!generated?.title) {
      try {
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'أنت كاتب إعلانات محترف يعيد JSON صحيح فقط بالعربية.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          max_tokens: 1800,
        });
        const raw = completion.choices?.[0]?.message?.content || '';
        const parsed = extractJson<GeneratedLanding>(raw);
        if (parsed?.title) {
          generated = parsed;
          provider = 'zai';
        }
      } catch (e) {
        console.warn('[landing-gen] zai failed:', e);
      }
    }

    // Priority 3: fallback template
    if (!generated?.title) {
      generated = {
        ...FALLBACK,
        title: typeof topic === 'string' && topic.length < 60 ? topic : FALLBACK.title,
      };
      provider = 'fallback';
    }

    return NextResponse.json({
      ok: true,
      provider,
      content: generated,
    });
  });
}

export const dynamic = 'force-dynamic';
