/**
 * create-order.ts — single source of truth for order creation.
 * Used by BOTH the checkout API (/api/orders) and the AI shopping agent,
 * so pricing / validation / duplicate-guard / auto-account behave
 * identically no matter where the order originates.
 */
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { normalizeKwPhone, isValidKwPhone } from '@/lib/customer-auth';
import { AUTO_SHIP_ARRIVAL_NOTE } from '@/lib/auto-ship';
import { getShippingSettings } from '@/lib/settings';

export const KUWAIT_GOVERNORATES = new Set([
  'محافظة العاصمة',
  'محافظة حولي',
  'محافظة الفروانية',
  'محافظة الجهراء',
  'محافظة الأحمدي',
  'محافظة مبارك الكبير',
]);

const MAX_ITEMS = 50;
const MAX_QTY_PER_ITEM = 20;
const DUPLICATE_WINDOW_MS = 90_000;

/** Strip control chars / tags and cap length. */
export function cleanText(v: unknown, max = 200): string {
  return String(v ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

/** Effective selling price of a product (sale price only when actually lower). */
export function effectivePrice(p: { price: number; salePrice: number }): number {
  return p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
}

export interface CreateOrderItem {
  productId: string;
  quantity: number;
  variations?: string | null;
}

export interface CreateOrderInput {
  phone: string;
  customerName: string;
  address: string;
  governorate: string;
  area?: string | null;
  email?: string | null;
  notes?: string | null;
  paymentMethod?: 'cod' | 'card';
  items: CreateOrderItem[];
  utm?: {
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmTerm?: string | null;
    utmContent?: string | null;
    landingPath?: string | null;
  };
  /** customer already verified via auth token (guest checkout = null) */
  authCustomerId?: string | null;
  /** marks orders created by the AI agent for admin visibility */
  source?: 'checkout' | 'ai-agent';
}

export type CreateOrderResult =
  | {
      ok: true;
      order: any;
      accountCreated: boolean;
      loginHint: string | null;
      duplicate: boolean;
    }
  | { ok: false; error: string };

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  // ---- 1. Validate customer info ------------------------------
  const phone = normalizeKwPhone(String(input.phone || ''));
  if (!isValidKwPhone(phone)) {
    return { ok: false, error: 'رقم الهاتف غير صحيح — اكتب رقم كويتي 8 أرقام يبدأ بـ 5 أو 6 أو 9' };
  }
  const customerName = cleanText(input.customerName, 80);
  if (customerName.length < 2) {
    return { ok: false, error: 'يرجى كتابة الاسم' };
  }
  const address = cleanText(input.address, 300);
  if (address.length < 5) {
    return { ok: false, error: 'يرجى كتابة العنوان بالتفصيل' };
  }
  const governorate = cleanText(input.governorate, 50);
  if (!KUWAIT_GOVERNORATES.has(governorate)) {
    return { ok: false, error: 'يرجى اختيار المحافظة' };
  }
  const area = cleanText(input.area, 80) || null;
  const emailRaw = cleanText(input.email, 120);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;
  const notes = cleanText(input.notes, 500) || null;
  const paymentMethod = input.paymentMethod === 'card' ? 'card' : 'cod';

  // ---- 2. Validate items ---------------------------------------
  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (!rawItems.length) {
    return { ok: false, error: 'السلة فارغة' };
  }
  if (rawItems.length > MAX_ITEMS) {
    return { ok: false, error: 'عدد المنتجات في الطلب كبير جداً' };
  }

  const qtyById = new Map<string, number>();
  for (const it of rawItems) {
    const id = typeof it?.productId === 'string' ? it.productId : '';
    const q = Math.floor(Number(it?.quantity));
    if (!id || !Number.isFinite(q) || q < 1) {
      return { ok: false, error: 'بيانات السلة غير صحيحة' };
    }
    if ((qtyById.get(id) || 0) + q > MAX_QTY_PER_ITEM) {
      return { ok: false, error: `الحد الأقصى ${MAX_QTY_PER_ITEM} قطعة لكل منتج` };
    }
    qtyById.set(id, (qtyById.get(id) || 0) + q);
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
      return { ok: false, error: 'أحد المنتجات لم يعد متوفراً — حدّث سلتك' };
    }
    if (p.disableOOS && p.quantity <= 0) {
      return { ok: false, error: `المنتج «${p.name}» غير متوفر حالياً` };
    }
  }

  const orderItemsData = products
    .filter((p) => qtyById.has(p.id))
    .map((p) => ({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      price: effectivePrice(p),
      quantity: qtyById.get(p.id)!,
      image: p.thumb,
      variations:
        typeof rawItems.find((i) => i?.productId === p.id)?.variations === 'string'
          ? cleanText(rawItems.find((i) => i?.productId === p.id)?.variations, 400) || null
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
    return { ok: false, error: 'قيمة الطلب غير صالحة' };
  }

  // ---- 5. Duplicate guard (double-submit / retry) --------------
  const recent = await db.order.findFirst({
    where: { phone, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
  if (recent && Math.abs(recent.total - total) < 0.001) {
    return {
      ok: true,
      order: recent,
      accountCreated: false,
      loginHint: null,
      duplicate: true,
    };
  }

  // ---- 6. Customer (auto-account: password = phone) ------------
  let customer: any =
    (await db.customer.findFirst({ where: { phone } })) || null;

  if (!customer && input.authCustomerId) {
    customer = await db.customer.findUnique({ where: { id: input.authCustomerId } });
    if (customer) {
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
  }

  let accountCreated = false;
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
  const utm = input.utm || {};

  // ---- 8. Atomic stock guard + order create (pool-safe) --------
  // Race-safe under concurrency (e.g. many buyers hitting the last unit in
  // the same second) WITHOUT an interactive transaction: interactive BEGIN
  // is unreliable on Neon's PgBouncer (-pooler) endpoint under bursts
  // ("Unable to start a transaction in the given time"), so instead:
  //   1. atomic conditional decrement (single UPDATE ... WHERE qty >= n)
  //      -> only ONE concurrent buyer of the last unit can win (no oversell)
  //   2. order insert
  //   3. if the insert fails, compensate by giving the stock back
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  class StockOutError extends Error {}
  let decremented: { id: string; qty: number }[] = [];
  let order: any;
  try {
    for (const i of orderItemsData) {
      const p = byId.get(i.productId)!;
      if (!p.trackStock) continue;
      const res = await db.product.updateMany({
        where: { id: i.productId, quantity: { gte: i.quantity } },
        data: { quantity: { decrement: i.quantity } },
      });
      if (res.count > 0) {
        decremented.push({ id: i.productId, qty: i.quantity });
      } else if (p.disableOOS) {
        // Sold out between validation and now — roll back what we took,
        // then reject the whole order.
        for (const d of decremented) {
          await db.product.updateMany({
            where: { id: d.id },
            data: { quantity: { increment: d.qty } },
          });
        }
        throw new StockOutError(`نفذت الكمية المتاحة من «${p.name}» — حدّث سلتك`);
      }
    }

    order = await db.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        subtotal,
        shipping,
        total,
        status: 'pending',
        paymentMethod,
        notes: notes || (input.source === 'ai-agent' ? 'طلب عبر مساعد الذكاء الاصطناعي' : null),
        governorate,
        area,
        address,
        phone,
        customerName,
        arrivalNote: AUTO_SHIP_ARRIVAL_NOTE,
        utmSource: cleanText(utm.utmSource, 120) || null,
        utmMedium: cleanText(utm.utmMedium, 120) || null,
        utmCampaign: cleanText(utm.utmCampaign, 150) || null,
        utmTerm: cleanText(utm.utmTerm, 120) || null,
        utmContent: cleanText(utm.utmContent, 120) || null,
        landingPath: cleanText(utm.landingPath, 300) || null,
        items: { create: orderItemsData },
      },
      include: { items: true, customer: true },
    });
  } catch (e) {
    // Compensating rollback: the insert failed, give reserved stock back.
    for (const d of decremented) {
      try {
        await db.product.updateMany({
          where: { id: d.id },
          data: { quantity: { increment: d.qty } },
        });
      } catch {
        /* non-fatal */
      }
    }
    if (e instanceof StockOutError) {
      return { ok: false, error: e.message };
    }
    throw e;
  }

  return {
    ok: true,
    order,
    accountCreated,
    loginHint: accountCreated
      ? `حسابك جاهز — سجل دخولك من «حسابي» برقم هاتفك ${phone} وكلمة المرور هي نفس الرقم`
      : null,
    duplicate: false,
  };
}
