import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deepSeekChat, extractJson } from '@/lib/deepseek';
import { createOrder, cleanText, KUWAIT_GOVERNORATES } from '@/lib/create-order';
import { normalizeKwPhone, isValidKwPhone } from '@/lib/customer-auth';
import { getShippingSettings } from '@/lib/settings';
import { formatKwdPlain } from '@/lib/utils/format';

export const maxDuration = 60;

/* ============================================================================
 * AI Shopping Agent — "تحدث مع المحل" v2
 *  - knows the full catalog (smart multi-strategy search on every turn)
 *  - understands what the customer wants (full conversation context)
 *  - builds an order draft step-by-step (products, name, phone, address)
 *  - confirms the summary with the customer, then places a REAL order
 *  - after placing: sends order link + account credentials + shipping
 *    info + how to track — exactly like a human sales rep would.
 * Statelessness: the DRAFT travels with the client on every request,
 * the server re-validates everything on each turn.
 * ========================================================================== */

export interface AgentDraftItem {
  productId: string;
  qty: number;
}

export interface AgentDraft {
  items: AgentDraftItem[];
  name?: string;
  phone?: string;
  governorate?: string;
  area?: string;
  address?: string;
  notes?: string;
  /** set once the order is placed so the UI can render the receipt card */
  placedOrder?: {
    orderNumber: string;
    total: number;
    phone: string;
    itemCount: number;
  } | null;
}

interface ChatProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  categoryName?: string | null;
  stock?: number;
}

/* ---------------------------------------------------------------------------
 * 1) Catalog search — multi-strategy so the agent "knows the whole store"
 * ------------------------------------------------------------------------- */
const STOP_WORDS = new Set([
  'في','من','على','عن','الى','إلى','ابي','أبي','ابغى','أبغى','أبغي','ابغي','بغي','ودي','ودّي','أبغيه','عطني','اتنى',
  'أريد','اريد','أبيه','دور','ادور','أدور','يدور','عطوني','عندكم','عندك','موجود','عندنا',
  'عندي','وش','شنو','شلون','كم','سعر','بسعر','حلو','حلوة','أحسن','احسن','افضل','أفضل','اللي','ذي','هذا',
  'هذي','كان','ممكن','لو','سمحلي','هلا','والله','الله','يعطيك','العافية','شكرا','شكراً',
  'i','want','need','looking','for','the','a','an','please','can','you','have','do','me','my','show','find',
]);

function tokenize(q: string): string[] {
  // strip phone numbers AND their lead-in words (رقمي 55123777 → gone) so
  // "رقمي" doesn't match digital scales when the customer means "my number"
  const stripped = q
    .replace(/(?:\+?965[\s-]?)?[569]\d{7}/g, ' ')
    .replace(/\b(?:رقمي|رقم|هاتفي|هاتف|جوال|موبايلي|موبايل|رقمه|رقمها)\s*$/gu, ' ')
    .replace(/\b(?:رقمي|رقم|هاتفي|هاتف|جوال)\s+(?=[569]\d{7})/gu, ' ');
  return stripped
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t.toLowerCase()))
    .slice(0, 6);
}

async function searchCatalog(q: string, lang: 'ar' | 'en'): Promise<ChatProduct[]> {
  const tokens = tokenize(q);
  if (!tokens.length) return [];

  // category-aware: if a token matches a category name, boost its products
  const cats = await db.category.findMany({ select: { id: true, name: true, nameEn: true } });
  const matchedCatIds = cats
    .filter(
      (c) =>
        tokens.some((t) => c.name.includes(t) || t.includes(c.name)) ||
        (c.nameEn && tokens.some((t) => c.nameEn!.toLowerCase().includes(t.toLowerCase())))
    )
    .map((c) => c.id);

  const baseWhere = { disableOOS: false };

  // two-phase fetch so name matches are NEVER crowded out by description
  // matches: phase A = any token in name/sku, phase B = any token in description
  const nameWhere = {
    ...baseWhere,
    OR: [
      ...tokens.flatMap((t) => [
        { name: { contains: t } },
        { nameEn: { contains: t } },
        { sku: { contains: t } },
      ]),
      { name: { contains: q } },
      { nameEn: { contains: q } },
    ],
  };
  const descWhere = {
    ...baseWhere,
    OR: [
      ...tokens.flatMap((t) => [
        { description: { contains: t } },
        { descriptionEn: { contains: t } },
      ]),
      ...(matchedCatIds.length ? [{ categoryId: { in: matchedCatIds } }] : []),
    ],
  };

  const [byName, byDesc] = await Promise.all([
    db.product.findMany({ where: nameWhere, take: 30, orderBy: [{ soldCount: 'desc' }], include: { category: true } }),
    db.product.findMany({ where: descWhere, take: 30, orderBy: [{ soldCount: 'desc' }], include: { category: true } }),
  ]);

  // merge + dedupe (name matches win)
  const seen = new Set<string>();
  const candidates: any[] = [];
  for (const p of [...byName, ...byDesc]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      candidates.push(p);
    }
  }

  // IDF-style token rarity: a token that matches FEW product names is the
  // customer's real intent ("عطر") and must outweigh common adjectives
  // ("شحن", "سريع") that match hundreds of products.
  const totalProducts = 2638;
  const tokenWeight = new Map<string, number>();
  for (const t of tokens) {
    let n = 0;
    for (const p of candidates) {
      const nm = `${p.name || ''} ${p.nameEn || ''}`;
      if (nm.includes(t)) n++;
    }
    // rare among candidates → heavier (log scale, clamped)
    const w = Math.max(1, Math.min(5, Math.log((candidates.length + 2) / (n + 1)) + 1));
    tokenWeight.set(t, w);
  }

  // word-level Arabic-aware matching: "عطر" must match the WORD "عطر",
  // not the substring inside "معطر" / "عطرية".
  const wordsOf = (s: string) => (s || '').split(/[\s\u0640]+/).filter(Boolean);
  const scored = candidates
    .map((p) => {
      let score = 0;
      const name = (lang === 'en' ? p.nameEn || p.name : p.name) || '';
      const nameWords = wordsOf(`${p.name || ''} ${p.nameEn || ''}`);
      const desc = (lang === 'en' ? p.descriptionEn || p.description : p.description) || '';
      for (const t of tokens) {
        const w = tokenWeight.get(t) || 1;
        if (nameWords.includes(t)) score += 6 * w; // exact word match
        else if (nameWords.some((nw) => nw.startsWith(t) || t.startsWith(nw))) score += 3 * w; // word-boundary match
        else if (name.includes(t)) score += 2 * w; // substring fallback (weaker)
        if (desc.includes(t)) score += 0.5 * w;
      }
      if (matchedCatIds.includes(p.categoryId)) score += 3;
      if (p.isBestSeller) score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || (b.p.soldCount || 0) - (a.p.soldCount || 0))
    .slice(0, 10);

  return scored.map((x) => toChatProduct(lang)(x.p));
}

function toChatProduct(lang: 'ar' | 'en') {
  return (p: any): ChatProduct => ({
    id: p.id,
    slug: p.slug,
    name: lang === 'en' && p.nameEn ? p.nameEn : p.name,
    price: p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price,
    image: p.thumb || (p.images ? p.images.split(',')[0] : null),
    categoryName: p.category?.name ?? null,
    stock: p.quantity,
  });
}

/* ---------------------------------------------------------------------------
 * 2) Draft helpers
 * ------------------------------------------------------------------------- */
function sanitizeDraft(raw: any): AgentDraft {
  const d: AgentDraft = { items: [], placedOrder: null };
  if (Array.isArray(raw?.items)) {
    for (const it of raw.items.slice(0, 20)) {
      const id = typeof it?.productId === 'string' ? it.productId.slice(0, 40) : '';
      const qty = Math.max(1, Math.min(20, Math.floor(Number(it?.qty) || 1)));
      if (id && /^[a-zA-Z0-9_-]+$/.test(id)) {
        const ex = d.items.find((x) => x.productId === id);
        if (ex) ex.qty = Math.min(20, ex.qty + qty);
        else d.items.push({ productId: id, qty });
      }
    }
  }
  if (raw?.name) d.name = cleanText(raw.name, 80) || undefined;
  if (raw?.phone) {
    const ph = normalizeKwPhone(String(raw.phone));
    if (isValidKwPhone(ph)) d.phone = ph;
  }
  if (raw?.governorate) {
    const g = cleanText(raw.governorate, 50);
    if (KUWAIT_GOVERNORATES.has(g)) d.governorate = g;
  }
  if (raw?.area) d.area = cleanText(raw.area, 80) || undefined;
  if (raw?.address) d.address = cleanText(raw.address, 300) || undefined;
  if (raw?.notes) d.notes = cleanText(raw.notes, 300) || undefined;
  return d;
}

async function draftProducts(draft: AgentDraft, lang: 'ar' | 'en') {
  if (!draft.items.length) return [];
  const rows = await db.product.findMany({
    where: { id: { in: draft.items.map((i) => i.productId) } },
    include: { category: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return draft.items
    .map((i) => {
      const p = byId.get(i.productId);
      if (!p) return null;
      const cp = toChatProduct(lang)(p);
      return { ...cp, qty: i.qty, lineTotal: cp.price * i.qty };
    })
    .filter(Boolean) as (ChatProduct & { qty: number; lineTotal: number })[];
}

/* ---------------------------------------------------------------------------
 * 3) Order receipt — link + account + shipping + tracking (user requirement)
 * ------------------------------------------------------------------------- */
function receiptMessage(
  order: { orderNumber: string; total: number; phone: string; items: any[]; shipping: number },
  ship: { price: number; freeThreshold: number },
  lang: 'ar' | 'en'
): string {
  const count = order.items?.length || 0;
  if (lang === 'en') {
    return [
      `✅ Your order is confirmed — it's on its way!`,
      ``,
      `📦 Order number: ${order.orderNumber}`,
      `💰 Total: ${formatKwdPlain(order.total)} KWD (${count} item${count > 1 ? 's' : ''}${order.shipping === 0 ? ' · FREE shipping' : ` · shipping ${formatKwdPlain(order.shipping)} KWD`})`,
      ``,
      `👤 Your account: log in from "My Account" with your phone ${order.phone} — the password is the same number.`,
      `🚚 Shipping: 1-3 working days to all Kuwait governorates · shipping ${formatKwdPlain(ship.price)} KWD, FREE over ${formatKwdPlain(ship.freeThreshold)} KWD · cash on delivery.`,
      `🔎 To track your order: open "Track your order" and enter ${order.orderNumber} + your phone number.`,
    ].join('\n');
  }
  return [
    `✅ تم تأكيد طلبك بنجاح، وبإذن الله في طريقه إليك!`,
    ``,
    `📦 رقم الطلب: ${order.orderNumber}`,
    `💰 الإجمالي: ${formatKwdPlain(order.total)} د.ك (${count} منتج${order.shipping === 0 ? ' · شحن مجاني' : ` · شحن ${formatKwdPlain(order.shipping)} د.ك`})`,
    ``,
    `👤 حسابك: سجّل دخولك من «حسابي» برقم هاتفك ${order.phone} وكلمة المرور نفس الرقم.`,
    `🚚 الشحن: ١ إلى ٣ أيام عمل لكل محافظات الكويت · أجرة الشحن ${formatKwdPlain(ship.price)} د.ك ومجاني للطلبات من ${formatKwdPlain(ship.freeThreshold)} د.ك · الدفع عند الاستلام.`,
    `🔎 لتتبع طلبك: افتح «تتبع طلبك» واكتب رقم الطلب ${order.orderNumber} ورقم هاتفك.`,
  ].join('\n');
}

/* ---------------------------------------------------------------------------
 * 4) Rule-based fallback agent (works even with zero AI configured)
 * ------------------------------------------------------------------------- */
const GOV_KEYWORDS: [RegExp, string][] = [
  [/العاصمة|العاصمه|Asima|Capital/i, 'محافظة العاصمة'],
  [/حولي|Hawalli|هولي/i, 'محافظة حولي'],
  [/الفروانية|فروانية|Farwaniya/i, 'محافظة الفروانية'],
  [/الجهراء|جهرا|Jahra/i, 'محافظة الجهراء'],
  [/الأحمدي|الاحمدي|Ahmadi|احمدي/i, 'محافظة الأحمدي'],
  [/مبارك الكبير|Mubarak/i, 'محافظة مبارك الكبير'],
];

const KW_PHONE_RE = /(?:\+?965[\s-]?)?([569]\d{7})(?!\d)/;

const NAME_STOP = new Set([
  'رقمي','رقم','رقمية','رقميّ','هاتفي','هاتف','جوال','موبايل','من','في','على','وانا','وأنا','و','انا','أنا','بس','بعدين',
]);

function ruleBasedExtract(text: string, draft: AgentDraft): AgentDraft {
  const d: AgentDraft = { ...draft, items: [...draft.items], placedOrder: draft.placedOrder ?? null };
  const m = text.match(KW_PHONE_RE);
  if (m) d.phone = normalizeKwPhone(m[1]);
  for (const [re, gov] of GOV_KEYWORDS) {
    if (re.test(text)) { d.governorate = gov; break; }
  }
  // name: words after اسمي/انا — stop at phone lead-ins, digits, prepositions
  const nameMatch =
    text.match(/(?:اسمي|انا|أنا|اسم)\s+((?:[\u0600-\u06FFa-zA-Z]{2,30}\s?){1,3})/) ||
    text.match(/(?:my name is|i am|i'm)\s+((?:[a-zA-Z]{2,30}\s?){1,3})/i);
  if (nameMatch && (!d.name || d.name.length < 2)) {
    const cleaned = nameMatch[1]
      .trim()
      .split(/\s+/)
      .filter((w) => !NAME_STOP.has(w) && !/^\d+$/.test(w))
      .slice(0, 3)
      .join(' ');
    if (cleaned.length >= 2) d.name = cleanText(cleaned, 80);
  }
  const addrMatch = text.match(/(?:العنوان|عنواني|منطقة|قطعة|شارع|بلوك|بناية|جادة|دوار)\s*(.{5,120})/);
  if (addrMatch && (!d.address || d.address.length < 5)) d.address = cleanText(addrMatch[1], 300);
  return d;
}

function draftComplete(d: AgentDraft): boolean {
  return !!(
    d.items.length &&
    d.name &&
    d.name.length >= 2 &&
    d.phone &&
    d.governorate &&
    d.address &&
    d.address.length >= 5
  );
}

/* ---------------------------------------------------------------------------
 * 5) Main handler
 * ------------------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  let lang: 'ar' | 'en' = 'ar';
  try {
    const body = await req.json();
    lang = body.lang === 'en' ? 'en' : 'ar';
    const history: { role: string; content: string }[] = Array.isArray(body.messages)
      ? body.messages.slice(-10)
      : [];
    const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content || '';
    const draft = sanitizeDraft(body.draft);
    const customerConfirmedBefore = body.customerConfirmed === true;
    /** product ids offered in the previous assistant message (chat chips) —
     * lets the agent add them to the draft on the NEXT turn when the
     * customer says "أبغيه" / "I want it" even if this turn's search differs */
    const lastOfferedIds: string[] = Array.isArray(body.lastOfferedIds)
      ? body.lastOfferedIds.map(String).slice(0, 8)
      : [];

    /* --- focus mode: when the draft has items and the customer is giving
       personal info (phone / governorate / address), skip noisy catalog
       search so the LLM concentrates on completing the order draft --- */
    const personalInfoTurn =
      draft.items.length > 0 &&
      (KW_PHONE_RE.test(lastUser) ||
        GOV_KEYWORDS.some(([re]) => re.test(lastUser)) ||
        /(?:العنوان|عنواني|منطقة|قطعة|شارع|بلوك|بناية|جادة|دوار|مسكن)/.test(lastUser));

    // --- catalog search for THIS turn + current draft contents ---
    const [searchResultsRaw, draftLines, ship, categories] = await Promise.all([
      personalInfoTurn
        ? Promise.resolve([] as ChatProduct[])
        : searchCatalog(lastUser, lang).catch(() => [] as ChatProduct[]),
      draftProducts(draft, lang).catch(() => []),
      getShippingSettings(),
      db.category.findMany({ select: { name: true, nameEn: true }, take: 60 }),
    ]);

    // products offered in the previous reply (chips) stay available to the
    // LLM so "أبغيه" on the next turn resolves to the right product
    const offeredProducts = lastOfferedIds.length
      ? await db.product
          .findMany({
            where: { id: { in: lastOfferedIds } },
            include: { category: true },
          })
          .then((rows) => rows.map(toChatProduct(lang)))
          .catch(() => [] as ChatProduct[])
      : [];
    const searchResults = [
      ...searchResultsRaw,
      ...offeredProducts.filter((o) => !searchResultsRaw.some((s) => s.id === o.id)),
    ].slice(0, 14);

    const draftSubtotal = draftLines.reduce((s, l) => s + l.lineTotal, 0);
    const draftShipping = ship.freeThreshold > 0 && draftSubtotal >= ship.freeThreshold ? 0 : ship.price;
    const draftTotal = Math.round((draftSubtotal + (draftSubtotal > 0 ? draftShipping : 0)) * 1000) / 1000;

    /* ---- tracking intent: customer asks about an existing order ---- */
    const trackIntent =
      /(وين|فين|شلون|وصل|وصلني|تتبع|طلبي|شحال|متى).*(طلب|شحن|توصيل|اوردر)/.test(lastUser) ||
      /track|where.*order|my order|delivery status/i.test(lastUser);
    const recentOrders = trackIntent && draft.phone
      ? await db.order
          .findMany({
            where: { phone: draft.phone },
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: { items: true },
          })
          .catch(() => [])
      : [];

    /* ================= LLM TURN (DeepSeek → ZAI → rules) ================= */
    const systemPrompt = buildSystemPrompt({
      lang,
      ship,
      categories,
      searchResults,
      draft,
      draftLines,
      draftTotal,
      draftShipping,
      trackIntent,
      recentOrders: recentOrders as any[],
    });

    const convo = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: String(m.content).slice(0, 1200),
      })),
    ];

    let action: AgentAction | null = null;

    // DeepSeek first (founder's key — supports strict JSON mode)
    const ds = await deepSeekChat(convo as any, {
      temperature: 0.5,
      maxTokens: 700,
      jsonMode: true,
      timeoutMs: 25000,
    });
    if (ds.ok) action = extractJson<AgentAction>(ds.content);

    // z-ai workspace sdk fallback
    if (!action) {
      try {
        const { default: ZAI } = await import('z-ai-web-dev-sdk');
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            ...convo,
            {
              role: 'user',
              content:
                'Respond ONLY with the JSON action object now — no explanations, no markdown fences.',
            },
          ] as any,
        });
        const raw = completion?.choices?.[0]?.message?.content || '';
        action = extractJson<AgentAction>(raw);
      } catch {
        /* fall through */
      }
    }

    /* ================= APPLY ACTION → DRAFT + REPLY ================= */
    let nextDraft: AgentDraft = { ...draft, items: [...draft.items], placedOrder: null };
    let reply = '';
    let products: ChatProduct[] = [];
    let placedOrderInfo: AgentDraft['placedOrder'] = null;
    const userSaidYes = /^(نعم|ايوا|أيوا|اكد|أكد|تأكيد|موافق|زين|ok|yes|confirm)/i.test(lastUser.trim());

    if (action) {
      nextDraft = applyAction(action, nextDraft, searchResults, lastOfferedIds);
      reply = cleanText(action.reply, 1500);
      const chipIds = (action.products || []).slice(0, 6).map(String);
      products = searchResults.filter((p) => chipIds.includes(p.id));
      if (!products.length && !nextDraft.items.length) products = searchResults.slice(0, 4);
    }

    /* ---- deterministic extraction: ALWAYS run the regex extractor on the
       user's message and merge what the LLM missed. LLM = conversation,
       regex = guaranteed structured data (phone/name/governorate/address). ---- */
    if (!userSaidYes) {
      const extracted = ruleBasedExtract(lastUser, nextDraft);
      nextDraft = {
        ...extracted,
        items: nextDraft.items.length ? nextDraft.items : extracted.items,
      };

      /* deterministic product add: clear BUY intent + a search result whose
         name words appear in the customer's message → add it even when the
         LLM forgot. Requires ≥2 significant name words (or the full name). */
      const buyIntent =
        /(أبغي|ابغي|أبي|ابي|أريد|اريد|بغيت|عطني|اعطني|خذلي|ابغيه|أبغيه|طلبت|اطلب|أطلب|order|buy|take it)/i.test(lastUser);
      if (nextDraft.items.length === 0 && buyIntent && searchResultsRaw.length) {
        const msgWords = new Set(lastUser.split(/\s+/));
        const strong = searchResultsRaw.filter((p) => {
          const words = p.name
            .split(/\s+/)
            .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
          const hits = words.filter((w) => msgWords.has(w)).length;
          return words.length <= 2 ? hits >= 1 : hits >= 2;
        });
        if (strong.length >= 1) {
          nextDraft.items.push({ productId: strong[0].id, qty: 1 });
        }
      }
    }

    /* ---- affirmative + exactly ONE product offered → auto-add it
       (the customer's "أبغيه/نعم أكديه" refers to the product just shown) ---- */
    if (
      (userSaidYes || customerConfirmedBefore) &&
      nextDraft.items.length === 0 &&
      offeredProducts.length === 1
    ) {
      nextDraft.items.push({ productId: offeredProducts[0].id, qty: 1 });
    }

    /* ---- explicit server-side confirmation gate ---- */
    const wantsConfirmNow =
      action?.place_order === true || (customerConfirmedBefore && draftComplete(nextDraft)) || (!action && userSaidYes && draftComplete(nextDraft));

    if (wantsConfirmNow && draftComplete(nextDraft)) {
      const freshLines = await draftProducts(nextDraft, lang);
      const sub = freshLines.reduce((s, l) => s + l.lineTotal, 0);
      const shp = ship.freeThreshold > 0 && sub >= ship.freeThreshold ? 0 : ship.price;
      const tot = Math.round((sub + shp) * 1000) / 1000;

      const prevAssistantAsked =
        /اكتب.*«نعم»|اكتب.*نعم|أرسل.*نعم|type.*yes|confirm.*yes|write.*yes|للتأكيد/i.test(
          history.filter((m) => m.role === 'assistant').slice(-1)[0]?.content || ''
        );
      const llmWantsPlace = action?.place_order === true;
      const llmReady = action?.ready_to_confirm === true || llmWantsPlace;
      const shouldPlaceNow =
        llmWantsPlace ||
        ((userSaidYes || customerConfirmedBefore) && (llmReady || prevAssistantAsked || draftComplete(draft)));

      if (shouldPlaceNow) {
        const result = await createOrder({
          phone: nextDraft.phone!,
          customerName: nextDraft.name!,
          address: nextDraft.address!,
          governorate: nextDraft.governorate!,
          area: nextDraft.area || null,
          notes: nextDraft.notes || null,
          paymentMethod: 'cod',
          items: nextDraft.items.map((i) => ({ productId: i.productId, quantity: i.qty })),
          source: 'ai-agent',
        });
        if (result.ok) {
          reply = receiptMessage(
            {
              orderNumber: result.order.orderNumber,
              total: result.order.total,
              phone: result.order.phone,
              items: result.order.items,
              shipping: result.order.shipping,
            },
            ship,
            lang
          );
          placedOrderInfo = {
            orderNumber: result.order.orderNumber,
            total: result.order.total,
            phone: result.order.phone,
            itemCount: result.order.items?.length || 0,
          };
          nextDraft = { items: [], placedOrder: placedOrderInfo };
          products = [];
        } else {
          reply =
            (lang === 'en'
              ? `Couldn't place the order: ${result.error}`
              : `ما قدرت أكمل الطلب: ${result.error}`) +
            (lang === 'en' ? "\nFix it and I'll try again 🙏" : '\nصحّحها وأعيد المحاولة 🙏');
        }
      } else {
        // ask for the explicit final yes
        const lines = freshLines
          .map((l) => `• ${l.name} × ${l.qty} — ${formatKwdPlain(l.lineTotal)} ${lang === 'en' ? 'KWD' : 'د.ك'}`)
          .join('\n');
        reply =
          lang === 'en'
            ? `Perfect! Here's your order summary:\n${lines}\n\n🚚 Shipping: ${shp === 0 ? 'FREE' : formatKwdPlain(shp) + ' KWD'}\n💰 Total: ${formatKwdPlain(tot)} KWD — cash on delivery\n\nType "yes" to confirm and I'll place it right away ✅`
            : `تمام! هذا ملخص طلبك:\n${lines}\n\n🚚 الشحن: ${shp === 0 ? 'مجاني' : formatKwdPlain(shp) + ' د.ك'}\n💰 الإجمالي: ${formatKwdPlain(tot)} د.ك — الدفع عند الاستلام\n\nاكتب «نعم» للتأكيد وأسجّل طلبك على طول ✅`;
      }
    }

    /* ---- HONESTY SHIELD + SELF-HEALING: the LLM must NEVER claim an order
       was placed unless the server actually created one. If the reply claims
       success while placedOrderInfo is null → try to repair (add the single
       offered product the reply focused on, place the real order), else
       replace the reply with the honest missing-info state. */
    if (!placedOrderInfo && reply) {
      const falseClaim =
        /(تم|نأكد|أكدنا|سجلنا|نسجّل|نسجل|أرسلنا|نرسل|جاهز|مؤكد).{0,20}(طلب|الطلب|طلبك|أورد|الأورد)/.test(reply) ||
        /طلبك.{0,10}(رقم|تم|جاهز|مؤكد)/.test(reply) ||
        /order\s*(is\s*)?(confirmed|placed|done)/i.test(reply) ||
        /ORD-/.test(reply);
      if (falseClaim) {
        // repair: add the offered product the reply focused on (if unambiguous)
        if (nextDraft.items.length === 0 && offeredProducts.length > 0) {
          const mentioned = offeredProducts.filter((p) =>
            p.name
              .split(/\s+/)
              .filter(Boolean)
              .some((w) => w.length > 2 && reply.includes(w))
          );
          if (mentioned.length === 1) {
            nextDraft.items.push({ productId: mentioned[0].id, qty: 1 });
          }
        }
        // place the real order now if complete + customer affirmed
        const affirmed = userSaidYes || customerConfirmedBefore || action?.place_order === true;
        let repaired = false;
        if (affirmed && draftComplete(nextDraft)) {
          const fresh = await draftProducts(nextDraft, lang).catch(() => []);
          const sub = fresh.reduce((s, l) => s + l.lineTotal, 0);
          const shp = ship.freeThreshold > 0 && sub >= ship.freeThreshold ? 0 : ship.price;
          const tot = Math.round((sub + shp) * 1000) / 1000;
          const result = await createOrder({
            phone: nextDraft.phone!,
            customerName: nextDraft.name!,
            address: nextDraft.address!,
            governorate: nextDraft.governorate!,
            area: nextDraft.area || null,
            paymentMethod: 'cod',
            items: nextDraft.items.map((i) => ({ productId: i.productId, quantity: i.qty })),
            source: 'ai-agent',
          });
          if (result.ok) {
            reply = receiptMessage(
              {
                orderNumber: result.order.orderNumber,
                total: result.order.total,
                phone: result.order.phone,
                items: result.order.items,
                shipping: result.order.shipping,
              },
              ship,
              lang
            );
            placedOrderInfo = {
              orderNumber: result.order.orderNumber,
              total: result.order.total,
              phone: result.order.phone,
              itemCount: result.order.items?.length || 0,
            };
            nextDraft = { items: [], placedOrder: placedOrderInfo };
            products = [];
            repaired = true;
          }
        }
        if (!repaired) {
          const missing: string[] = [];
          if (!nextDraft.items.length)
            missing.push(lang === 'en' ? 'which product you want' : 'شنو المنتج اللي تبيه');
          if (!nextDraft.name) missing.push(lang === 'en' ? 'your name' : 'اسمك');
          if (!nextDraft.phone) missing.push(lang === 'en' ? 'your phone' : 'رقم هاتفك');
          if (!nextDraft.governorate) missing.push(lang === 'en' ? 'your governorate' : 'محافظتك');
          if (!nextDraft.address) missing.push(lang === 'en' ? 'your address' : 'عنوانك');
          reply =
            missing.length === 0
              ? lang === 'en'
                ? `Here's your final summary — type "yes" and I'll place it:`
                : `هذا ملخص طلبك — اكتب «نعم» وأسجّله فوراً:`
              : lang === 'en'
                ? `Almost there! Just need ${missing.join(', ')} and I'll place the order 🌟`
                : `قربنا نخلص! باقي لي ${missing.join('، ')} وبسجّل طلبك 🌟`;
        }
      }
    }

    /* ---- rule-based fallback when no AI answered ---- */
    if (!reply) {
      const rb = ruleBasedReply({
        lang,
        lastUser,
        draft: nextDraft,
        searchResults,
        draftLines,
        ship,
        trackIntent,
        recentOrders: recentOrders as any[],
      });
      reply = rb.reply;
      products = rb.products;
      nextDraft = rb.draft;
    }

    return NextResponse.json({
      reply,
      products,
      draft: nextDraft,
      placedOrder: placedOrderInfo,
    });
  } catch {
    return NextResponse.json(
      {
        reply:
          lang === 'en'
            ? 'Small connection hiccup.. please try again 🙏'
            : 'صار خطأ بسيط بالاتصال.. جرّب مرة ثانية بعد شوي 🙏',
        products: [],
        draft: null,
      },
      { status: 200 }
    );
  }
}

/* ---------------------------------------------------------------------------
 * Agent action protocol
 * ------------------------------------------------------------------------- */
interface AgentAction {
  reply: string;
  products?: string[];
  draft_update?: {
    add?: { id: string; qty?: number }[];
    remove?: string[];
    set_qty?: { id: string; qty: number }[];
    name?: string | null;
    phone?: string | null;
    governorate?: string | null;
    area?: string | null;
    address?: string | null;
    notes?: string | null;
  };
  ready_to_confirm?: boolean;
  place_order?: boolean;
}

function applyAction(a: AgentAction, draft: AgentDraft, searchResults: ChatProduct[], lastOfferedIds: string[] = []): AgentDraft {
  const d: AgentDraft = { ...draft, items: draft.items.map((i) => ({ ...i })), placedOrder: null };
  const knownIds = new Set([
    ...searchResults.map((p) => p.id),
    ...d.items.map((i) => i.productId),
    ...lastOfferedIds,
  ]);
  const u = a.draft_update;
  if (u) {
    if (Array.isArray(u.add)) {
      for (const it of u.add.slice(0, 10)) {
        const id = String(it?.id || '').slice(0, 40);
        const qty = Math.max(1, Math.min(20, Math.floor(Number(it?.qty) || 1)));
        if (id && knownIds.has(id)) {
          const ex = d.items.find((x) => x.productId === id);
          if (ex) ex.qty = Math.min(20, ex.qty + qty);
          else d.items.push({ productId: id, qty });
        }
      }
    }
    if (Array.isArray(u.remove)) {
      const rm = new Set(u.remove.slice(0, 10).map(String));
      d.items = d.items.filter((i) => !rm.has(i.productId));
    }
    if (Array.isArray(u.set_qty)) {
      for (const it of u.set_qty.slice(0, 10)) {
        const id = String(it?.id || '');
        const qty = Math.floor(Number(it?.qty));
        const ex = d.items.find((x) => x.productId === id);
        if (ex && qty >= 1) ex.qty = Math.min(20, qty);
      }
    }
    if (typeof u.name === 'string' && u.name.trim()) d.name = cleanText(u.name, 80);
    if (typeof u.phone === 'string' && u.phone.trim()) {
      const ph = normalizeKwPhone(u.phone);
      if (isValidKwPhone(ph)) d.phone = ph;
    }
    if (typeof u.governorate === 'string') {
      const g = cleanText(u.governorate, 50);
      if (KUWAIT_GOVERNORATES.has(g)) d.governorate = g;
    }
    if (typeof u.area === 'string' && u.area.trim()) d.area = cleanText(u.area, 80);
    if (typeof u.address === 'string' && u.address.trim()) d.address = cleanText(u.address, 300);
    if (typeof u.notes === 'string' && u.notes.trim()) d.notes = cleanText(u.notes, 300);
  }
  return d;
}

/* ---------------------------------------------------------------------------
 * System prompt
 * ------------------------------------------------------------------------- */
function buildSystemPrompt(ctx: {
  lang: 'ar' | 'en';
  ship: { price: number; freeThreshold: number; note?: string };
  categories: { name: string; nameEn: string | null }[];
  searchResults: ChatProduct[];
  draft: AgentDraft;
  draftLines: (ChatProduct & { qty: number; lineTotal: number })[];
  draftTotal: number;
  draftShipping: number;
  trackIntent: boolean;
  recentOrders: any[];
}): string {
  const { lang, ship, categories, searchResults, draft, draftLines, draftTotal, draftShipping, trackIntent, recentOrders } = ctx;

  const catList = categories.map((c) => (lang === 'en' ? c.nameEn || c.name : c.name)).join('، ');
  const searchList = searchResults.length
    ? searchResults
        .map(
          (p) =>
            `- id:${p.id} | ${p.name} | ${formatKwdPlain(p.price)} ${lang === 'en' ? 'KWD' : 'د.ك'} | ${p.categoryName || ''}${p.stock !== undefined ? ` | stock:${p.stock}` : ''}`
        )
        .join('\n')
    : lang === 'en'
      ? '(no direct matches — ask them to rephrase)'
      : '(ما فيه نتائج مطابقة — اطلب منهم يعيدون الصياغة)';

  const draftText = draft.items.length
    ? [
        lang === 'en' ? 'CURRENT ORDER DRAFT:' : 'مسودة الطلب الحالية:',
        ...draftLines.map(
          (l) => `- id:${l.id} | ${l.name} × ${l.qty} = ${formatKwdPlain(l.lineTotal)} ${lang === 'en' ? 'KWD' : 'د.ك'}`
        ),
        `${lang === 'en' ? 'Customer name' : 'اسم العميل'}: ${draft.name || '—'}`,
        `${lang === 'en' ? 'Phone' : 'الهاتف'}: ${draft.phone || '—'}`,
        `${lang === 'en' ? 'Governorate' : 'المحافظة'}: ${draft.governorate || '—'}`,
        `${lang === 'en' ? 'Address' : 'العنوان'}: ${draft.address || '—'}`,
        lang === 'en'
          ? `Shipping: ${draftShipping === 0 ? 'FREE' : formatKwdPlain(draftShipping) + ' KWD'} · TOTAL: ${formatKwdPlain(draftTotal)} KWD`
          : `الشحن: ${draftShipping === 0 ? 'مجاني' : formatKwdPlain(draftShipping) + ' د.ك'} · الإجمالي: ${formatKwdPlain(draftTotal)} د.ك`,
      ].join('\n')
    : lang === 'en'
      ? 'CURRENT ORDER DRAFT: (empty)'
      : 'مسودة الطلب الحالية: (فارغة)';

  const ordersText =
    trackIntent && recentOrders?.length
      ? recentOrders
          .map(
            (o) =>
              `- ${o.orderNumber} | ${new Date(o.createdAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-KW')} | ${o.status} | ${formatKwdPlain(o.total)} ${lang === 'en' ? 'KWD' : 'د.ك'} | ${(o.items || []).length} item(s)`
          )
          .join('\n')
      : '';

  const persona =
    lang === 'en'
      ? `You are "Mahal Shop Agent" — a real human-like sales rep for Kuwait's dropshipping platform (marketers earn 1–2 KWD commission per delivered order via "Sell With Us"). You chat in friendly, concise English (max 5 lines). You KNOW the whole catalog and your goal is to complete the sale end-to-end: find what they want → build the order → collect delivery details → confirm → place the real order.`
      : `أنت "مندوب محل شوب" — مندوب مبيعات حقيقي لأول منصة دروب شيبنج في الكويت. ترد بلهجة كويتية ودّية ومختصرة (٥ أسطر كحد أقصى). تعرف المنتجات كلها، وهدفك تُكمّل البيع من أول لآخر: تلقى اللي يبيه → تبني الطلب → تجمع بيانات التوصيل → تأكيد → تسجّل الطلب الفعلي. ولو سأل العميل عن الربح أو التسويق، اشرح له برنامج المسوّقين المجاني (عمولة 1–2 د.ك على كل طلب يوصَل من زر «سوّق معنا»).`;

  const rules =
    lang === 'en'
      ? `
STORE FACTS (use these, never invent):
- Prices in KWD. Cash on delivery. Delivery 1-3 working days, ALL Kuwait governorates.
- Shipping ${formatKwdPlain(ship.price)} KWD — FREE for orders ${formatKwdPlain(ship.freeThreshold)} KWD and above.
- Governorates (exact spelling required): محافظة العاصمة، محافظة حولي، محافظة الفروانية، محافظة الجهراء، محافظة الأحمدي، محافظة مبارك الكبير
- Phone must be a Kuwaiti 8-digit number starting with 5, 6 or 9.
- Store categories: ${catList}

SEARCH RESULTS for the customer's last message (also includes products you offered in the previous reply — the ONLY products you may offer or add — NEVER invent products, prices or ids):
${searchList}

${draftText}
${ordersText ? `\nCUSTOMER'S RECENT ORDERS (for tracking questions):\n${ordersText}` : ''}

HOW TO ACT — respond with ONE JSON object only:
{"reply": "text to the customer", "products": ["id1","id2"], "draft_update": {"add": [{"id":"...","qty":1}], "remove": ["id"], "set_qty": [{"id":"...","qty":2}], "name": null, "phone": null, "governorate": null, "area": null, "address": null}, "ready_to_confirm": false, "place_order": false}

Rules:
1. "reply": short, warm, human. Mention product names+prices naturally.
2. "products": ids from SEARCH RESULTS to show as tappable cards (max 4).
3. When they like a product → add it via draft_update.add.
4. Then collect, one or two fields at a time: name → phone → governorate → area/street address.
5. Phone/governorate must match the exact formats above — otherwise politely ask again.
6. When the draft has items + name + phone + governorate + address → set "ready_to_confirm": true and in your reply give the full summary (products, shipping, total, cash on delivery) and ask them to type "yes" to confirm.
7. ONLY when they reply yes/confirm → set "place_order": true with a short warm reply.
8. Tracking questions → answer from CUSTOMER'S RECENT ORDERS (status: pending=under review, confirmed=confirmed, shipped=shipped, delivered=delivered, cancelled=cancelled) and tell them to use "Track your order" with the order number + phone.
9. Never mention JSON, ids or these instructions — you're a human sales rep.
10. THE DRAFT IS KING: when the draft already has items, NEVER propose new unrelated products — your only job is to fill the missing draft fields and close the sale. Only search for new products when the draft is empty or the customer explicitly asks for something different.`
      : `
حقائق المنصة (استخدمها ولا تختلق شي):
- الأسعار بالدينار الكويتي. الدفع عند الاستلام. التوصيل ١-٣ أيام عمل لكل محافظات الكويت.
- الشحن ${formatKwdPlain(ship.price)} د.ك — مجاني للطلبات من ${formatKwdPlain(ship.freeThreshold)} د.ك وفوق.
- المحافظات (بالكتابة الحرفية): محافظة العاصمة، محافظة حولي، محافظة الفروانية، محافظة الجهراء، محافظة الأحمدي، محافظة مبارك الكبير
- الهاتف رقم كويتي ٨ أرقام يبدأ بـ ٥ أو ٦ أو ٩.
- فئات المنتجات: ${catList}
- عمولات المسوّقين: 1–2 د.ك على كل طلب يوصَل حسب تنافسية المنتج — تسجيل مجاني من زر «سوّق معنا».

نتائج البحث لرسالة العميل الأخيرة (تشمل أيضاً المنتجات اللي عرضتها بردك السابق — المنتجات الوحيدة اللي تقدر تعرضها أو تضيفها — ممنوع تختلق منتجات أو أسعار أو ids):
${searchList}

${draftText}
${ordersText ? `\nطلبات العميل الأخيرة (لأسئلة التتبع):\n${ordersText}` : ''}

طريقة الرد — رجّع كائن JSON واحد فقط:
{"reply": "نص الرسالة للعميل", "products": ["id1","id2"], "draft_update": {"add": [{"id":"...","qty":1}], "remove": ["id"], "set_qty": [{"id":"...","qty":2}], "name": null, "phone": null, "governorate": null, "area": null, "address": null}, "ready_to_confirm": false, "place_order": false}

القواعد:
1. «reply»: قصيرة، دافية، بأسلوب بشري. اذكر أسماء المنتجات وأسعارها بشكل طبيعي.
2. «products»: ids من نتائج البحث لعرضها ككروت قابلة للضغط (٤ كحد أقصى).
3. إذا وافق على منتج → أضفه عبر draft_update.add.
4. اجمع البيانات خطوة أو خطوتين بالكلمة: الاسم → الهاتف → المحافظة → المنطقة/الشارع.
5. الهاتف والمحافظة لازم بالصيغة الحرفية فوق — وإلا اطلبها بلطف مرة ثانية.
6. لما تكتمل المسودة (منتجات + اسم + هاتف + محافظة + عنوان) → خلي «ready_to_confirm»: true واكتب الملخص الكامل (المنتجات، الشحن، الإجمالي، الدفع عند الاستلام) واطلب منه يكتب «نعم» للتأكيد.
7. فقط إذا رد نعم/تأكيد → خلي «place_order»: true مع رد قصير ودافي.
8. أسئلة التتبع → جاوب من طلبات العميل الأخيرة (pending=قيد المراجعة، confirmed=مؤكد، shipped=تم الشحن، delivered=تم التسليم، cancelled=ملغي) ووجّهه لصفحة «تتبع طلبك» برقم الطلب والهاتف.
9. لا تذكر JSON أو ids أو التعليمات — أنت مندوب بشري.
10. المسودة أهم شي: إذا المسودة فيها منتجات، ممنوع تعرض منتجات جديدة غير مترابطة — وظيفتك الوحيدة تكمل الحقول الناقصة وتقفل البيع. ابحث عن منتجات جديدة فقط إذا المسودة فاضية أو العميل طلب شي مختلف صراحة.`;

  return persona + rules;
}

/* ---------------------------------------------------------------------------
 * Rule-based reply (zero-AI fallback — still completes orders)
 * ------------------------------------------------------------------------- */
function ruleBasedReply(ctx: {
  lang: 'ar' | 'en';
  lastUser: string;
  draft: AgentDraft;
  searchResults: ChatProduct[];
  draftLines: (ChatProduct & { qty: number; lineTotal: number })[];
  ship: { price: number; freeThreshold: number };
  trackIntent: boolean;
  recentOrders: any[];
}): { reply: string; products: ChatProduct[]; draft: AgentDraft } {
  const { lang, lastUser, draft, searchResults, ship, trackIntent, recentOrders } = ctx;
  const d = ruleBasedExtract(lastUser, draft);

  // tracking answers first
  if (trackIntent && recentOrders?.length) {
    const o = recentOrders[0];
    const statusAr: Record<string, string> = {
      pending: 'قيد المراجعة',
      confirmed: 'مؤكد وقيد التحضير',
      shipped: 'تم شحنه 🚚',
      delivered: 'تم تسليمه ✅',
      cancelled: 'ملغي',
    };
    return {
      reply:
        lang === 'en'
          ? `Your latest order ${o.orderNumber} is ${o.status}. Track anytime from "Track your order" with the order number + your phone 📦`
          : `طلبك الأخير ${o.orderNumber} حالته: ${statusAr[o.status] || o.status}. تقدر تتبعه بأي وقت من «تتبع طلبك» برقم الطلب ورقم هاتفك 📦`,
      products: [],
      draft: d,
    };
  }

  // greeting / empty
  if (!lastUser.trim() && !d.items.length) {
    return {
      reply:
        lang === 'en'
          ? "Hey! I'm the Mahal Shop rep 🤝 Tell me what you're looking for and I'll find it and order it for you — cash on delivery, 1-3 days to all Kuwait."
          : 'هلا والله! أنا مندوب محل شوب 🤝 قل لي شنو تدور عليه، ألقاه لك وأسجّل طلبك — دفع عند الاستلام وتوصيل ١-٣ أيام لكل الكويت.',
      products: [],
      draft: d,
    };
  }

  // product found → propose
  if (searchResults.length) {
    const list = searchResults
      .slice(0, 4)
      .map((p) => `• ${p.name} — ${formatKwdPlain(p.price)} ${lang === 'en' ? 'KWD' : 'د.ك'}`)
      .join('\n');
    return {
      reply:
        (lang === 'en' ? 'Found these for you:\n' : 'هذي اللي لقيتها لك:\n') +
        list +
        (lang === 'en'
          ? "\nLike any of them? Say the word and I'll start your order 😊"
          : '\nعاجبك واحد منهم؟ قل لي وأبدأ لك الطلب 😊'),
      products: searchResults.slice(0, 4),
      draft: d,
    };
  }

  // order collection progress
  if (d.items.length && !draftComplete(d)) {
    const missing: string[] = [];
    if (!d.name || d.name.length < 2) missing.push(lang === 'en' ? 'your name' : 'اسمك');
    else if (!d.phone)
      missing.push(lang === 'en' ? 'your phone (8 digits, 5/6/9)' : 'رقم هاتفك (٨ أرقام يبدأ بـ ٥ أو ٦ أو ٩)');
    else if (!d.governorate) missing.push(lang === 'en' ? 'your governorate' : 'محافظتك');
    else if (!d.address || d.address.length < 5)
      missing.push(lang === 'en' ? 'your area/street address' : 'منطقتك وشارعك');
    const need = missing[0];
    return {
      reply:
        lang === 'en'
          ? `Great choice! To complete your order I just need ${need} 👇`
          : `اختيار ممتاز! عشان أكمل طلبك أحتاج ${need} 👇`,
      products: [],
      draft: d,
    };
  }

  if (draftComplete(d)) {
    return {
      reply:
        lang === 'en'
          ? 'Your order details are complete! Type "yes" to confirm and I\'ll place it right away.'
          : 'بيانات طلبك اكتملت! اكتب «نعم» للتأكيد وأسجّل طلبك فوراً.',
      products: [],
      draft: d,
    };
  }

  return {
    reply:
      lang === 'en'
        ? "Tell me what you're looking for (perfume, watch, kitchen blender..) and I'll find it 🛍️"
        : 'قل لي شنو تدور عليه (عطر، ساعة، خلاط للمطبخ..) وألقاه لك 🛍️',
    products: [],
    draft: d,
  };
}
