'use client';

/**
 * AffiliateCommissionsView — عمولاتي والسحب:
 * رصيد المحفظة + الطلبات المسلّمة القابلة للسحب (تحديد → طلب تحويل)
 * + كشف حساب كامل + سجل طلبات السحب السابقة.
 */
import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatKwd } from '@/lib/utils/format';
import { PAYOUT_METHODS, WITHDRAWAL_LABELS } from '@/lib/commission';
import { toast } from 'sonner';
import { Wallet, Clock, Banknote, TrendingUp } from 'lucide-react';

interface Data {
  buckets: { expected: number; available: number; inPayout: number; paid: number };
  entries: any[];
  withdrawals: any[];
  withdrawable: any[];
}

export function AffiliateCommissionsView() {
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState('');
  const [accountInfo, setAccountInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [meRes, res] = await Promise.all([
        fetch('/api/affiliate/me', { headers: { Authorization: `Bearer ${affiliateToken || ''}` } }),
        fetch('/api/affiliate/commissions', { headers: { Authorization: `Bearer ${affiliateToken || ''}` } }),
      ]);
      if (meRes.ok) {
        const me = await meRes.json();
        if (me.affiliate?.paymentMethod) setMethod(me.affiliate.paymentMethod);
        if (me.affiliate?.paymentAccount) setAccountInfo(me.affiliate.paymentAccount);
      }
      if (res.ok) setData(await res.json());
      else toast.error('فشل تحميل بيانات العمولات');
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setLoading(false);
    }
  }, [affiliateToken]);

  useEffect(() => {
    load();
     
  }, []);

  const withdrawable = data?.withdrawable || [];
  const selectedTotal = withdrawable
    .filter((o) => selected.has(o.id))
    .reduce((s, o) => s + (o.commission || 0), 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    if (!selected.size) {
      toast.error('حدد الطلبات التي تريد سحب عمولتها');
      return;
    }
    if (!method) {
      toast.error('اختر طريقة التحويل');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/affiliate/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${affiliateToken || ''}`,
        },
        body: JSON.stringify({ orderIds: [...selected], method, accountInfo }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(`تم إرسال طلب سحب بمبلغ ${formatKwd(d.withdrawal.amount)} — قيد المراجعة`);
        setSelected(new Set());
        await load();
      } else {
        toast.error(d.error || 'فشل إرسال الطلب');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !data) {
    return <div className="p-4 text-muted-foreground text-sm">جاري التحميل...</div>;
  }

  const b = data.buckets;

  return (
    <div className="p-4 space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold">عمولاتي والسحب</h1>

      {/* wallet summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'متوقعة', value: b.expected, icon: TrendingUp, hint: 'طلبات لسه بتوصل' },
          { label: 'قابلة للسحب', value: b.available, icon: Wallet, hint: 'من طلبات مسلّمة' },
          { label: 'قيد الدفع', value: b.inPayout, icon: Clock, hint: 'طلبات سحب مفتوحة' },
          { label: 'مدفوعة', value: b.paid, icon: Banknote, hint: 'إجمالي المسحوب' },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-3 border-primary/20">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {c.label}
              </div>
              <div className={`font-bold ${c.label === 'قابلة للسحب' ? 'text-primary text-xl' : 'text-lg'}`}>
                {formatKwd(c.value)}
              </div>
              <div className="text-[10px] text-muted-foreground">{c.hint}</div>
            </Card>
          );
        })}
      </div>

      {/* withdrawal request builder */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm">طلب تحويل عمولة</h2>
          {withdrawable.length > 0 && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() =>
                setSelected(
                  selected.size === withdrawable.length
                    ? new Set()
                    : new Set(withdrawable.map((o) => o.id))
                )
              }
            >
              {selected.size === withdrawable.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
          )}
        </div>

        {!withdrawable.length ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            لا توجد عمولات جاهزة للسحب حالياً — تُصبح عمولة الطلب قابلة للسحب بعد تسليمه للعميل.
          </p>
        ) : (
          <>
            <div className="border rounded-md divide-y max-h-64 overflow-auto">
              {withdrawable.map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-3 p-2.5 text-sm cursor-pointer hover:bg-accent/50"
                >
                  <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggle(o.id)} />
                  <span className="font-mono text-xs text-muted-foreground">#{o.orderNumber}</span>
                  <span className="flex-1 truncate">{o.customerName}</span>
                  <span className="text-primary font-bold">{formatKwd(o.commission)}</span>
                </label>
              ))}
            </div>

            <form onSubmit={submitWithdrawal} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div>
                <Label className="text-xs mb-1 block">طريقة التحويل</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع التحويل" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYOUT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">رقم الحساب / الآيبان</Label>
                <Input value={accountInfo} onChange={(e) => setAccountInfo(e.target.value)} dir="ltr" />
              </div>
              <Button type="submit" disabled={submitting || !selected.size} className="w-full">
                {submitting
                  ? 'جاري الإرسال...'
                  : `طلب تحويل (${selected.size} طلب — ${formatKwd(selectedTotal)})`}
              </Button>
            </form>
          </>
        )}
      </Card>

      {/* withdrawal history */}
      {data.withdrawals.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-2">سجل طلبات السحب</h2>
          <div className="space-y-2">
            {data.withdrawals.map((w) => (
              <Card key={w.id} className="p-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold">{formatKwd(w.amount)}</span>
                <span className="text-xs text-muted-foreground">
                  {PAYOUT_METHODS.find((m) => m.value === w.method)?.label || w.method} · {w.orderCount} طلب
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(w.createdAt).toLocaleDateString('ar-KW')}
                </span>
                {w.paymentRef && (
                  <span dir="ltr" className="text-[10px] font-mono text-muted-foreground">
                    مرجع: {w.paymentRef}
                  </span>
                )}
                <Badge
                  className={`mr-auto ${
                    w.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : w.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {WITHDRAWAL_LABELS[w.status] || w.status}
                </Badge>
                {w.adminNote && (
                  <span className="w-full text-[11px] text-muted-foreground">
                    ملاحظة الإدارة: {w.adminNote}
                  </span>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ledger statement */}
      <div>
        <h2 className="text-sm font-bold mb-2">كشف الحساب</h2>
        {!data.entries.length ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            لا توجد حركات بعد — أول عمولة تُسجّل عند تسليم أول طلب لك
          </Card>
        ) : (
          <div className="border rounded-md divide-y">
            {data.entries.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs">{e.typeLabel}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {e.orderNumber ? `#${e.orderNumber}` : ''} {e.note || ''}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleDateString('ar-KW')}
                </span>
                <span
                  className={`font-bold whitespace-nowrap ${
                    e.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {e.amount >= 0 ? '+' : ''}
                  {formatKwd(e.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
