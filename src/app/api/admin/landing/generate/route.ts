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
    { icon: 'star', title: 'منتجات مختارة', desc: 'بعناية وافتنان' },
    { icon: 'headset', title: 'دعم واتساب', desc: 'يومياً 9ص–11م' },
  ],
  // Honest, verifiable numbers only — invented ratings/customer counts
  // damage trust and violate advertising policy.
  stats: [
    { value: '+2600', label: 'منتج' },
    { value: '6', label: 'محافظات' },
    { value: 'COD', label: 'دفع عند الاستلام' },
    { value: '10ص', label: 'شحن يومي' },
  ],
  // No fabricated testimonials — real reviews get added after launch.
  testimonials: [],
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

    // ===== AI auto-picks showcase products when the founder didn't =====
    // The catalog has 2,600+ items — nobody should scroll a picker manually.
    // We mine the topic itself for keywords and rank matching in-stock
    // products (best-sellers first, discounted preferred).
    let autoPicked: { id: string; slug: string; name: string; salePrice: number; price: number; thumb: string | null }[] = [];
    let effectiveIds: string[] = Array.isArray(productIds) ? productIds : [];

    if (effectiveIds.length === 0) {
      const STOP = new Set([
        'عرض','على','في','من','الى','إلى','عن','مع','الآن','خصم','تخفيضات','رمضان','العيد','الجمعة',
        'البيضاء','الصيف','الشتاء','لل','للبيت','للمنزل','وال','أو','او','ثم','كل','هذا','هذه','ذلك',
        'فيه','فيها','عندنا','لدينا','جديد','جديدة','الأفضل','الافضل','الأكثر','مجموعة','تشكيلة','كولكشن',
      ]);
      const tokens = topic
        .split(/[\s،,.\\/:()+\-]+/)
        .map((t) => t.replace(/[\u064B-\u065F]/g, '').trim()) // strip tashkeel
        .filter((t) => t.length >= 2 && !STOP.has(t));
      if (tokens.length > 0) {
        const matched = await db.product.findMany({
          where: {
            quantity: { gt: 0 },
            OR: tokens.flatMap((t) => [
              { name: { contains: t } },
              { description: { contains: t } },
              { category: { is: { name: { contains: t } } } },
            ]),
          },
          select: {
            id: true, slug: true, name: true, salePrice: true, price: true, thumb: true,
            isBestSeller: true, images: true,
          },
          take: 120,
          orderBy: [{ isBestSeller: 'desc' }, { createdAt: 'desc' }],
        });
        // score: keyword hits + best-seller + has discount + has image
        const scoreOf = (p: (typeof matched)[number]) => {
          const hay = `${p.name} ${p.slug}`;
          let s = 0;
          for (const t of tokens) if (hay.includes(t)) s += 2;
          if (p.isBestSeller) s += 1.5;
          if (p.price > p.salePrice) s += 1;
          if (p.thumb || p.images) s += 0.5;
          return s;
        };
        autoPicked = matched
          .sort((a, b) => scoreOf(b) - scoreOf(a))
          .slice(0, 6)
          .map((p) => ({
            id: p.id, slug: p.slug, name: p.name, salePrice: p.salePrice,
            price: p.price, thumb: p.thumb || (p.images ? p.images.split(',')[0] : null),
          }));
        effectiveIds = autoPicked.map((p) => p.id);
      }
    }

    // Optional product context
    let productsContext = '';
    if (effectiveIds.length > 0) {
      const products = await db.product.findMany({
        where: { id: { in: effectiveIds.slice(0, 10) } },
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
- 4 أرقام إحصائية للثقة — حقائق فقط يثبتها المتجر: +2600 منتج، 6 محافظات، شحن مجاني من 50 د.ك، دفع عند الاستلام، شحن يومي 10 صباحاً. ممنوع منعاً باتاً اختراع تقييمات أو أعداد عملاء أو أرقام غير مثبتة.
- testimonials: أعد مصفوفة فارغة [] دائماً (شهادات العملاء تُضاف يدوياً بعد الإطلاق عندما تصبح حقيقية)
- سؤالان شائعان مع إجابات قصيرة
- جملة استعجال (urgency) بدون تواريخ أو أرقام كاذبة

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
      /** AI-selected showcase products (pre-picked from the topic itself) */
      selectedProducts: autoPicked,
    });
  });
}

export const dynamic = 'force-dynamic';
