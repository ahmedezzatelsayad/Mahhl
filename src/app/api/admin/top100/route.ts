import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminOnly } from '@/lib/auth';
import { deepSeekChat, extractJson, getDeepSeekSettings } from '@/lib/deepseek';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * Top-100 Kuwait demand products — founder's AI copy desk.
 * GET  → ranked list + AI settings status
 * POST → generate improved AR+EN copy for ONE product with the
 *        DeepSeek THINKING model (deepseek-reasoner / v4-thinking).
 *        Preview-only: nothing is saved until the founder applies it
 *        through the normal product-update endpoint.
 */

interface TopProduct {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  description: string;
  descriptionEn: string | null;
  metaDescription: string | null;
  price: number;
  salePrice: number;
  quantity: number;
  thumb: string | null;
  demandRank: number | null;
  soldCount: number;
  categoryName: string | null;
  hasEn: boolean;
  descLen: number;
}

export async function GET(req: NextRequest) {
  return adminOnly(req, async () => {
    const rows = await db.product.findMany({
      where: { demandRank: { not: null } },
      orderBy: { demandRank: 'asc' },
      take: 100,
      include: { category: true },
    });

    const products: TopProduct[] = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameEn: p.nameEn,
      description: p.description,
      descriptionEn: p.descriptionEn,
      metaDescription: p.metaDescription,
      price: p.price,
      salePrice: p.salePrice,
      quantity: p.quantity,
      thumb: p.thumb,
      demandRank: p.demandRank,
      soldCount: p.soldCount,
      categoryName: p.category?.name ?? null,
      hasEn: !!(p.nameEn && p.nameEn.trim()),
      descLen: (p.description || '').trim().length,
    }));

    const ai = await getDeepSeekSettings();
    return NextResponse.json({
      products,
      ai: { enabled: ai.enabled, model: ai.model, hasKey: !!ai.apiKey },
      stats: {
        total: products.length,
        withEn: products.filter((p) => p.hasEn).length,
        thinDesc: products.filter((p) => p.descLen < 60).length,
        outOfStock: products.filter((p) => p.quantity <= 0).length,
      },
    });
  });
}

export async function POST(req: NextRequest) {
  return adminOnly(req, async () => {
    const body = await req.json().catch(() => ({}));
    const productId = String(body.productId || '');
    /** allow the founder to pick which DeepSeek model thinks — default THINKING */
    const model = String(body.model || 'deepseek-reasoner');

    const p = await db.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });
    if (!p) {
      return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
    }

    const ai = await getDeepSeekSettings();
    if (!ai.enabled || !ai.apiKey) {
      return NextResponse.json(
        { error: 'مفتاح DeepSeek غير مفعّل — فعّله من صفحة «محرك الذكاء» أولاً' },
        { status: 400 }
      );
    }

    const current = {
      name: p.name,
      nameEn: p.nameEn || '',
      description: p.description || '',
      descriptionEn: p.descriptionEn || '',
      metaDescription: p.metaDescription || '',
      category: p.category?.name || '',
      price: p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price,
      rank: p.demandRank,
      soldCount: p.soldCount,
    };

    const system = `أنت خبير كتابة محتوى تجاري لمتجر إلكتروني كويتي (محل شوب) وكاتب SEO محترف.
مهمتك: تحسين اسم ووصف منتج من الأكثر طلباً في الكويت ليزيد نسبة التحويل (Conversion Rate) ويظهر أعلى في نتائج البحث.

القواعد الصارمة:
1. لا تختلق مواصفات غير موجودة في المنتج الحالي — حسّن الصياغة والترتيب والإقناع فقط.
2. الاسم العربي: 40-80 حرف، جذاب، يذكر أهم ميزتين، بدون مبالغات كاذبة.
3. الوصف العربي: 300-600 حرف، بلهجة تسويقية كويتية راقية، فقرات قصيرة + نقاط فوائد، وينتهي بدعوة للطلب (CTA).
4. الاسم الإنجليزي + الوصف الإنجليزي: نفس المحتوى بإنجليزية طبيعية للتسوق الخليجي.
5. metaDescription: 120-155 حرف بالعربية، تضم الكلمة المفتاحية والسعر والدفع عند الاستلام.
6. حافظ على السعر والفئة كما هي — لا تذكر معلومات شحن غير: شحن 1 د.ك ومجاني من 30 د.ك ودفع عند الاستلام.

رجّع JSON فقط بهذا الشكل:
{"name": "...", "description": "...", "nameEn": "...", "descriptionEn": "...", "metaDescription": "...", "reasoning": "سطر واحد يشرح أهم تحسين عملته"}`;

    const user = `حسّن هذا المنتج (الترتيب #${current.rank} في الأكثر طلباً بالكويت، ${current.soldCount} مرة مبيع):
الاسم الحالي: ${current.name}
الاسم الإنجليزي الحالي: ${current.nameEn || '(فارغ — اكتبه)'}
الوصف الحالي: ${current.description || '(فارغ — اكتب وصفاً تسويقياً من الاسم)'}
الفئة: ${current.category}
السعر: ${current.price} د.ك`;

    // The V4 thinking model is occasionally flaky (empty content or
    // unparseable JSON on a single run) — one automatic retry makes the
    // feature reliably work for the founder.
    let suggestion: {
      name?: string;
      description?: string;
      nameEn?: string;
      descriptionEn?: string;
      metaDescription?: string;
      reasoning?: string;
    } | null = null;
    let lastError = '';

    for (let attempt = 0; attempt < 2 && !suggestion; attempt++) {
      const res = await deepSeekChat(
        [
          { role: 'system', content: system },
          { role: 'user', content: attempt === 0 ? user : user + '\n(محاولة ثانية — رجّع JSON صالح ومكتمل فقط)' },
        ],
        // DeepSeek V4 THINKING: reasoning_effort=low → the model answers in
        // seconds instead of burning the whole token budget on chain-of-thought.
        { maxTokens: 3000, jsonMode: true, timeoutMs: 110000, model, reasoningEffort: 'low' }
      );

      if (!res.ok) {
        lastError = res.error || 'network';
        continue;
      }
      const parsed = extractJson<{
        name?: string;
        description?: string;
        nameEn?: string;
        descriptionEn?: string;
        metaDescription?: string;
        reasoning?: string;
      }>(res.content);
      if (parsed?.name) {
        suggestion = parsed;
      } else {
        lastError = 'unparseable';
      }
    }

    if (!suggestion) {
      return NextResponse.json(
        { error: `فشل توليد النص (${lastError}) — جرّب مرة ثانية أو تحقق من المفتاح` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      productId: p.id,
      model,
      current,
      suggestion: {
        name: String(suggestion.name || '').slice(0, 120),
        description: String(suggestion.description || '').slice(0, 2000),
        nameEn: String(suggestion.nameEn || '').slice(0, 160),
        descriptionEn: String(suggestion.descriptionEn || '').slice(0, 2400),
        metaDescription: String(suggestion.metaDescription || '').slice(0, 200),
        reasoning: String(suggestion.reasoning || '').slice(0, 300),
      },
    });
  });
}
