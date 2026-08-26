'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatKwd } from '@/lib/utils/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Truck, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/stores/app-store';

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function AdminOrdersView() {
  const setView = useAppStore((s) => s.setView);
  const adminToken = useAppStore((s) => s.adminToken);
  const auth = { Authorization: `Bearer ${adminToken || ''}` };
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [autoShipping, setAutoShipping] = useState(false);

  async function loadOrders() {
    setLoading(true);
    try {
      const r = await fetch('/api/orders', { headers: auth });
      if (r.status === 401) {
        toast.error('انتهت جلستك — سجل دخول مرة ثانية');
        setView('admin-login');
        return;
      }
      const data = await r.json();
      setOrders(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAutoShip() {
    setAutoShipping(true);
    try {
      const res = await fetch('/api/cron/autoship?force=1', { headers: auth });
      const data = await res.json();
      toast.success(data.message || 'تم تنفيذ الشحن التلقائي');
      await loadOrders();
    } catch {
      toast.error('فشل تنفيذ الشحن التلقائي');
    } finally {
      setAutoShipping(false);
    }
  }

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setOrders((os) =>
          os.map((o) => (o.id === id ? { ...o, status } : o))
        );
        toast.success('تم تحديث حالة الطلب');
      } else {
        toast.error('فشل التحديث');
      }
    } catch {
      toast.error('فشل التحديث');
    }
  }

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">الطلبات</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} طلب • إجمالي: {formatKwd(totalRevenue)} • قيد الانتظار: {pendingCount} • تم التسليم: {deliveredCount}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runAutoShip}
          disabled={autoShipping}
          title="يشحن كل الطلبات النشطة الآن ويضيف ميعاد الوصول"
        >
          {autoShipping ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Truck className="h-4 w-4 ml-2" />}
          تنفيذ الشحن التلقائي الآن
        </Button>
      </div>

      <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-[13px] flex items-center gap-2">
        <Truck className="h-4 w-4 text-gold-deep shrink-0" />
        <span>الشحن التلقائي يعمل يومياً الساعة <b>10:00 صباحاً</b> بتوقيت الكويت — كل طلب نشط يتحول إلى «تم الشحن» مع ميعاد الوصول.</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          الكل ({orders.length})
        </Button>
        {Object.entries(STATUS_LABELS).map(([k, v]) => {
          const count = orders.filter((o) => o.status === k).length;
          if (count === 0) return null;
          return (
            <Button
              key={k}
              variant={filter === k ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(k)}
            >
              {v} ({count})
            </Button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          لا توجد طلبات في هذه الحالة
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <Card key={o.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-accent/30"
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono font-bold text-sm">{o.orderNumber}</p>
                      <Badge className={STATUS_COLORS[o.status]}>
                        {STATUS_LABELS[o.status] || o.status}
                      </Badge>
                      {(o as any).utmSource && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-blue-300 text-blue-700 bg-blue-50"
                          title={`إعلان: ${(o as any).utmSource}${(o as any).utmCampaign ? ` / ${(o as any).utmCampaign}` : ''}`}
                        >
                          إعلان: {(o as any).utmSource}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">
                      <strong>العميل:</strong>{' '}
                      {o.customerName || o.customer?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString('ar-KW', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.items?.length || 0} منتجات
                    </p>
                    {o.shippedAt && (
                      <p className="text-xs text-purple-700 flex items-center gap-1 mt-0.5">
                        <Truck className="h-3 w-3" />
                        شُحن: {new Date(o.shippedAt).toLocaleString('ar-KW', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-primary text-lg">
                      {formatKwd(o.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.paymentMethod === 'cod' ? 'دفع عند الاستلام' : 'بطاقة'}
                    </p>
                  </div>
                </div>
              </div>

              {expanded === o.id && (
                <div className="border-t p-4 space-y-3 bg-muted/20">
                  <h4 className="font-bold">تفاصيل الطلب</h4>
                  <div className="space-y-2">
                    {o.items?.map((i: any) => (
                      <div key={i.id} className="flex justify-between text-sm">
                        <span className="line-clamp-1">
                          {i.name} × {i.quantity}
                        </span>
                        <span className="font-medium">{formatKwd(i.price * i.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                    <div>
                      <p className="text-muted-foreground text-xs">الهاتف</p>
                      <p dir="ltr">{o.phone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">المحافظة</p>
                      <p>{o.governorate}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">العنوان</p>
                      <p>{o.area} - {o.address}</p>
                    </div>
                    {o.arrivalNote && (
                      <div className="col-span-2 rounded-lg bg-purple-50 border border-purple-200 px-3 py-2">
                        <p className="text-muted-foreground text-xs">ميعاد الوصول (يظهر للعميل)</p>
                        <p className="text-[13px] font-medium text-purple-800">{o.arrivalNote}</p>
                      </div>
                    )}
                    {o.notes && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs">ملاحظات</p>
                        <p>{o.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border-t pt-3">
                    <span className="text-sm font-medium">تحديث الحالة:</span>
                    <Select
                      value={o.status}
                      onValueChange={(v) => updateStatus(o.id, v)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
