/**
 * webhooks.ts — مرسل أحداث منصة Garfix Stores إلى Garfix ERP.
 *
 * التوقيع: HMAC-SHA256 على الجسم الخام بسر GARFIX_WEBHOOK_SECRET
 * (نفس قيمة GARFIX_WEBHOOK_SECRET في .env الخاص بالـ ERP) —
 * الترويسة: X-Garfix-Signature: sha256=<hex>
 *
 * نموذج الإرسال: fire-and-forget — لا يعطّل إنشاء الطلب أبداً إذا كان
 * ERP غير متاح (مهلة 5 ثوان + محاولة إعادة واحدة). فشل التسليم يسجَّل
 * في السجل فقط؛ الـ idempotency في مستقبِل ERP يجعل الإعادة آمنة.
 */
import { createHmac } from 'node:crypto';

const ERP_WEBHOOK_URL = process.env.ERP_WEBHOOK_URL || '';
const SECRET = process.env.GARFIX_WEBHOOK_SECRET || '';

export type StoresWebhookEvent =
  | 'order.created'
  | 'order.status_changed';

export function signPayload(raw: string): string {
  return createHmac('sha256', SECRET).update(raw, 'utf8').digest('hex');
}

async function postOnce(raw: string): Promise<boolean> {
  try {
    const res = await fetch(ERP_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Garfix-Signature': `sha256=${signPayload(raw)}`,
      },
      body: raw,
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return true;
    console.warn(`[webhooks] ERP responded ${res.status}:`, (await res.text()).slice(0, 300));
    return false;
  } catch (e) {
    console.warn('[webhooks] delivery failed:', (e as Error).message);
    return false;
  }
}

/** يرسل حدثاً موقّعاً إلى ERP — محاولة واحدة + إعادة واحدة عند الفشل. */
export async function emitGarfixWebhook(
  event: StoresWebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!ERP_WEBHOOK_URL || !SECRET) return; // التكامل غير مضبوط — تجاهل بصمت
  const raw = JSON.stringify({ event, ...payload, sentAt: new Date().toISOString() });
  const ok = await postOnce(raw);
  if (!ok) {
    // إعادة واحدة فقط بعد مهلة قصيرة — مستقبِل ERP idempotent فيعيش بأمان
    await new Promise((r) => setTimeout(r, 1500));
    await postOnce(raw);
  }
}
