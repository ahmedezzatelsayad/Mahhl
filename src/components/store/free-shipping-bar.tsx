'use client';

/**
 * FreeShippingBar — animated progress bar toward free shipping.
 *
 * Global best practice: a free-shipping threshold progress bar is one of the
 * highest-ROI AOV (average order value) lifters in e-commerce; it also removes
 * the #1 Baymard abandonment driver — unexpected shipping costs.
 */

import { useEffect, useState } from 'react';
import { Truck, PartyPopper } from 'lucide-react';

interface ShippingInfo {
  price: number;
  freeThreshold: number;
}

// module-level cache so the drawer + cart page share one fetch
let cached: ShippingInfo | null = null;
let inflight: Promise<ShippingInfo> | null = null;

async function loadShipping(): Promise<ShippingInfo> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch('/api/settings/shipping')
      .then((r) => r.json())
      .then((d: ShippingInfo) => {
        cached = {
          price: Number(d.price) || 1,
          freeThreshold: Number(d.freeThreshold) || 50,
        };
        inflight = null;
        return cached;
      })
      .catch(() => {
        inflight = null;
        return { price: 1, freeThreshold: 50 };
      });
  }
  return inflight;
}

function fmt(n: number) {
  return n.toFixed(n % 1 === 0 ? 0 : 3);
}

export function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const [info, setInfo] = useState<ShippingInfo>(cached ?? { price: 1, freeThreshold: 50 });

  useEffect(() => {
    loadShipping().then(setInfo);
  }, []);

  const threshold = info.freeThreshold;
  if (threshold <= 0 || subtotal <= 0) return null;

  const reached = subtotal >= threshold;
  const remaining = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div
      className={`rounded-xl border px-3.5 py-3 text-sm transition-colors ${
        reached ? 'border-green-300 bg-green-50' : 'bg-muted/40'
      }`}
      role="status"
    >
      <div className="flex items-center gap-2 mb-2">
        {reached ? (
          <PartyPopper className="h-4 w-4 text-green-600 shrink-0" />
        ) : (
          <Truck className="h-4 w-4 text-primary shrink-0" />
        )}
        <p className={`leading-snug ${reached ? 'text-green-800' : 'text-muted-foreground'}`}>
          {reached ? (
            <span className="font-bold">مبروك! حصلت على شحن مجاني 🎉</span>
          ) : (
            <>
              أضف <b className="text-foreground">{fmt(remaining)} د.ك</b> واحصل على{' '}
              <b className="text-foreground">شحن مجاني</b>
            </>
          )}
        </p>
      </div>
      <div
        className={`h-2 rounded-full overflow-hidden ${reached ? 'bg-green-200' : 'bg-muted'}`}
        aria-hidden
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            reached ? 'bg-green-500' : 'btn-gold'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!reached && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {fmt(subtotal)} من {fmt(threshold)} د.ك · الشحن {fmt(info.price)} د.ك
        </p>
      )}
    </div>
  );
}
