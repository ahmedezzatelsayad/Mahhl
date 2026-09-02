/**
 * AI Upsell Engine
 * ----------------
 * Understands the user's session (events, viewed products, cart items) and
 * returns contextual upsell recommendations with AI-generated natural language
 * reasons. Falls back to a deterministic rule-based engine if the LLM call
 * fails or times out.
 */
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { deepSeekChat, extractJson } from '@/lib/deepseek';

const MODEL_VERSION = 'v1';
const OFFER_TTL_MIN = 30; // cache offers for 30 minutes

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

type TriggerContext = {
  productId?: string | null;
  cartItems?: CartItem[];
  sessionId: string;
};

export type Recommendation = {
  productId: string;
  /** product slug — required for clickable deep links (/?p=slug) */
  slug: string;
  name: string;
  price: number;
  image: string | null;
  reason: string;
  score: number; // 0..1
};

/**
 * Compute a stable visitor persona from their last 200 events.
 */
export async function derivePersona(sessionId: string): Promise<{
  persona: string;
  intentScore: number;
  budgetTier: string;
}> {
  const events = await db.userEvent.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { product: { select: { price: true, salePrice: true, categoryId: true } } },
  });

  if (events.length === 0) {
    return { persona: 'new_visitor', intentScore: 0.5, budgetTier: 'mid' };
  }

  const viewedPrices: number[] = [];
  let discountViews = 0;
  let addToCarts = 0;
  let checkoutStart = 0;
  let checkoutComplete = 0;
  const categoryHits: Record<string, number> = {};
  let upsellClicks = 0;

  for (const ev of events) {
    if (ev.type === 'product_view' && ev.product) {
      const p = ev.product;
      viewedPrices.push(p.salePrice || p.price);
      if (p.salePrice && p.price > p.salePrice) discountViews++;
      if (p.categoryId) categoryHits[p.categoryId] = (categoryHits[p.categoryId] || 0) + 1;
    }
    if (ev.type === 'add_to_cart') addToCarts++;
    if (ev.type === 'checkout_start') checkoutStart++;
    if (ev.type === 'checkout_complete') checkoutComplete++;
    if (ev.type === 'upsell_clicked') upsellClicks++;
  }

  let persona = 'browser';
  if (checkoutComplete > 0) persona = 'returning_buyer';
  else if (checkoutStart > 0) persona = 'high_intent';
  else if (addToCarts > 0) persona = 'cart_builder';
  else if (discountViews > 3) persona = 'bargain_hunter';
  else if (events.length > 10) persona = 'explorer';

  const views = events.filter((e) => e.type === 'product_view').length;
  const ratio = addToCarts / Math.max(1, views);
  const intent = Math.min(1, ratio * 1.5 + checkoutStart * 0.3 + checkoutComplete * 0.5);

  const avgPrice = viewedPrices.length
    ? viewedPrices.reduce((a, b) => a + b, 0) / viewedPrices.length
    : 0;
  let budgetTier = 'mid';
  if (avgPrice < 200) budgetTier = 'low';
  else if (avgPrice < 1000) budgetTier = 'mid';
  else if (avgPrice < 3000) budgetTier = 'high';
  else budgetTier = 'premium';

  return { persona, intentScore: Math.round(intent * 100) / 100, budgetTier };
}

/**
 * Rule-based fallback recommendations: same category + price-tier,
 * ordered by best-seller flag and price proximity.
 */
async function ruleBasedRecommendations(
  trigger: TriggerContext,
  limit: number
): Promise<Recommendation[]> {
  let categoryId: string | null = null;
  let maxPrice = Number.MAX_SAFE_INTEGER;
  let minPrice = 0;

  if (trigger.productId) {
    const p = await db.product.findUnique({
      where: { id: trigger.productId },
      select: { id: true, categoryId: true, salePrice: true, price: true },
    });
    if (p) {
      categoryId = p.categoryId;
      const ref = p.salePrice || p.price;
      maxPrice = ref * 1.4;
      minPrice = ref * 0.6;
    }
  }

  if (trigger.cartItems && trigger.cartItems.length > 0) {
    const cartProducts = await db.product.findMany({
      where: { id: { in: trigger.cartItems.map((c) => c.productId) } },
      select: { categoryId: true, salePrice: true },
    });
    const catIds = new Set(
      [...cartProducts.map((c) => c.categoryId), categoryId].filter(Boolean) as string[]
    );
    if (catIds.size > 0) categoryId = null;
    const prices = cartProducts.map((c) => c.salePrice);
    if (prices.length) {
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      maxPrice = Math.max(maxPrice, avg * 1.5);
      minPrice = Math.min(minPrice, avg * 0.5);
    }
  }

  const excludeIds = new Set<string>();
  if (trigger.productId) excludeIds.add(trigger.productId);
  if (trigger.cartItems) trigger.cartItems.forEach((c) => excludeIds.add(c.productId));

  const refPrice =
    (trigger.cartItems?.reduce((s, c) => s + c.price * c.quantity, 0) || 0) ||
    (trigger.productId
      ? (await db.product.findUnique({
          where: { id: trigger.productId },
          select: { salePrice: true },
        }))?.salePrice
      : 0) || 100;

  const candidates = await db.product.findMany({
    where: {
      id: { notIn: Array.from(excludeIds) },
      quantity: { gt: 0 },
      OR: [{ categoryId }, { isBestSeller: true }],
      salePrice: { gte: minPrice, lte: maxPrice },
    },
    take: limit * 4,
    orderBy: [{ isBestSeller: 'desc' }, { salePrice: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      salePrice: true,
      price: true,
      thumb: true,
      images: true,
      categoryId: true,
      isBestSeller: true,
    },
  });

  const recs: Recommendation[] = candidates
    .map((p) => {
      const priceProximity = 1 - Math.min(1, Math.abs((p.salePrice - refPrice) / refPrice));
      const bestSellerBonus = p.isBestSeller ? 0.2 : 0;
      const discount = p.price > p.salePrice ? 0.1 : 0;
      const score = Math.max(0, Math.min(1, 0.6 * priceProximity + bestSellerBonus + discount));
      return {
        productId: p.id,
        slug: p.slug,
        name: p.name,
        price: p.salePrice,
        image: p.thumb || (p.images ? p.images.split(',')[0] : null),
        reason: ruleBasedReason(p, trigger),
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return recs;
}

function ruleBasedReason(p: any, trigger: TriggerContext): string {
  if (p.isBestSeller) return 'الأكثر مبيعاً — يختاره العملاء عادة مع منتجك';
  if (p.price > p.salePrice) {
    const disc = Math.round(((p.price - p.salePrice) / p.price) * 100);
    return `وفّر ${disc}% — يناسب اختيارك الحالي`;
  }
  if (trigger.cartItems && trigger.cartItems.length > 0) {
    return 'يكمّل سلتك بأقل تكلفة إضافية';
  }
  return 'منتج ذو صلة بنفس الفئة وسعر مناسب';
}

/**
 * AI-powered upsell: ask the LLM to write a one-line Arabic reason for each
 * candidate based on the user's persona and the trigger context.
 */
async function enrichWithAI(
  recs: Recommendation[],
  ctx: {
    triggerName?: string;
    cartItems?: CartItem[];
    persona: string;
    intentScore: number;
    budgetTier: string;
  }
): Promise<Recommendation[]> {
  if (!recs.length) return recs;

  const itemsList = recs.map((r, i) => `${i + 1}. ${r.name} — ${r.price} د.ك`).join('\n');

  const cartLine =
    ctx.cartItems && ctx.cartItems.length
      ? `السلة: ${ctx.cartItems.map((c) => `${c.name} (${c.price} د.ك)`).join('، ')}`
      : ctx.triggerName
        ? `المنتج الحالي: ${ctx.triggerName}`
        : 'تصفح عام';

  const prompt = `أنت مسوّق محترف لمنصة دروب شيبنج كويتية (محل شوب).
معلومات العميل:
- النوع: ${ctx.persona}
- درجة النية للشراء: ${ctx.intentScore}/1
- الفئة السعرية: ${ctx.budgetTier}
- ${cartLine}

اقترح سبب قصير (≤ 14 كلمة) بالعربية الفصحى المبسّطة لكل منتج ليتم إقناع العميل بإضافته للسلة. ركّز على الفائدة العملية والتكامل مع ما يختاره.

المنتجات المقترحة:
${itemsList}

أرجع فقط JSON بالشكل التالي بدون شرح:
{
  "reasons": ["سبب 1", "سبب 2", ...]
}`;

  try {
    // Priority 1: DeepSeek (founder's paid key, configured in admin AI page)
    const ds = await deepSeekChat(
      [
        { role: 'system', content: 'أنت مساعد تسويق محترم يعيد JSON صحيح فقط.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.7, maxTokens: 600, jsonMode: true, timeoutMs: 15000 }
    );
    if (ds.ok) {
      const parsed = extractJson<{ reasons: string[] }>(ds.content);
      if (parsed && Array.isArray(parsed.reasons) && parsed.reasons.length === recs.length) {
        return recs.map((r, i) => ({ ...r, reason: parsed.reasons[i] || r.reason }));
      }
    }

    // Priority 2: built-in workspace SDK
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'أنت مساعد تسويق محترم يعيد JSON صحيح فقط.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });
    const raw = completion.choices?.[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return recs;
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed.reasons) && parsed.reasons.length === recs.length) {
      return recs.map((r, i) => ({
        ...r,
        reason: parsed.reasons[i] || r.reason,
      }));
    }
    return recs;
  } catch (e) {
    console.warn('[upsell] AI enrichment failed, using rule-based reasons:', e);
    return recs;
  }
}

/**
 * Main entry point — get upsell recommendations for a session.
 * Uses cache for 30 min per (session, triggerProduct) pair.
 */
export async function getUpsellForSession(
  ctx: TriggerContext,
  opts: { useAI?: boolean; limit?: number } = {}
): Promise<Recommendation[]> {
  const limit = opts.limit ?? 4;
  const useAI = opts.useAI ?? true;

  // Check cache
  const cached = await db.upsellOffer.findFirst({
    where: {
      sessionId: ctx.sessionId,
      triggerProductId: ctx.productId ?? null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (cached && cached.modelVersion === MODEL_VERSION) {
    const payload = (cached.payload as Recommendation[]).slice(0, limit);
    // hydrate slugs for pre-migration cached payloads that lack them
    return Promise.all(
      payload.map(async (r) => {
        if (r.slug) return r;
        const p = await db.product.findUnique({
          where: { id: r.productId },
          select: { slug: true },
        });
        return { ...r, slug: p?.slug || r.productId };
      })
    );
  }

  // 1. Rule-based candidates
  let recs = await ruleBasedRecommendations(ctx, limit);
  if (!recs.length) return [];

  // 2. Derive persona
  const { persona, intentScore, budgetTier } = await derivePersona(ctx.sessionId);

  // 3. AI enrichment
  if (useAI) {
    let triggerName: string | undefined;
    if (ctx.productId) {
      const p = await db.product.findUnique({
        where: { id: ctx.productId },
        select: { name: true },
      });
      if (p) triggerName = p.name;
    }
    recs = await enrichWithAI(recs, {
      triggerName,
      cartItems: ctx.cartItems,
      persona,
      intentScore,
      budgetTier,
    });
  }

  // 4. Persist cache (best-effort)
  try {
    await db.upsellOffer.create({
      data: {
        sessionId: ctx.sessionId,
        triggerProductId: ctx.productId ?? null,
        payload: recs as any,
        modelVersion: MODEL_VERSION,
        expiresAt: new Date(Date.now() + OFFER_TTL_MIN * 60 * 1000),
      },
    });
  } catch (e) {
    console.warn('[upsell] cache write failed:', e);
  }

  return recs.slice(0, limit);
}

/**
 * Mark an offer as clicked/added (for analytics).
 */
export async function markOfferInteraction(
  sessionId: string,
  productId: string,
  type: 'clicked' | 'added'
) {
  const offers = await db.upsellOffer.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  for (const o of offers) {
    const payload = o.payload as Recommendation[];
    if (Array.isArray(payload) && payload.some((r) => r.productId === productId)) {
      await db.upsellOffer.update({
        where: { id: o.id },
        data: type === 'clicked' ? { clicked: true } : { added: true, clicked: true },
      });
      break;
    }
  }
}
