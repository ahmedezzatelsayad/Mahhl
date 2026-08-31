'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatKwd, formatNumber } from '@/lib/utils/format';
import {
  Package,
  ShoppingCart,
  Users,
  Tags,
  AlertTriangle,
  TrendingUp,
  Star,
  BadgeCheck,
} from 'lucide-react';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalCategories: number;
  pendingOrders: number;
  confirmedOrders: number;
  lowStockProducts: number;
  bestSellersCount: number;
  totalRevenue: number;
  recentOrders: any[];
}

export function AdminDashboardView() {
  const setView = useAppStore((s) => s.setView);
  const adminToken = useAppStore((s) => s.adminToken);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [adminToken]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">مرحباً في لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground">نظرة عامة على المتجر</p>
        </div>
        <Button onClick={() => setView('admin-add-product')}>
          <Package className="h-4 w-4 ml-2" />
          إضافة منتج جديد
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="إجمالي المنتجات"
          value={formatNumber(stats.totalProducts)}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label="إجمالي الطلبات"
          value={formatNumber(stats.totalOrders)}
          subValue={`${stats.pendingOrders} قيد الانتظار`}
          color="bg-orange-50 text-orange-700"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="العملاء"
          value={formatNumber(stats.totalCustomers)}
          color="bg-green-50 text-green-700"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="إجمالي المبيعات"
          value={formatKwd(stats.totalRevenue)}
          color="bg-purple-50 text-purple-700"
        />
        <StatCard
          icon={<Tags className="h-5 w-5" />}
          label="الفئات"
          value={formatNumber(stats.totalCategories)}
          color="bg-pink-50 text-pink-700"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="مخزون منخفض"
          value={formatNumber(stats.lowStockProducts)}
          subValue="أقل من 10 قطع"
          color="bg-red-50 text-red-700"
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="الأكثر مبيعاً"
          value={formatNumber(stats.bestSellersCount)}
          color="bg-yellow-50 text-yellow-700"
        />
        <StatCard
          icon={<BadgeCheck className="h-5 w-5" />}
          label="طلبات مؤكدة"
          value={formatNumber(stats.confirmedOrders)}
          color="bg-emerald-50 text-emerald-700"
        />
      </div>

      {/* Recent orders */}
      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-card flex items-center justify-between">
          <h2 className="font-bold">أحدث الطلبات</h2>
          <Button variant="ghost" size="sm" onClick={() => setView('admin-orders')}>
            عرض الكل
          </Button>
        </div>
        {stats.recentOrders.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">لا توجد طلبات بعد</p>
        ) : (
          <div className="divide-y">
            {stats.recentOrders.map((o: any) => (
              <div
                key={o.id}
                className="p-4 flex items-center justify-between hover:bg-accent/30 cursor-pointer"
                onClick={() => setView('admin-orders')}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium font-mono text-sm">{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.customerName || o.customer?.name} •{' '}
                    {new Date(o.createdAt).toLocaleString('ar-KW', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-primary">
                    {formatKwd(o.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">{o.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: string;
}) {
  return (
    <Card className="p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-xl md:text-2xl font-bold">{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
