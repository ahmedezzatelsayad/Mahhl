'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAppStore } from '@/lib/stores/app-store';
import { trackUpsellClick } from '@/lib/behavior-tracker';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Plus, X } from 'lucide-react';
import { formatKwd } from '@/lib/utils/format';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

interface Recommendation {
  productId: string;
  slug?: string;
  name: string;
  price: number;
  image: string | null;
  reason: string;
  score: number;
}

interface Props {
  /** Where the widget is rendered — affects the trigger context passed to the API */
  context: 'product' | 'cart' | 'checkout';
  /** Trigger product slug (for product page) */
  productId?: string | null;
  /** Max items to show */
  limit?: number;
  /** Compact display for cart drawer */
  compact?: boolean;
}

export function UpsellWidget({ context, productId, limit = 3, compact = false }: Props) {
  const { t } = useT();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const openProduct = useAppStore((s) => s.openProduct);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const visitorId = localStorage.getItem('mahhl_visitor_id');
        if (!visitorId) {
          setLoading(false);
          return;
        }
        // Build URL params — cart items are ALWAYS sent so the engine can
        // exclude anything already in the cart (product page included).
        const params = new URLSearchParams({ visitorId, limit: String(limit) });
        if (context === 'product' && productId) {
          params.set('productId', productId);
        }
        if (cartItems.length > 0) {
          params.set(
            'cartItems',
            encodeURIComponent(
              JSON.stringify(
                cartItems.map((i) => ({
                  productId: i.productId,
                  name: i.name,
                  price: i.price,
                  quantity: i.quantity,
                }))
              )
            )
          );
        }
        const res = await fetch(`/api/ai/upsell?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.items)) {
          setRecs(data.items.slice(0, limit));
          if (data.items.length > 0) {
            // Track shown
            const { trackEvent } = await import('@/lib/behavior-tracker');
            await trackEvent('upsell_shown', { metadata: { context, count: data.items.length } });
          }
        }
      } catch (e) {
        console.warn('[upsell] failed to load', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, productId, limit, JSON.stringify(cartItems.map((i) => `${i.productId}:${i.quantity}`))]);

  // Live filter — never suggest a product already sitting in the cart
  const cartIdSet = new Set(cartItems.map((i) => i.productId));
  const visibleRecs = recs.filter((r) => !cartIdSet.has(r.productId));

  if (dismissed) return null;
  if (loading && !visibleRecs.length) {
    return compact ? (
      <div className="px-3 py-2 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    ) : null;
  }
  if (!visibleRecs.length) return null;

  const title =
    context === 'product'
      ? t('up.title0')
      : context === 'cart'
        ? t('up.title1')
        : t('up.title2');

  async function handleAdd(r: Recommendation) {
    addItem(
      {
        productId: r.productId,
        slug: r.slug || r.productId,
        name: r.name,
        sku: r.productId,
        price: r.price,
        image: r.image || '',
      },
      1
    );
    toast.success(t('up.added', { name: r.name }));
    await trackUpsellClick(r.productId, 'added');
  }

  return (
    <Card
      className={`border-primary/30 bg-gradient-to-l from-primary/5 via-accent/10 to-primary/5 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-bold flex items-center gap-1.5 ${compact ? 'text-sm' : 'text-base'}`}>
          <Sparkles className="h-4 w-4 text-primary" />
          {title}
        </h3>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t('up.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2">
        {visibleRecs.map((r) => (
          <div
            key={r.productId}
            className="flex gap-3 items-center bg-card/60 border rounded-lg p-2 hover:border-primary/40 transition-colors"
          >
            <button
              onClick={() => {
                trackUpsellClick(r.productId, 'clicked');
                openProduct(r.slug || r.productId);
              }}
              className="w-14 h-14 flex-shrink-0 bg-muted/30 rounded-md overflow-hidden border"
            >
              {r.image ? (
                <img src={r.image} alt={r.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  🛍
                </div>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium line-clamp-1 cursor-pointer hover:text-primary`}
                onClick={() => {
                  trackUpsellClick(r.productId, 'clicked');
                  openProduct(r.slug || r.productId);
                }}
              >
                {r.name}
              </p>
              <p className="text-[11px] text-primary/80 line-clamp-1">{r.reason}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-bold text-primary">{formatKwd(r.price)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleAdd(r)}
                >
                  <Plus className="h-3 w-3 ml-1" />
                  {t('up.add')}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
