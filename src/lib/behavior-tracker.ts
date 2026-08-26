/**
 * behavior-tracker.ts
 * -------------------
 * Client-side visitor ID management + event tracking utilities.
 * Visitor ID is persisted in localStorage and stable across sessions.
 */
const VISITOR_KEY = 'mahhl_visitor_id';

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

type EventType =
  | 'page_view'
  | 'product_view'
  | 'search'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'cart_open'
  | 'checkout_start'
  | 'checkout_complete'
  | 'upsell_shown'
  | 'upsell_clicked'
  | 'upsell_added'
  | 'filter_apply';

export async function trackEvent(
  type: EventType,
  data: {
    productId?: string;
    categoryId?: string;
    query?: string;
    metadata?: Record<string, unknown>;
  } = {}
) {
  if (typeof window === 'undefined') return;
  try {
    const visitorId = getVisitorId();
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, type, ...data }),
      // fire-and-forget
      keepalive: true,
    });
  } catch {
    /* swallow */
  }
}

export async function trackUpsellClick(productId: string, action: 'clicked' | 'added' = 'clicked') {
  if (typeof window === 'undefined') return;
  try {
    const visitorId = getVisitorId();
    await fetch('/api/ai/upsell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, productId, action }),
      keepalive: true,
    });
  } catch {
    /* swallow */
  }
}
