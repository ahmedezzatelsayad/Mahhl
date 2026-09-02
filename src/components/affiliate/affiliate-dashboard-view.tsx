'use client';

/**
 * AffiliateDashboardView — إحصائيات المسوق:
 * بطاقات الطلبات + بطاقات العمولات (متوقعة / قيد السحب / قابلة للسحب / مدفوعة)
 * + نسبة التسليم + آخر الطلبات + الأكثر مبيعاً.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatKwd } from '@/lib/utils/format';
import { STATUS_LABELS_AR, STATUS_COLORS } from '@/lib/commission';
import { toast } from 'sonner';
import {
  PackageCheck, Clock, Truck, XCircle, TrendingUp, Wallet, Banknote, Percent,
} from 'lucide-react';

interface Buckets {
  expected: number; available: number; inPayout: number; paid: number;
  counts: Record<string, number>; totalOrders: number; deliveryRate: number;
}

export function AffiliateDashboardView() {
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const affiliateUser = useAppStore((s) => s.affiliateUser);
  const setView = useAppStore((s) => s.setView);
  const [data, setData] = useState<{
    buckets: Buckets;
    recentOrders: any[];
    topProducts: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!affiliateToken) return;
    fetch('/api/affiliate/stats', { headers: { Authorization: `Bearer ${affiliateToken}` } })
      .then(async (r) => {
        if (r.ok) setData(await r.json());
        else toast.error('فشل تحميل الإحصائيات');
      })
      .catch(() => toast.error('فشل الاتصال'))
      .finally(() => setLoading(false));
  }, [affiliateToken]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const b = data?.buckets;
  const c = b?.counts || {};

  const orderCards = [
    { label: 'إجمالي الطلبات', value: b?.totalOrders ?? 0, icon: PackageCheck },
    { label: 'طلبات مسلمة', value: (c['delivered'] || 0) + (c['commission_received'] || 0), icon: PackageCheck },
    { label: 'قيد التأكيد', value: (c['pending'] || 0) + (c['confirmed'] || 0) + (c['deferred'] || 0), icon: Clock },
    { label: 'قيد التسليم', value: (c['processing'] || 0) + (c['shipped'] || 0), icon: Truck },
    { label: 'ملغية / مرتجعة', value: (c['cancelled'] || 0) + (c['returned'] || 0), icon: XCircle },
  ];

  const moneyCards = [
    { label: 'عمولة متوقعة', value: b?.expected ?? 0, icon: TrendingUp, hint: 'طلبات لسه بتوصل للعميل' },
    { label: 'قابلة للسحب', value: b?.available ?? 0, icon: Wallet, hint: 'عمولات طلبات مسلّمة' },
    { label: 'قيد الدفع', value: b?.inPayout ?? 0, icon: Clock, hint: 'داخل طلبات سحب قيد المراجعة' },
    { label: 'عمولة مدفوعة', value: b?.paid ?? 0, icon: Banknote, hint: 'إجمالي المسحوب سابقاً' },
  ];

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">أهلاً {affiliateUser?.name} 👋</h1>
          <p className="text-xs text-muted-foreground mt-1">
            كودك التسويقي: <span className="font-mono font-bold text-primary">{affiliateUser?.code}</span>
            {' '}— استخدمه مع عملائك عند الطلب من المتجر
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border rounded-lg px-3 py-2 bg-card">
            <Percent className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">نسبة التسليم</span>
            <span className="font-bold">{b?.deliveryRate ?? 0}%</span>
          </div>
        </div>
      </div>

      {/* Order stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {orderCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Icon className="h-4 w-4" />
                {card.label}
              </div>
              <div className="text-2xl font-bold">{card.value}</div>
            </Card>
          );
        })}
      </div>

      {/* Money stats */}
      <div>
        <h2 className="text-sm font-bold mb-2 text-muted-foreground">💰 محفظة العمولات</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {moneyCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="p-4 border-primary/20">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {card.label}
                </div>
                <div className="text-xl font-bold text-primary">{formatKwd(card.value)}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{card.hint}</div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Top products */}
      {(data?.topProducts?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-2">🔥 الأكثر مبيعاً عندك</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data!.topProducts.map((p) => (
              <Card key={p.productId} className="p-3 flex items-center gap-3">
                {p.thumb ? (
                   
                  <img src={p.thumb} alt={p.name} className="w-12 h-12 rounded object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.qty} قطعة · عمولة {formatKwd(p.commission)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold">آخر طلباتك (30 يوم)</h2>
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => setView('affiliate-orders')}
          >
            عرض الكل
          </button>
        </div>
        {data?.recentOrders?.length ? (
          <div className="space-y-2">
            {data.recentOrders.map((o) => (
              <Card key={o.id} className="p-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">#{o.orderNumber}</span>
                <span className="font-medium">{o.customerName}</span>
                <span className="text-muted-foreground">{formatKwd(o.total)}</span>
                {o.commissionTotal > 0 && (
                  <span className="text-primary font-bold text-xs">
                    عمولتك {formatKwd(o.commissionTotal)}
                  </span>
                )}
                <Badge className={`mr-auto ${STATUS_COLORS[o.status] || ''}`}>
                  {STATUS_LABELS_AR[o.status] || o.status}
                </Badge>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            لا توجد طلبات بعد — ابدأ من «اضف طلب» أو شارك منتجاتك المفضلة مع عملائك
          </Card>
        )}
      </div>
    </div>
  );
}
