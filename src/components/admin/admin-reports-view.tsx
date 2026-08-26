'use client';

/**
 * AdminReportsView — Daily business reports dashboard.
 * Revenue/orders bar chart (CSS), KPI cards, top products, upsell funnel.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatKwd, formatNumber } from '@/lib/utils/format';
import {
  BarChart3,
  CalendarDays,
  TrendingUp,
  ShoppingCart,
  Coins,
  Package,
  Users,
  Sparkles,
  RefreshCw,
  Crown,
} from 'lucide-react';

interface DayBucket {
  date: string;
  orders: number;
  revenue: number;
  itemsSold: number;
  sessions: number;
  addToCart: number;
  checkouts: number;
}

interface Reports {
  days: number;
  today: DayBucket;
  daily: DayBucket[];
  kpis: {
    orders: number;
    revenue: number;
    itemsSold: number;
    avgOrderValue: number;
    sessions: number;
    addToCart: number;
    conversionRate: number;
  };
  topProducts: { id: string; name: string; qty: number; revenue: number }[];
  upsellFunnel: { shown: number; clicked: number; added: number };
}

const RANGES = [
  { days: 7, label: '7 أيام' },
  { days: 14, label: '14 يوم' },
  { days: 30, label: '30 يوم' },
];

export function AdminReportsView() {
  const adminToken = useAppStore((s) => s.adminToken);
  const [data, setData] = useState<Reports | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  async function load(d: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?days=${d}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) setData(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const maxRevenue = data ? Math.max(1, ...data.daily.map((d) => d.revenue)) : 1;

  if (loading && !data) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">لا توجد بيانات</p>
      </div>
    );
  }

  const k = data.kpis;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            التقارير اليومية
          </h1>
          <p className="text-sm text-muted-foreground">
            نظرة شاملة على المبيعات والطلبات وسلوك الزوار
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  days === r.days
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card hover:bg-muted'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => load(days)}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Today snapshot — gold accent card */}
      <Card className="border-accent/40 bg-gradient-to-l from-accent/10 via-accent/5 to-transparent">
        <CardContent className="p-4 md:p-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl btn-gold">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-bold">اليوم</h2>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('ar-KW', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-xl font-extrabold">{formatKwd(data.today.revenue)}</p>
              <p className="text-[11px] text-muted-foreground">إيراد اليوم</p>
            </div>
            <div>
              <p className="text-xl font-extrabold">{formatNumber(data.today.orders)}</p>
              <p className="text-[11px] text-muted-foreground">طلب اليوم</p>
            </div>
            <div>
              <p className="text-xl font-extrabold">{formatNumber(data.today.itemsSold)}</p>
              <p className="text-[11px] text-muted-foreground">قطعة مبيعة</p>
            </div>
            <div>
              <p className="text-xl font-extrabold">{formatNumber(data.today.sessions)}</p>
              <p className="text-[11px] text-muted-foreground">زائر نشط</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ReportCard
          icon={<Coins className="h-5 w-5" />}
          label="إجمالي الإيراد"
          value={formatKwd(k.revenue)}
          sub={`متوسط الطلب ${formatKwd(k.avgOrderValue)}`}
          color="bg-amber-50 text-amber-700"
        />
        <ReportCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label="إجمالي الطلبات"
          value={formatNumber(k.orders)}
          sub={`${formatNumber(k.itemsSold)} قطعة مبيعة`}
          color="bg-green-50 text-green-700"
        />
        <ReportCard
          icon={<Users className="h-5 w-5" />}
          label="الزوار"
          value={formatNumber(k.sessions)}
          sub={`${formatNumber(k.addToCart)} إضافة للسلة`}
          color="bg-blue-50 text-blue-700"
        />
        <ReportCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="معدل التحويل"
          value={`${k.conversionRate}%`}
          sub="من الزائر للطلب"
          color="bg-purple-50 text-purple-700"
        />
      </div>

      {/* Revenue chart — pure CSS bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            الإيراد اليومي ({formatKwd(k.revenue)} في {data.days} يوم)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1.5 h-48" dir="ltr">
            {data.daily.map((d) => {
              const height = Math.max(3, (d.revenue / maxRevenue) * 100);
              const isToday = d.date === data.today.date;
              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center justify-end group relative"
                  title={`${d.date}: ${formatKwd(d.revenue)} — ${d.orders} طلب`}
                >
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isToday ? 'btn-gold' : 'bg-primary/75 group-hover:bg-primary'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground mt-1 rotate-0">
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            مرّر على الأعمدة لعرض التفاصيل — العمود الذهبي هو اليوم
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-5 w-5 text-accent" />
              الأكثر مبيعاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                لا توجد مبيعات في هذه الفترة بعد
              </p>
            ) : (
              <ul className="space-y-2.5">
                {data.topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                        i === 0
                          ? 'btn-gold text-white'
                          : i < 3
                            ? 'bg-accent/20 text-accent'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.qty} قطعة — {formatKwd(p.revenue)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upsell funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              قمع الـ Upsell الذكي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ['عُرضت التوصيات', data.upsellFunnel.shown, 100],
              [
                'نُقرت',
                data.upsellFunnel.clicked,
                data.upsellFunnel.shown
                  ? (data.upsellFunnel.clicked / data.upsellFunnel.shown) * 100
                  : 0,
              ],
              [
                'أُضيفت للسلة',
                data.upsellFunnel.added,
                data.upsellFunnel.shown
                  ? (data.upsellFunnel.added / data.upsellFunnel.shown) * 100
                  : 0,
              ],
            ].map(([label, value, pct]) => (
              <div key={label as string}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{label as string}</span>
                  <span className="font-bold">
                    {formatNumber(value as number)}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({Math.round(pct as number)}%)
                    </span>
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full btn-gold transition-all"
                    style={{ width: `${Math.max(2, pct as number)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              كل إضافة من التوصيات = زيادة مباشرة في متوسط قيمة الطلب
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5 text-accent" />
            التفاصيل اليومية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-right p-2.5 font-medium">التاريخ</th>
                  <th className="text-center p-2.5 font-medium">الطلبات</th>
                  <th className="text-center p-2.5 font-medium">الإيراد</th>
                  <th className="text-center p-2.5 font-medium">قطع مبيعة</th>
                  <th className="text-center p-2.5 font-medium hidden sm:table-cell">الزوار</th>
                  <th className="text-center p-2.5 font-medium hidden sm:table-cell">
                    إضافات السلة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...data.daily].reverse().map((d) => (
                  <tr
                    key={d.date}
                    className={d.date === data.today.date ? 'bg-accent/5 font-medium' : ''}
                  >
                    <td className="p-2.5" dir="ltr">
                      {d.date}
                      {d.date === data.today.date && (
                        <span className="text-[10px] text-accent mr-1">(اليوم)</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">{d.orders}</td>
                    <td className="p-2.5 text-center">{formatKwd(d.revenue)}</td>
                    <td className="p-2.5 text-center">{d.itemsSold}</td>
                    <td className="p-2.5 text-center hidden sm:table-cell">{d.sessions}</td>
                    <td className="p-2.5 text-center hidden sm:table-cell">{d.addToCart}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <Card className="card-lift">
      <CardContent className="p-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${color}`}>
          {icon}
        </div>
        <p className="text-lg md:text-xl font-extrabold leading-none">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
        <p className="text-[11px] text-muted-foreground/70">{sub}</p>
      </CardContent>
    </Card>
  );
}
