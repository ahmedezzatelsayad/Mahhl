import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';
import { deepSeekChat, extractJson } from '@/lib/deepseek';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * POST /api/admin/slider/auto — build a DYNAMIC product slider with AI.
 *
 * Body:
 *  - count?    (3..6, default 4)   how many slides
 *  - strategy? 'bestsellers' | 'discounted' | 'newest' | 'mixed'
 *  - categoryId? (string)          limit candidates to one category
 *
 * Flow: code ranks real in-stock products with photos (deterministic,
 * diverse categories) → ONE AI call writes every slide's copy →
 * returns ready slides using each product's OWN photo.
 *
 * Nothing is saved — the founder previews and clicks حفظ (full control).
 */

interface SlideDraft {
  index: number;
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  ctaLabel: string;
  chips: string[];
  tone: 'dark' | 'gold' | 'green' | 'blue';
}

const MAX_SET = 6;

function firstImage(p: { thumb: string | null; images: string | null }): string | null {
  if (p.thumb) return p.thumb;
  if (p.images) {
    const first = p.images.split(',')[0]?.trim();
    if (first) return first;
  }
  return null;
}

export async function POST(req: NextRequest) {
  return adminOnly(req, async () => {
    const body = await req.json().catch(() => ({}));
    const count = Math.min(MAX_SET, Math.max(3, Number(body.count) || 4));
    const strategy: 'bestsellers' | 'discounted' | 'newest' | 'mixed' =
      body.strategy === 'bestsellers' || body.strategy === 'discounted' || body.strategy === 'newest'
        ? body.strategy
        : 'mixed';
    const categoryId =
      typeof body.categoryId === 'string' && body.categoryId ? body.categoryId : undefined;

    // ===== 1) Rank real products (in stock, has photo) =====
    const candidates = await db.product.findMany({
      where: {
        quantity: { gt: 0 },
        ...(categoryId ? { categoryId } : {}),
        OR: [{ thumb: { not: null } }, { images: { not: '' } }],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        salePrice: true,
        thumb: true,
        images: true,
        isBestSeller: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
      },
      take: 400,
    });

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'لا توجد منتجات متوفرة بصور — أضف صوراً للمنتجات أولاً' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const scoreOf = (p: (typeof candidates)[number]) => {
      const hasDiscount = p.price > p.salePrice;
      const discountPct = hasDiscount && p.price > 0 ? (p.price - p.salePrice) / p.price : 0;
      const freshness = Math.max(0, 1 - (now - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 60)); // 60-day decay
      switch (strategy) {
        case 'bestsellers':
          return (p.isBestSeller ? 3 : 0) + discountPct * 1.5 + freshness;
        case 'discounted':
          return discountPct * 4 + (p.isBestSeller ? 1 : 0);
        case 'newest':
          return freshness * 3 + (p.isBestSeller ? 1 : 0) + discountPct;
        default: // mixed
          return (p.isBestSeller ? 2 : 0) + discountPct * 2 + freshness * 1.5;
      }
    };

    const ranked = candidates.sort((a, b) => scoreOf(b) - scoreOf(a));

    // ===== 2) Pick with category diversity (no two slides from same category unless needed) =====
    const picked: typeof candidates = [];
    const usedCats = new Set<string>();
    for (const p of ranked) {
      const catId = p.category?.id || '_';
      if (usedCats.has(catId)) continue;
      usedCats.add(catId);
      picked.push(p);
      if (picked.length >= count) break;
    }
    for (const p of ranked) {
      if (picked.length >= count) break;
      if (!picked.includes(p)) picked.push(p);
    }

    // ===== 3) ONE AI call writes the whole set (consistent voice, cheaper) =====
    const listForAi = picked
      .map((p, i) => {
        const discount =
          p.price > p.salePrice && p.price > 0
            ? ` (خصم ${Math.round(((p.price - p.salePrice) / p.price) * 100)}% — الآن ${p.salePrice} د.ك بدل ${p.price} د.ك)`
            : ` (سعره ${p.salePrice} د.ك)`;
        return `${i + 1}) ${p.name} — قسم: ${p.category?.name || 'عام'}${discount}${p.isBestSeller ? ' — الأكثر مبيعاً' : ''}`;
      })
      .join('\n');

    const prompt = `أنت كاتب إعلانات أول لمتجر كويتي اسمه "محل شوب". اكتب نصوص ${picked.length} شرائح سلايدر للصفحة الرئيسية — كل شريحة تروّج منتجاً حقيقياً من القائمة، والنص سيظهر فوق صورة المنتج نفسها.

المنتجات (بهذا الترتيب):
${listForAi}

قواعد صارمة:
1) العنوان ≤ 5 كلمات واضحة قوية، highlight كلمة أو كلمتان تُكملانه
2) subtitle ≤ 14 كلمة تبيع الفائدة الحقيقية للمنتج المعني (ليست عامة)
3) ممنوع اختراع تقييمات أو أعداد عملاء أو مواعيد انتهاء — الأرقام المذكورة في القائمة فقط
4) eyebrow = تصنيف قصير جداً (مثال: "الأكثر مبيعاً 🔥" أو "خصم حقيقي")
5) chips = 3 عناصر ثقة من هذه الحقائق فقط: دفع عند الاستلام، توصيل 1 د.ك، شحن مجاني من 50 د.ك، +2600 منتج، شحن يومي 10 صباحاً، توصيل 24–48 ساعة
6) tone لكل شريحة من: dark | gold | green | blue
7) ctaLabel فعل قصير مثل "شاهد المنتج" أو "اطلبه الآن"
8) غيّر الأسلوب بين الشرائح حتى لا تتشابه — شريحة تركز على السعر، أخرى على الفائدة، أخرى على الندرة الصادقة

أرجع JSON فقط:
{"slides":[{"index":1,"eyebrow":"","title":"","highlight":"","subtitle":"","ctaLabel":"","chips":["","",""],"tone":"dark"}]}`;

    const system = 'أنت كاتب إعلانات محترف يعيد JSON صحيح فقط بالعربية.';

    let drafts: SlideDraft[] | null = null;
    let provider = 'none';

    const ds = await deepSeekChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.85, maxTokens: 2000, jsonMode: true, timeoutMs: 45000 }
    );
    if (ds.ok) {
      const parsed = extractJson<{ slides: SlideDraft[] }>(ds.content);
      if (Array.isArray(parsed?.slides) && parsed.slides.length) {
        drafts = parsed.slides;
        provider = 'deepseek';
      }
    }

    if (!drafts) {
      try {
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
          temperature: 0.85,
          max_tokens: 2000,
        });
        const parsed = extractJson<{ slides: SlideDraft[] }>(
          completion.choices?.[0]?.message?.content || ''
        );
        if (Array.isArray(parsed?.slides) && parsed.slides.length) {
          drafts = parsed.slides;
          provider = 'zai';
        }
      } catch (e) {
        console.warn('[slider-auto] zai failed:', e);
      }
    }

    // ===== 4) Assemble final slides (AI copy + product photo + product CTA) =====
    const slides = picked.map((p, i) => {
      const d =
        drafts?.find((x) => Number(x.index) === i + 1) || drafts?.[i] || null;
      const shortName = p.name.length > 26 ? p.name.slice(0, 26) + '…' : p.name;
      const fallback: SlideDraft = {
        index: i + 1,
        eyebrow: p.isBestSeller ? 'الأكثر مبيعاً 🔥' : 'اختيار محل شوب',
        title: shortName,
        highlight: 'بسعر مميز',
        subtitle: 'منتج مختار بعناية — توصيل سريع لكل محافظات الكويت ودفع عند الاستلام.',
        ctaLabel: 'شاهد المنتج',
        chips: ['دفع عند الاستلام', 'توصيل 1 د.ك', 'شحن يومي 10ص'],
        tone: 'dark',
      };
      const c = d || fallback;
      return {
        id: `auto_${p.id}_${Date.now().toString(36)}`,
        eyebrow: String(c.eyebrow || fallback.eyebrow).slice(0, 70),
        title: String(c.title || fallback.title).slice(0, 90),
        highlight: String(c.highlight || '').slice(0, 60) || undefined,
        subtitle: String(c.subtitle || fallback.subtitle).slice(0, 300),
        image: firstImage(p) || undefined,
        tone: (['dark', 'gold', 'green', 'blue'] as const).includes(c.tone as any)
          ? c.tone
          : 'dark',
        chips: Array.isArray(c.chips)
          ? c.chips.map((x) => String(x).slice(0, 30)).filter(Boolean).slice(0, 4)
          : fallback.chips,
        cta: {
          label: String(c.ctaLabel || 'شاهد المنتج').slice(0, 40),
          action: 'product' as const,
          payload: p.slug,
        },
        ctaSecondary: { label: 'كل المنتجات', action: 'shop' as const },
        active: true,
        /** display-only helpers for the dashboard preview */
        _productName: p.name,
        _productSlug: p.slug,
        _price: p.salePrice,
        _oldPrice: p.price > p.salePrice ? p.price : null,
      };
    });

    return NextResponse.json({ ok: true, provider, strategy, slides });
  });
}

export const dynamic = 'force-dynamic';
