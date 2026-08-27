'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { formatKwd } from '@/lib/utils/format';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { FreeShippingBar } from '@/components/store/free-shipping-bar';

export function CartView() {
  const { t } = useT();
  const { items, removeItem, updateQuantity } = useCartStore();
  const subtotal = useCartStore((s) => s.getSubtotal());
  const setView = useAppStore((s) => s.setView);
  // live admin-configured shipping (was hardcoded 2/50 — QA fix to match checkout + settings)
  const [shippingCfg, setShippingCfg] = useState({ price: 1, freeThreshold: 30, note: '' });
  useEffect(() => {
    fetch('/api/settings/shipping')
      .then((r) => r.json())
      .then((s) => {
        if (s && typeof s.price === 'number') {
          setShippingCfg({ price: s.price, freeThreshold: s.freeThreshold, note: s.note || '' });
        }
      })
      .catch(() => {});
  }, []);
  const shipping =
    shippingCfg.freeThreshold > 0 && subtotal >= shippingCfg.freeThreshold ? 0 : shippingCfg.price;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <ShoppingBag className="h-20 w-20 text-muted-foreground/30" />
          <h1 className="text-2xl font-bold">{t('cv.empty')}</h1>
          <p className="text-muted-foreground">
            {t('cv.emptySub')}
          </p>
          <Button size="lg" onClick={() => setView('shop')}>
            {t('cv.browse')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-5">{t('cv.title', { n: items.length })}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item, i) => (
            <div
              key={`${item.productId}-${i}`}
              className="flex gap-4 p-4 border rounded-lg bg-card"
            >
              <div className="w-24 h-24 flex-shrink-0 bg-white rounded-md overflow-hidden border">
                {item.image && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full img-contain p-1"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium line-clamp-2 mb-1">{item.name}</h3>
                {item.variations && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {item.variations}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mb-2">
                  SKU: {item.sku}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        const next = item.quantity - 1;
                        updateQuantity(item.productId, next, item.variations);
                        if (next > 0) toast(t('cd.qtyUpdated'), { id: 'cart-qty', duration: 1400 });
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-10 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        updateQuantity(item.productId, item.quantity + 1, item.variations);
                        toast(t('cd.qtyUpdated'), { id: 'cart-qty', duration: 1400 });
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      removeItem(item.productId, item.variations);
                      toast(t('cv.removed'));
                    }}
                  >
                    <Trash2 className="h-4 w-4 ml-1" />
                    {t('cv.remove')}
                  </Button>
                </div>
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-primary">
                  {formatKwd(item.price * item.quantity)}
                </p>
                {item.quantity > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {t('cv.perPiece', { v: formatKwd(item.price) })}
                  </p>
                )}
              </div>
            </div>
          ))}

          <Button variant="ghost" onClick={() => setView('shop')}>
            <ArrowLeft className="h-4 w-4 ml-1" />
            {t('cv.continue')}
          </Button>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg p-5 bg-card sticky top-20">
            <h2 className="font-bold mb-4">{t('cv.summary')}</h2>
            <div className="mb-4">
              <FreeShippingBar subtotal={subtotal} />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('c.subtotal')}:</span>
                <span className="font-medium">{formatKwd(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('c.shipping')}:</span>
                {shipping === 0 ? (
                  <span className="text-green-600 font-medium">{t('c.free')}</span>
                ) : (
                  <span className="font-medium">{formatKwd(shipping)}</span>
                )}
              </div>
              {shipping > 0 && shippingCfg.freeThreshold > 0 && (
                <p className="text-xs text-muted-foreground bg-accent/50 p-2 rounded">
                  💡 {t('ck.addForFree', { v: formatKwd(Math.max(0, shippingCfg.freeThreshold - subtotal)) })}
                </p>
              )}
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>{t('c.total')}:</span>
                <span className="text-primary">{formatKwd(total)}</span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full mt-4"
              onClick={() => setView('checkout')}
            >
              {t('cv.checkout')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
