'use client';

import { CheckCircle, Package, Truck, Home, Clock } from 'lucide-react';

export interface TrackOrder {
  orderNumber: string;
  status: string;
  createdAt: string;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  arrivalNote?: string | null;
  total: number;
  shipping: number;
  subtotal: number;
  governorate?: string | null;
  area?: string | null;
  address?: string | null;
  items?: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string | null;
  }[];
}

const STEPS = [
  { key: 'pending', label: 'تم استلام الطلب', icon: Clock },
  { key: 'confirmed', label: 'تم التأكيد', icon: CheckCircle },
  { key: 'shipped', label: 'تم الشحن', icon: Truck },
  { key: 'delivered', label: 'تم التوصيل', icon: Home },
];

function stepIndex(status: string): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'confirmed':
    case 'processing':
      return 1;
    case 'shipped':
      return 2;
    case 'delivered':
      return 3;
    default: // cancelled etc.
      return -1;
  }
}

export function OrderTimeline({ status }: { status: string }) {
  const current = stepIndex(status);
  if (current < 0) {
    return (
      <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm font-medium text-center">
        تم إلغاء هذا الطلب — للاستفسار تواصل معنا على الواتساب
      </div>
    );
  }
  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= current;
        const active = i === current;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-card border-border text-muted-foreground'
                } ${active ? 'ring-4 ring-green-600/15' : ''}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span
                className={`text-[10px] sm:text-[11px] text-center leading-tight max-w-[72px] ${
                  done ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-1 mb-4 sm:mb-5 rounded ${
                  i < current ? 'bg-green-600' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function OrderCard({ order }: { order: TrackOrder }) {
  const cancelled = stepIndex(order.status) < 0;
  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="p-4 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold text-sm">
            طلب <span className="font-mono">{order.orderNumber}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(order.createdAt).toLocaleString('ar-KW', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
            {' · '}
            {order.items?.length ?? 0} منتج
          </p>
        </div>
        <div className="text-left">
          <p className="font-extrabold text-gold-deep">{order.total.toFixed(2)} د.ك</p>
          <p className="text-[11px] text-muted-foreground">دفع عند الاستلام</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {!cancelled && <OrderTimeline status={order.status} />}

        {/* arrival promise */}
        {order.arrivalNote && (
          <div className="flex items-start gap-2 rounded-lg bg-accent/10 border border-accent/25 px-3 py-2.5">
            <Package className="h-4 w-4 text-gold-deep shrink-0 mt-0.5" />
            <p className="text-xs sm:text-[13px] font-medium text-foreground leading-relaxed">
              {order.arrivalNote}
            </p>
          </div>
        )}

        {/* items */}
        {order.items && order.items.length > 0 && (
          <div className="space-y-2">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-white border overflow-hidden shrink-0">
                  {it.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={it.image} alt={it.name} className="h-full w-full img-contain p-0.5" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      <Package className="h-5 w-5 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium line-clamp-1">{it.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {it.quantity} × {it.price.toFixed(2)} د.ك
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* address line */}
        {(order.governorate || order.area) && (
          <p className="text-[11px] text-muted-foreground border-t pt-2.5">
            التوصيل إلى: {order.governorate || ''} {order.area ? `— ${order.area}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}
