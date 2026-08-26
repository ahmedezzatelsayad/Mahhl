import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getFacebookSettings } from '@/lib/settings';

/**
 * POST /api/track/facebook — Meta Conversions API forwarder (server-side).
 *
 * The browser pixel already fires the same event with the same event_id;
 * Meta de-duplicates automatically. Server-side events survive
 * ad-blockers and iOS restrictions, and let us attach hashed PII
 * (phone) for better attribution matching.
 *
 * Body:
 *  - eventName (string)  e.g. "Purchase"
 *  - eventId   (string)  shared with the browser pixel for dedup
 *  - eventData (object)  { value, currency, contents, order_id, ... }
 *  - fbp / fbc (string?) Meta cookies for user matching
 *  - phone     (string?) raw phone — hashed (SHA-256) before leaving this server
 */
const VALID_EVENTS = new Set([
  'PageView',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'AddPaymentInfo',
  'Purchase',
  'Search',
]);

/** Normalize phone to E.164-ish digits (Meta requirement) before hashing. */
function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2); // intl prefix
  if (digits.length === 8) digits = `965${digits}`; // Kuwait local -> with code
  if (digits.length < 7) return null;
  return digits;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Extract client IP (behind the Caddy gateway). */
function getClientIp(req: NextRequest): string | undefined {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventName, eventId, eventData, fbp, fbc, phone } = body;

    if (!eventName || !VALID_EVENTS.has(eventName)) {
      return NextResponse.json({ error: 'Invalid eventName' }, { status: 400 });
    }

    const settings = await getFacebookSettings();
    // No-op politely when CAPI isn't configured — the browser pixel still works.
    if (!settings.enabled || !settings.pixelId || !settings.accessToken) {
      return NextResponse.json({ ok: true, skipped: 'capi-not-configured' });
    }

    // ---- Build user_data (matching keys — never raw PII leaves this server) ----
    const userData: Record<string, string> = {};
    if (fbp) userData.fbp = String(fbp);
    if (fbc) userData.fbc = String(fbc);
    const ip = getClientIp(req);
    if (ip) userData.client_ip_address = ip;
    const ua = req.headers.get('user-agent');
    if (ua) userData.client_user_agent = ua;
    const normalizedPhone = phone ? normalizePhone(String(phone)) : null;
    if (normalizedPhone) {
      userData.ph = sha256(normalizedPhone);
    }

    // ---- Build the event payload ----
    const event: Record<string, unknown> = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      user_data: userData,
    };
    if (eventId) event.event_id = String(eventId);
    if (eventData && typeof eventData === 'object') {
      // Whitelist the fields Meta accepts in custom_data
      const { value, currency, contents, num_items, order_id, search_string, content_name, content_ids, content_type } =
        eventData as Record<string, unknown>;
      const customData: Record<string, unknown> = {};
      if (value !== undefined) customData.value = value;
      if (currency) customData.currency = currency;
      if (contents) customData.contents = contents;
      if (num_items !== undefined) customData.num_items = num_items;
      if (order_id) customData.order_id = order_id;
      if (search_string) customData.search_string = search_string;
      if (content_name) customData.content_name = content_name;
      if (content_ids) customData.content_ids = content_ids;
      if (content_type) customData.content_type = content_type;
      if (Object.keys(customData).length > 0) event.custom_data = customData;
    }

    const payload: Record<string, unknown> = { data: [event] };
    if (settings.testEventCode) payload.test_event_code = settings.testEventCode;

    // ---- Forward to Meta Graph API ----
    const url = `https://graph.facebook.com/v19.0/${settings.pixelId}/events?access_token=${encodeURIComponent(
      settings.accessToken
    )}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let metaResponse: { ok: boolean; status: number; body: string } | { ok: false; error: string };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const text = await res.text();
      metaResponse = { ok: res.ok, status: res.status, body: text.slice(0, 500) };
    } catch (e: any) {
      metaResponse = { ok: false, error: e?.name === 'AbortError' ? 'timeout' : e?.message || 'network' };
    } finally {
      clearTimeout(timeout);
    }

    if (!('ok' in metaResponse) || !metaResponse.ok) {
      // Never fail the UX because of Meta — report status only
      console.error('[fb-capi] forward failed:', metaResponse);
      return NextResponse.json({ ok: false, error: 'meta-forward-failed' }, { status: 200 });
    }

    return NextResponse.json({ ok: true, forwarded: true });
  } catch (e: any) {
    console.error('[fb-capi] error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 200 });
  }
}

export const dynamic = 'force-dynamic';
