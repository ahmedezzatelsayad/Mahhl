import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';
import { deepSeekChat, extractJson } from '@/lib/deepseek';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * POST /api/admin/slider/generate — AI writes ONE slide's copy (AR + EN).
 *
 * Body:
 *  - productId (string) — write the copy around this product (preferred)
 *  - topic?   (string)  — free-form campaign topic instead of a product
 *
 * Returns: { eyebrow, title, highlight, subtitle, ctaLabel, chips[], tone,
 *            eyebrowEn, titleEn, highlightEn, subtitleEn, ctaLabelEn, chipsEn[] }
 * The founder previews + edits before saving — nothing is persisted here.
 */

interface SlideCopy {
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  ctaLabel: string;
  chips: string[];
  tone: 'dark' | 'gold' | 'green' | 'blue';
  // English mirror (used by the EN storefront)
  eyebrowEn?: string;
  titleEn?: string;
  highlightEn?: string;
  subtitleEn?: string;
  ctaLabelEn?: string;
  chipsEn?: string[];
}

export async function POST(req: NextRequest) {
  return adminOnly(req, async () => {
    const body = await req.json().catch(() => ({}));
    const { productId, topic } = body;

    // ===== Build honest context (product first, free topic second) =====
    let context = '';
    let subject = '';

    if (productId && typeof productId === 'string') {
      const p = await db.product.findUnique({
        where: { id: productId },
        select: {
          name: true,
          slug: true,
          price: true,
          salePrice: true,
          description: true,
          isBestSeller: true,
          quantity: true,
          category: { select: { name: true } },
        },
      });
      if (!p) {
        return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
      }
      const inStock = p.quantity > 0;
      const discount =
        p.price > p.salePrice && p.price > 0
          ? Math.round(((p.price - p.salePrice) / p.price) * 100)
          : 0;
      subject = p.name;
      context =
        `\nالمنتج:\n- الاسم: ${p.name}\n` +
        `- السعر الحالي: ${p.salePrice} د.ك${p.price > p.salePrice ? ` (كان ${p.price} د.ك — خصم ${discount}%)` : ''}\n` +
        `- القسم: ${p.category?.name || 'عام'}\n` +
        `- الأكثر مبيعاً: ${p.isBestSeller ? 'نعم' : 'لا'}\n` +
        `- التوفر: ${inStock ? 'متوفر' : 'نفدت الكمية'}\n` +
        (p.description ? `- وصف مختصر: ${p.description.slice(0, 300)}\n` : '');
    } else if (topic && typeof topic === 'string') {
      subject = topic;
      context = `\nموضوع الحملة: ${topic}\n`;
    } else {
      return NextResponse.json({ error: 'أرسل productId أو topic' }, { status: 400 });
    }

    const prompt = `أنت كاتب إعلانات أول لدى متجر إلكتروني كويتي اسمه "محل شوب" (محل شوب للسوق الكويتي).
مهمتك: كتابة نص شريحة سلايدر (بانر رئيسي) للصفحة الرئيسية — نص يظهر فوق صورة حقيقية، لذلك الوضوح أولاً. الموقع ثنائي اللغة، فاكتب النسخة العربية والنسخة الإنجليزية معاً (ترويجية طبيعية بأسلوب أمازون، وليست ترجمة حرفية).

${context}
حقائق المتجر الثابتة (استخدمها إن ناسبت ولا تخترع غيرها):
- توصيل 1 د.ك لكل محافظات الكويت، ومجاني من 30 د.ك
- الدفع عند الاستلام (كاش للمندوب)
- أكثر من 2,600 منتج — شحن يومي 10 صباحاً

قواعد صارمة:
1) العنوان ≤ 5 كلمات قصيرة واضحة، والـ highlight كلمة أو كلمتان تُكملان العنوان
2) subtitle ≤ 16 كلمة يشرح الفائدة الحقيقية
3) ممنوع اختراع تقييمات أو أعداد عملاء أو تواريخ انتهاء — أرقام حقيقية فقط
4) إذا كان المنتج نفدت كميته لا تقل "متوفر الآن"
5) لهجة خليجية راقية بسيطة يفهمها الجميع، والإنجليزية natural saleable US e-commerce style
6) chips = 3 عناصر ثقة قصيرة جداً (2-4 كلمات) + مقابلها الإنجليزي في chipsEn
7) tone من: dark | gold | green | blue (اختر الأنسب لمزيج المنتج)
8) ctaLabel فعل قصير (كلمتان كحد أقصى) + ctaLabelEn المقابل

أرجع JSON فقط:
{"eyebrow":"","title":"","highlight":"","subtitle":"","ctaLabel":"","chips":["","",""],"eyebrowEn":"","titleEn":"","highlightEn":"","subtitleEn":"","ctaLabelEn":"","chipsEn":["","",""],"tone":"dark"}`;

    const system = 'أنت كاتب إعلانات محترف ثنائي اللغة (عربي/إنجليزي) يعيد JSON صحيحاً فقط.';

    // Priority 1: DeepSeek (founder's paid key)
    let copy: SlideCopy | null = null;
    let provider = 'none';

    const ds = await deepSeekChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.75, maxTokens: 700, jsonMode: true, timeoutMs: 35000 }
    );
    if (ds.ok) {
      const parsed = extractJson<SlideCopy>(ds.content);
      if (parsed?.title) {
        copy = parsed;
        provider = 'deepseek';
      }
    }

    // Priority 2: workspace SDK
    if (!copy) {
      try {
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
          temperature: 0.75,
          max_tokens: 700,
        });
        const parsed = extractJson<SlideCopy>(completion.choices?.[0]?.message?.content || '');
        if (parsed?.title) {
          copy = parsed;
          provider = 'zai';
        }
      } catch (e) {
        console.warn('[slider-gen] zai failed:', e);
      }
    }

    // Priority 3: honest local template — never leave the founder empty-handed
    if (!copy) {
      const shortName = subject.length > 30 ? subject.slice(0, 30) + '…' : subject;
      copy = {
        eyebrow: 'عرض محل شوب',
        title: shortName,
        highlight: 'بسعر مميز',
        subtitle: 'منتج مختار بعناية — توصيل سريع لكل محافظات الكويت ودفع عند الاستلام.',
        ctaLabel: 'شاهد المنتج',
        chips: ['دفع عند الاستلام', 'توصيل 1 د.ك', 'شحن يومي 10ص'],
        eyebrowEn: 'Mahal Shop offer',
        titleEn: shortName,
        highlightEn: 'at a great price',
        subtitleEn: 'A carefully picked product — fast delivery across Kuwait with cash on delivery.',
        ctaLabelEn: 'View Product',
        chipsEn: ['Cash on delivery', '1 KWD delivery', 'Ships daily 10AM'],
        tone: 'dark',
      };
      provider = 'fallback';
    }

    // clamp to slide limits before returning
    const safe: SlideCopy = {
      eyebrow: String(copy.eyebrow || '').slice(0, 70),
      title: String(copy.title || '').slice(0, 90),
      highlight: String(copy.highlight || '').slice(0, 60),
      subtitle: String(copy.subtitle || '').slice(0, 300),
      ctaLabel: String(copy.ctaLabel || 'تسوق الآن').slice(0, 40),
      chips: Array.isArray(copy.chips)
        ? copy.chips.map((c) => String(c).slice(0, 30)).filter(Boolean).slice(0, 4)
        : [],
      eyebrowEn: String(copy.eyebrowEn || '').slice(0, 80) || undefined,
      titleEn: String(copy.titleEn || '').slice(0, 110) || undefined,
      highlightEn: String(copy.highlightEn || '').slice(0, 70) || undefined,
      subtitleEn: String(copy.subtitleEn || '').slice(0, 340) || undefined,
      ctaLabelEn: String(copy.ctaLabelEn || '').slice(0, 60) || undefined,
      chipsEn: Array.isArray(copy.chipsEn)
        ? copy.chipsEn.map((c) => String(c).slice(0, 40)).filter(Boolean).slice(0, 4)
        : undefined,
      tone: (['dark', 'gold', 'green', 'blue'] as const).includes(copy.tone as any)
        ? copy.tone
        : 'dark',
    };

    return NextResponse.json({ ok: true, provider, copy: safe, subject });
  });
}

export const dynamic = 'force-dynamic';
