'use client';

/**
 * ExitIntentPopup — last-moment retention (founder-requested global dynamic).
 * Desktop: cursor leaves viewport top. Mobile: fast scroll-up after depth.
 * Research (OptinMonster/Baymard): single clear message, minimal cognitive load,
 * once per session, never after an order.
 */
import { useEffect, useRef, useState } from 'react';
import { X, ShoppingCart, Truck, Flame } from 'lucide-react';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAppStore } from '@/lib/stores/app-store';
import { useT } from '@/lib/i18n';

const SESSION_KEY = 'mahhl-exit-shown';

export function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  const armedRef = useRef(false);
  const shownRef = useRef(false);
  const totalItems = useCartStore((s) => s.getTotalItems());
  const setView = useAppStore((s) => s.setView);
  const view = useAppStore((s) => s.view);
  const { t } = useT();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      return;
    }
    // arm after 10s on site, storefront views only
    const armTimer = setTimeout(() => (armedRef.current = true), 10_000);

    const trigger = () => {
      if (!armedRef.current || shownRef.current) return;
      if (view.startsWith('admin') || view === 'checkout' || view === 'order-success') return;
      shownRef.current = true;
      setOpen(true);
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* noop */
      }
    };

    // desktop: cursor exits through the top
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 8) trigger();
    };
    // mobile: fast upward scroll after scrolling 25% down
    let lastY = 0;
    let depthReached = false;
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.body.scrollHeight - window.innerHeight;
      if (max > 0 && y > max * 0.25) depthReached = true;
      if (depthReached && lastY - y > 240) trigger();
      lastY = y;
    };

    document.addEventListener('mouseout', onMouseOut);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(armTimer);
      document.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('scroll', onScroll);
    };
  }, [view]);

  if (!open) return null;

  const hasCart = totalItems > 0;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 left-3 p-1.5 rounded-full bg-muted hover:bg-muted/70 cursor-pointer"
          aria-label={t('r.cancel')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {hasCart ? (
              <ShoppingCart className="h-7 w-7 text-primary" />
            ) : (
              <Flame className="h-7 w-7 text-orange-500" />
            )}
          </div>
          <h3 className="text-lg font-extrabold mb-1.5">{t('m.wait')}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {hasCart ? t('m.exitMsg') : t('home.topDemandSub')}
          </p>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-5">
            <Truck className="h-4 w-4 text-green-600" />
            {t('c.shippingNote')}
          </div>

          <div className="flex gap-2">
            {hasCart ? (
              <button
                onClick={() => {
                  setOpen(false);
                  setView('cart');
                }}
                className="flex-1 h-11 rounded-xl btn-gold font-bold text-sm cursor-pointer"
              >
                {t('m.backToCart')}
              </button>
            ) : (
              <button
                onClick={() => {
                  setOpen(false);
                  setView('shop');
                }}
                className="flex-1 h-11 rounded-xl btn-gold font-bold text-sm cursor-pointer"
              >
                {t('home.browseAll')}
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="h-11 px-4 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer"
            >
              {t('m.stay')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
