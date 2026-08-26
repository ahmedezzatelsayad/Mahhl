import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { adminOnly } from '@/lib/auth';
import { verifyCustomer, normalizeKwPhone, isValidKwPhone } from '@/lib/customer-auth';
import { AUTO_SHIP_ARRIVAL_NOTE } from '@/lib/auto-ship';
import { getShippingSettings } from '@/lib/settings';

/* ============================================================
 * PRODUCTION HARDENING (per the pre-launch review)
 *  1. Prices & names come from the DATABASE — client values ignored
 *  2. Shipping fee/threshold computed server-side from settings
 *  3. Kuwait mobile validated (8 digits, starts 5/6/9)
 *  4. Duplicate-order guard: same phone within 90s returns the
 *     original order instead of creating a second one
 *  5. IP rate limit: 6 orders / 15 min (in-memory ring)
 *  6. Honeypot field ("website") — bots fill it, we reject silently
 *  7. All free-text sanitized + length-capped
 * ============================================================ */

const MAX_ITEMS = 50;
const MAX_QTY_PER_ITEM = 20;
const DUPLICATE_WINDOW_MS = 90_000;
const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW_MS = 15 * 60_000;

/** Simple in-memory rate limiter (per runtime instance — enough vs spam waves). */
const ipHits = new Map<string, number[]>();
function ipLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  // keep the map small
  if (ipHits.size > 500) {
    for (const [k, v] of ipHits) {
      if (v.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) ipHits.delete(k);
    }
  }
  return false;
}

/** Strip control chars / tags and cap length. */
function clean(v: unknown, max = 200): string {
  return String(v ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

const KUWAIT_GOVERNORATES = new Set([
  'محافظة العاصمة',
  'محافظة حولي',
  'محافظة الفروانية',
  'محافظة الجهراء',
  'محافظة الأحمدي',
  'محافظة مبارك الكبير',
]);

/** Effective selling price of a product (sale price only when actually lower). */
function effectivePrice(p: { price: number; salePrice: number }): number {
  return p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
}

export async function POST(req: NextRequest) {
  try {
    // ---- 0. Rate limit + honeypot -------------------------------
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    if (ipLimited(ip)) {
      return NextResponse.json(
        { error: 'تم استلام عدة طلبات من جهازك خلال وقت قصير. انتظر قليلاً أو تواصل معنا على الواتساب.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Honeypot: real customers never see/fill this hidden field
    if (clean(body.website, 50)) {
      return NextResponse.json({ success: true, order: null, spam: true }, { status: 201 });
    }

    // ---- 1. Validate customer info ------------------------------
    const phone = normalizeKwPhone(String(body.phone || ''));
    if (!isValidKwPhone(phone)) {
      return NextResponse.json(
        { error: 'رقم الهاتف غير صحيح — اكتب رقم كويتي 8 أرقام يبدأ بـ 5 أو 6 أو 9' },
        { status: 400 }
      );
    }
    const customerName = clean(body.customerName, 80);
    if (customerName.length < 2) {
      return NextResponse.json({ error: 'يرجى كتابة الاسم' }, { status: 400 });
    }
    const address = clean(body.address, 300);
    if (address.length < 5) {
      return NextResponse.json({ error: 'يرجى كتابة العنوان بالتفصيل' }, { status: 400 });
    }
    const governorate = clean(body.governorate, 50);
    if (!KUWAIT_GOVERNORATES.has(governorate)) {
      return NextResponse.json({ error: 'يرجى اختيار المحافظة' }, { status: 400 });
    }
    const area = clean(body.area, 80) || null;
    const emailRaw = clean(body.email, 120);
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;
    const notes = clean(body.notes, 500) || null;
    const paymentMethod = body.paymentMethod === 'card' ? 'card' : 'cod';

    // ---- 2. Validate items (structure only — prices come from DB) --
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!rawItems.length) {
      return NextResponse.json({ error: 'السلة فارغة' }, { status: 400 });
    }
    if (rawItems.length > MAX_ITEMS) {
      return NextResponse.json({ error: 'عدد المنتجات في الطلب كبير جداً' }, { status: 400 });
    }

    // Merge duplicate product lines and sanity-check quantities
    const qtyById = new Map<string, number>();
    for (const it of rawItems) {
      const id = typeof it?.productId === 'string' ? it.productId : '';
      const q = Math.floor(Number(it?.quantity));
      if (!id || !Number.isFinite(q) || q < 1) {
        return NextResponse.json({ error: 'بيانات السلة غير صحيحة' }, { status: 400 });
      }
      const merged = Math.min(MAX_QTY_PER_ITEM, (qtyById.get(id) || 0) + q);
      if ((qtyById.get(id) || 0) + q > MAX_QTY_PER_ITEM) {
        return NextResponse.json(
          { error: `الحد الأقصى ${MAX_QTY_PER_ITEM} قطعة لكل منتج` },
          { status: 400 }
        );
      }
      qtyById.set(id, merged);
    }

    // ---- 3. SERVER-SIDE PRICING (never trust the client) ---------
    const products = await db.product.findMany({
      where: { id: { in: [...qtyById.keys()] } },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        salePrice: true,
        thumb: true,
        trackStock: true,
        quantity: true,
        disableOOS: true,
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const id of qtyById.keys()) {
      const p = byId.get(id);
      if (!p) {
        return NextResponse.json(
          { error: 'أحد المنتجات لم يعد متوفراً — حدّث سلتك' },
          { status: 400 }
        );
      }
      if (p.disableOOS && p.quantity <= 0) {
        return NextResponse.json(
          { error: `المنتج «${p.name}» غير متوفر حالياً` },
          { status: 400 }
        );
      }
    }

    const orderItemsData = products
      .filter((p) => qtyById.has(p.id))
      .map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        price: effectivePrice(p), // DB price — client price ignored
        quantity: qtyById.get(p.id)!,
        image: p.thumb,
        variations:
          typeof rawItems.find((i: any) => i?.productId === p.id)?.variations === 'string'
            ? clean(rawItems.find((i: any) => i?.productId === p.id)?.variations, 400) || null
            : null,
      }));

    const subtotal =
      Math.round(orderItemsData.reduce((s, i) => s + i.price * i.quantity, 0) * 1000) / 1000;

    // ---- 4. SERVER-SIDE SHIPPING from store settings -------------
    const shippingCfg = await getShippingSettings();
    const shipping =
      shippingCfg.freeThreshold > 0 && subtotal >= shippingCfg.freeThreshold
        ? 0
        : shippingCfg.price;
    const total = Math.round((subtotal + shipping) * 1000) / 1000;

    if (total <= 0 || total > 100_000) {
      return NextResponse.json({ error: 'قيمة الطلب غير صالحة' }, { status: 400 });
    }

    // ---- 5. Duplicate guard (double-click / retry) ---------------
    const recent = await db.order.findFirst({
      where: { phone, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    if (recent && Math.abs(recent.total - total) < 0.001) {
      // Same phone + same total within 90s → treat as the same order
      return NextResponse.json(
        {
          success: true,
          order: recent,
          duplicate: true,
          accountCreated: false,
          loginHint: null,
        },
        { status: 200 }
      );
    }

    // ---- 6. Customer (auto-account: password = phone) ------------
    type CustomerRow = Awaited<ReturnType<typeof db.customer.findFirst>>;
    let authCustomer: CustomerRow = null;
    try {
      authCustomer = await verifyCustomer(req);
    } catch {
      /* guest checkout */
    }

    let customer: NonNullable<CustomerRow> | null =
      (await db.customer.findFirst({ where: { phone } })) || null;
    let accountCreated = false;
    if (!customer && authCustomer) {
      customer = authCustomer;
      // keep their profile fresh with what they just confirmed
      await db.customer.update({
        where: { id: customer.id },
        data: {
          ...(customer.name === 'عميل' && customerName ? { name: customerName } : {}),
          ...(area ? { area } : {}),
          ...(address ? { address } : {}),
          ...(governorate ? { city: governorate } : {}),
          ...(email && !customer.email ? { email } : {}),
        },
      });
    }
    if (!customer) {
      const passwordHash = await bcrypt.hash(phone, 10);
      customer = await db.customer.create({
        data: {
          name: customerName,
          phone,
          email,
          city: governorate,
          area,
          address,
          passwordHash,
        },
      });
      accountCreated = true;
    } else if (!customer.passwordHash) {
      await db.customer.update({
        where: { id: customer.id },
        data: { passwordHash: await bcrypt.hash(phone, 10) },
      });
      accountCreated = true;
    }

    // ---- 7. UTM attribution (ads readiness) ----------------------
    const utm = {
      utmSource: clean(body.utmSource, 120) || null,
      utmMedium: clean(body.utmMedium, 120) || null,
      utmCampaign: clean(body.utmCampaign, 150) || null,
      utmTerm: clean(body.utmTerm, 120) || null,
      utmContent: clean(body.utmContent, 120) || null,
      landingPath: clean(body.landingPath, 300) || null,
    };

    // ---- 8. Create the order (atomic with items) -----------------
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        subtotal,
        shipping,
        total,
        status: 'pending',
        paymentMethod,
        notes,
        governorate,
        area,
        address,
        phone,
        customerName,
        arrivalNote: AUTO_SHIP_ARRIVAL_NOTE,
        ...utm,
        items: { create: orderItemsData },
      },
      include: { items: true, customer: true },
    });

    // ---- 9. Stock decrement (tracked products only) --------------
    for (const i of orderItemsData) {
      try {
        const p = byId.get(i.productId)!;
        if (p.trackStock) {
          await db.product.update({
            where: { id: i.productId },
            data: { quantity: Math.max(0, p.quantity - i.quantity) },
          });
        }
      } catch {
        /* non-fatal */
      }
    }

    return NextResponse.json(
      {
        success: true,
        order,
        accountCreated,
        loginHint: accountCreated
          ? `حسابك جاهز — سجل دخولك من «حسابي» برقم هاتفك ${phone} وكلمة المرور هي نفس الرقم`
          : null,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error('Order creation failed:', e);
    return NextResponse.json(
      { error: 'تعذر إنشاء الطلب — جرّب مرة ثانية أو تواصل معنا على الواتساب' },
      { status: 500 }
    );
  }
}

/** Admin-only list (customers use /api/customer/orders or /api/orders/track) */
export async function GET(req: NextRequest) {
  return adminOnly(req, async () => {
    const orders = await db.order.findMany({
      include: { items: true, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json(orders);
  });
}
