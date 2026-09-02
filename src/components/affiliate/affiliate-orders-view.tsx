'use client';

/**
 * AffiliateOrdersView — طلبات المسوق مع فلاتر الحالة/التاريخ/البحث
 * وعمولة كل طلب + حالة الحجز في طلب سحب.
 */
import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatKwd } from '@/lib/utils/format';
import { STATUS_LABELS_AR, STATUS_COLORS } from '@/lib/commission';
import { toast } from 'sonner';
import { Search, ChevronRight, ChevronLeft } from 'lucide-react';

const STATUS_OPTIONS = [
  'all', 'pending', 'confirmed', 'deferred', 'processing',
  'shipped', 'delivered', 'returned', 'cancelled', 'commission_received',
];

export function AffiliateOrdersView() {
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        perPage: '25',
        status,
        ...(from && { from }),
        ...(to && { to }),
        ...(q && { q }),
      });
      const res = await fetch(`/api/affiliate/orders?${params}`, {
        headers: { Authorization: `Bearer ${affiliateToken || ''}` },
      });
      if (res.status === 401) {
        toast.error('انتهت جلستك — سجل دخول مرة ثانية');
        return;
      }
      const data = await res.json();
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(Math.max(1, Math.ceil((data.total || 0) / (data.perPage || 25))));
    } finally {
      setLoading(false);
    }
  }, [affiliateToken, status, from, to, q]);

  useEffect(() => {
    load(1);
     
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">طلباتي</h1>
        <span className="text-xs text-muted-foreground">{total} طلب</span>
      </div>

      <Card className="p-3 grid grid-cols-2 md:grid-cols-5 gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="رقم الطلب / الاسم / الهاتف"
          className="col-span-2"
        />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'كل الحالات' : STATUS_LABELS_AR[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => load(1)}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="h-14 animate-pulse bg-muted" />
          ))}
        </div>
      ) : !orders.length ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          لا توجد طلبات مطابقة
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Card key={o.id} className="overflow-hidden">
              <button
                className="w-full flex flex-wrap items-center gap-2 p-3 text-right text-sm hover:bg-accent/50"
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
              >
                <span className="font-mono text-xs text-muted-foreground">#{o.orderNumber}</span>
                <span className="font-medium">{o.customerName}</span>
                <span dir="ltr" className="text-xs text-muted-foreground">{o.phone}</span>
                <span className="text-muted-foreground">{formatKwd(o.total)}</span>
                {(o.commissionTotal || 0) > 0 && (
                  <span className="text-primary font-bold text-xs">
                    عمولة {formatKwd(o.commissionTotal)}
                  </span>
                )}
                {o.lockedInWithdrawal && (
                  <Badge variant="outline" className="text-[10px]">محجوز للسحب</Badge>
                )}
                <Badge className={`mr-auto ${STATUS_COLORS[o.status] || ''}`}>
                  {o.statusLabel || STATUS_LABELS_AR[o.status] || o.status}
                </Badge>
              </button>
              {expanded === o.id && (
                <div className="border-t p-3 bg-muted/20 space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {o.governorate} {o.area ? `— ${o.area}` : ''}
                  </div>
                  {o.items?.map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between text-xs">
                      <span className="truncate">
                        {it.name} × {it.quantity}
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {formatKwd(it.price * it.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>
            <ChevronRight className="h-4 w-4" /> السابق
          </Button>
          <span className="text-xs text-muted-foreground">صفحة {page} من {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => load(page + 1)}>
            التالي <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
