'use client';

/**
 * AdminCommissionsView — العمولات والمحاسبة:
 * بطاقات مالية عامة + دفتر حركات كامل + تسويات يدوية (مكافأة/خصم/دفعة).
 */
import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/stores/app-store';
import { formatKwd } from '@/lib/utils/format';
import { ENTRY_LABELS } from '@/lib/commission';
import { toast } from 'sonner';
import { TrendingUp, Wallet, Clock, Banknote, PlusCircle } from 'lucide-react';

export function AdminCommissionsView() {
  const adminToken = useAppStore((s) => s.adminToken);
  const auth = { Authorization: `Bearer ${adminToken || ''}` };

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [affiliateId, setAffiliateId] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // manual entry form
  const [adjAff, setAdjAff] = useState('');
  const [adjType, setAdjType] = useState('adjustment');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNote, setAdjNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/commissions?type=${type}&affiliateId=${affiliateId}&page=${p}`,
        { headers: auth }
      );
      if (res.status === 401) return toast.error('انتهت الجلسة');
      const d = await res.json();
      setData(d);
      setPage(d.page);
      setPages(Math.max(1, Math.ceil((d.total || 0) / (d.perPage || 40))));
    } finally {
      setLoading(false);
    }
     
  }, [type, affiliateId, adminToken]);

  useEffect(() => {
    load(1);
     
  }, []);

  async function submitAdjustment(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(adjAmount);
    if (!adjAff || !adjAmount) return toast.error('اختر المسوق واكتب المبلغ');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({
          affiliateId: adjAff,
          type: adjType,
          amount: adjType === 'payout' ? -Math.abs(amount) : amount,
          note: adjNote,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success('تم تسجيل الحركة');
        setAdjAmount(''); setAdjNote('');
        load(1);
      } else toast.error(d.error || 'فشل التسجيل');
    } finally {
      setSaving(false);
    }
  }

  const b = data?.buckets;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">العمولات والمحاسبة</h1>

      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'عمولات متوقعة', value: b?.expected, icon: TrendingUp, hint: 'طلبات في الطريق' },
            { label: 'أرصدة المسوقين', value: b?.balance, icon: Wallet, hint: 'إجمالي الدفتر' },
            { label: 'قابلة للسحب', value: b?.available, icon: Wallet, hint: 'دون طلبات السحب المفتوحة' },
            { label: 'قيد الدفع', value: b?.inPayout, icon: Clock, hint: `${b?.pendingWithdrawals || 0} طلب سحب` },
            { label: 'مدفوع فعلاً', value: b?.paid, icon: Banknote, hint: `${b?.activeAffiliates || 0}/${b?.affiliates || 0} مسوق نشط` },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                  <Icon className="h-4 w-4 text-primary" /> {c.label}
                </div>
                <div className="text-xl font-bold">{formatKwd(c.value || 0)}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{c.hint}</div>
              </Card>
            );
          })}
        </div>
      )}

      {/* manual entry */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <PlusCircle className="h-4 w-4 text-primary" />
          <h2 className="font-bold text-sm">حركة يدوية (مكافأة / خصم / دفعة)</h2>
        </div>
        <form onSubmit={submitAdjustment} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <div>
            <Label className="text-xs mb-1 block">المسوق *</Label>
            <select
              value={adjAff}
              onChange={(e) => setAdjAff(e.target.value)}
              className="h-9 w-full rounded-md border bg-card px-2 text-sm"
              required
            >
              <option value="">اختر...</option>
              {(data?.affiliates || []).map((a: any) => (
                <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">النوع *</Label>
            <select
              value={adjType}
              onChange={(e) => setAdjType(e.target.value)}
              className="h-9 w-full rounded-md border bg-card px-2 text-sm"
            >
              <option value="adjustment">تسوية (± )</option>
              <option value="payout">دفعة (− )</option>
            </select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">
              المبلغ {adjType === 'payout' ? '(يُسجل سالباً)' : '(+ مكافأة / − خصم)'}
            </Label>
            <Input
              type="number"
              step="0.001"
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.target.value)}
              required
              dir="ltr"
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">ملاحظة</Label>
            <Input value={adjNote} onChange={(e) => setAdjNote(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving}>تسجيل</Button>
        </form>
      </Card>

      {/* filters */}
      <Card className="p-3 flex flex-wrap gap-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm">
          <option value="all">كل الحركات</option>
          {Object.entries(ENTRY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={affiliateId}
          onChange={(e) => setAffiliateId(e.target.value)}
          className="h-9 rounded-md border bg-card px-3 text-sm"
        >
          <option value="all">كل المسوقين</option>
          {(data?.affiliates || []).map((a: any) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <Button variant="outline" onClick={() => load(1)}>تحديث</Button>
      </Card>

      {/* ledger */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : !data?.entries?.length ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">لا توجد حركات مطابقة</Card>
      ) : (
        <div className="border rounded-md divide-y">
          {data.entries.map((e: any) => (
            <div key={e.id} className="flex items-center gap-3 p-3 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs">
                  {e.typeLabel} — <span className="text-primary">{e.affiliate?.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground mr-1">{e.affiliate?.code}</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {e.orderNumber ? `#${e.orderNumber}` : ''} {e.note || ''}
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {new Date(e.createdAt).toLocaleDateString('ar-KW')}
              </span>
              <span className={`font-bold whitespace-nowrap ${e.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {e.amount >= 0 ? '+' : ''}{formatKwd(e.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>السابق</Button>
          <span className="text-xs text-muted-foreground">صفحة {page} من {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => load(page + 1)}>التالي</Button>
        </div>
      )}
    </div>
  );
}
