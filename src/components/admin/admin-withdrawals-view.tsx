'use client';

/**
 * AdminWithdrawalsView — طلبات السحب:
 * طلبات معلّقة (قبول+دفع / رفض) + السجل — مع تفاصيل الطلبات وبيانات التحويل.
 */
import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/stores/app-store';
import { formatKwd } from '@/lib/utils/format';
import { PAYOUT_METHODS, PAYOUT_METHOD_LABELS, WITHDRAWAL_LABELS } from '@/lib/commission';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface WD {
  id: string; amount: number; method: string; status: string;
  accountInfo: string | null; adminNote: string | null; paymentRef: string | null;
  createdAt: string; processedAt: string | null;
  affiliate: { id: string; name: string; phone: string; code: string; paymentAccount: string | null };
  orders: { id: string; orderNumber: string; customerName: string; status: string; amount: number }[];
}

export function AdminWithdrawalsView() {
  const adminToken = useAppStore((s) => s.adminToken);
  const auth = { Authorization: `Bearer ${adminToken || ''}` };
  const [rows, setRows] = useState<WD[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState<{ [id: string]: { ref: string; note: string } }>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals?status=${status}`, { headers: auth });
      if (res.status === 401) return toast.error('انتهت الجلسة');
      setRows(await res.json());
    } finally {
      setLoading(false);
    }
     
  }, [status, adminToken]);

  useEffect(() => {
    load();
     
  }, []);

  async function act(w: WD, action: 'pay' | 'reject') {
    if (action === 'reject' && !confirm(`رفض طلب سحب ${formatKwd(w.amount)} من ${w.affiliate.name}؟`)) return;
    const body =
      action === 'pay'
        ? { action, paymentRef: payForm[w.id]?.ref || '', adminNote: payForm[w.id]?.note || '' }
        : { action, adminNote: payForm[w.id]?.note || '' };
    const res = await fetch(`/api/admin/withdrawals/${w.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (res.ok) {
      toast.success(action === 'pay' ? 'تم تسجيل الدفع — وصل إشعار للمسوق في سجله' : 'تم رفض الطلب');
      load();
    } else toast.error(d.error || 'فشل التنفيذ');
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">طلبات سحب العمولة</h1>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border bg-card px-3 text-sm"
        >
          <option value="all">الكل</option>
          <option value="pending">قيد المراجعة</option>
          <option value="paid">مدفوعة</option>
          <option value="rejected">مرفوضة</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : !rows.length ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">لا توجد طلبات</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((w) => (
            <Card key={w.id} className={`p-4 space-y-3 ${w.status === 'pending' ? 'border-primary/40' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-40">
                  <div className="font-bold text-sm">
                    {w.affiliate.name}
                    <span className="font-mono text-xs text-muted-foreground mr-2">{w.affiliate.code}</span>
                  </div>
                  <div dir="ltr" className="text-xs text-muted-foreground text-right">{w.affiliate.phone}</div>
                </div>
                <div className="text-left">
                  <div className="text-xs text-muted-foreground">المبلغ المطلوب</div>
                  <div className="font-bold text-primary text-lg">{formatKwd(w.amount)}</div>
                </div>
                <Badge
                  className={
                    w.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : w.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }
                >
                  {w.status === 'paid' ? <CheckCircle2 className="h-3 w-3 ml-1" /> : w.status === 'rejected' ? <XCircle className="h-3 w-3 ml-1" /> : <Clock className="h-3 w-3 ml-1" />}
                  {WITHDRAWAL_LABELS[w.status] || w.status}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground">
                طريقة التحويل: <span className="font-bold text-foreground">{PAYOUT_METHOD_LABELS[w.method] || w.method}</span>
                {w.accountInfo && <> · الحساب: <span dir="ltr" className="font-mono">{w.accountInfo}</span></>}
                {' · '}طلب بتاريخ {new Date(w.createdAt).toLocaleDateString('ar-KW')} · {w.orders.length} طلب
              </div>

              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setOpenId(openId === w.id ? null : w.id)}
              >
                {openId === w.id ? 'إخفاء الطلبات' : 'عرض الطلبات المشمولة'}
              </button>
              {openId === w.id && (
                <div className="border rounded-md divide-y max-h-48 overflow-auto">
                  {w.orders.map((o) => (
                    <div key={o.id} className="flex items-center gap-2 p-2 text-xs">
                      <span className="font-mono text-muted-foreground">#{o.orderNumber}</span>
                      <span className="flex-1 truncate">{o.customerName}</span>
                      <span className="text-primary font-bold">{formatKwd(o.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {w.status === 'pending' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end border-t pt-3">
                  <div>
                    <Label className="text-xs mb-1 block">مرجع التحويل</Label>
                    <Input
                      value={payForm[w.id]?.ref || ''}
                      onChange={(e) =>
                        setPayForm((f) => ({ ...f, [w.id]: { ref: e.target.value, note: f[w.id]?.note || '' } }))
                      }
                      dir="ltr"
                      placeholder="اختياري"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">ملاحظة (تظهر للمسوق عند الرفض)</Label>
                    <Input
                      value={payForm[w.id]?.note || ''}
                      onChange={(e) =>
                        setPayForm((f) => ({ ...f, [w.id]: { ref: f[w.id]?.ref || '', note: e.target.value } }))
                      }
                    />
                  </div>
                  <Button onClick={() => act(w, 'pay')} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="h-4 w-4 ml-1" /> تم التحويل والدفع
                  </Button>
                  <Button variant="destructive" onClick={() => act(w, 'reject')}>
                    <XCircle className="h-4 w-4 ml-1" /> رفض الطلب
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  {w.paymentRef && <>مرجع الدفع: <span dir="ltr" className="font-mono">{w.paymentRef}</span> · </>}
                  عولج بتاريخ {w.processedAt ? new Date(w.processedAt).toLocaleDateString('ar-KW') : '—'}
                  {w.adminNote && <> · ملاحظة: {w.adminNote}</>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
