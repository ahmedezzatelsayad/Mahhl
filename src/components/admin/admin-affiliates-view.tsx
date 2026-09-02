'use client';

/**
 * AdminAffiliatesView — إدارة المسوقين:
 * قائمة كاملة مع الأرصدة والحالات + إضافة مسوق + تفعيل/تعليق + بيانات الدفع.
 */
import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/stores/app-store';
import { formatKwd } from '@/lib/utils/format';
import { PAYOUT_METHODS, PAYOUT_METHOD_LABELS } from '@/lib/commission';
import { toast } from 'sonner';
import { Search, UserPlus, ShieldCheck, ShieldOff, Clock, Trash2 } from 'lucide-react';

interface AffRow {
  id: string; name: string; phone: string; email: string | null; code: string;
  status: string; paymentMethod: string | null; paymentAccount: string | null;
  orderCount: number; balance: number; available: number; inPayout: number;
  paid: number; expected: number;
}

export function AdminAffiliatesView() {
  const adminToken = useAppStore((s) => s.adminToken);
  const auth = { Authorization: `Bearer ${adminToken || ''}` };
  const [rows, setRows] = useState<AffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliates?q=${encodeURIComponent(q)}&status=${status}`, { headers: auth });
      if (res.status === 401) return toast.error('انتهت الجلسة');
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
     
  }, [q, status, adminToken]);

  useEffect(() => {
    load();
     
  }, []);

  async function patch(id: string, body: any, msg: string) {
    const res = await fetch(`/api/admin/affiliates/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (res.ok) {
      toast.success(msg);
      load();
    } else toast.error(d.error || 'فشل التحديث');
  }

  async function remove(id: string) {
    if (!confirm('حذف المسوق نهائياً؟ (متاح فقط لمن لا يملك سجل عمولات)')) return;
    const res = await fetch(`/api/admin/affiliates/${id}`, { method: 'DELETE', headers: auth });
    const d = await res.json();
    if (res.ok) { toast.success('تم الحذف'); load(); }
    else toast.error(d.error || 'فشل الحذف');
  }

  async function addAffiliate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/affiliates', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (res.ok) {
      toast.success(`تم إنشاء المسوق — كوده ${d.affiliate.code}`);
      setShowAdd(false);
      setForm({ name: '', phone: '', password: '', notes: '' });
      load();
    } else toast.error(d.error || 'فشل الإنشاء');
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">المسوقون</h1>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus className="h-4 w-4 ml-1" /> إضافة مسوق
        </Button>
      </div>

      {showAdd && (
        <Card className="p-4 max-w-lg">
          <form onSubmit={addAffiliate} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <Label className="text-xs mb-1 block">الاسم *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label className="text-xs mb-1 block">الهاتف (8 أرقام) *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required dir="ltr" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">كلمة مرور مؤقتة *</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} dir="ltr" />
            </div>
            <Button type="submit" className="md:col-span-3">إنشاء الحساب (مفعّل مباشرة)</Button>
          </form>
        </Card>
      )}

      <Card className="p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم/الهاتف/الكود" className="pr-9" />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border bg-card px-3 text-sm"
        >
          <option value="all">كل الحالات</option>
          <option value="active">مفعّل</option>
          <option value="pending">قيد المراجعة</option>
          <option value="suspended">موقوف</option>
        </select>
        <Button variant="outline" onClick={load}>تحديث</Button>
      </Card>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !rows.length ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">لا يوجد مسوقون</Card>
      ) : (
        <div className="space-y-2">
          {rows.map((a) => (
            <Card key={a.id} className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-40">
                  <div className="font-bold text-sm">
                    {a.name}
                    <span className="font-mono text-xs text-muted-foreground mr-2">{a.code}</span>
                  </div>
                  <div dir="ltr" className="text-xs text-muted-foreground text-right">{a.phone}</div>
                </div>
                {a.status === 'active' ? (
                  <Badge className="bg-green-100 text-green-800">مفعّل</Badge>
                ) : a.status === 'pending' ? (
                  <Badge className="bg-yellow-100 text-yellow-800">قيد المراجعة</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">موقوف</Badge>
                )}
                <div className="flex gap-1">
                  {a.status !== 'active' && (
                    <Button size="sm" variant="outline" onClick={() => patch(a.id, { status: 'active' }, 'تم التفعيل')}>
                      <ShieldCheck className="h-4 w-4 ml-1" /> تفعيل
                    </Button>
                  )}
                  {a.status !== 'suspended' && (
                    <Button size="sm" variant="outline" onClick={() => patch(a.id, { status: 'suspended' }, 'تم التعليق')}>
                      <ShieldOff className="h-4 w-4 ml-1" /> تعليق
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="border rounded p-2">
                  <div className="text-muted-foreground">طلباته</div>
                  <div className="font-bold">{a.orderCount}</div>
                </div>
                <div className="border rounded p-2 border-primary/30">
                  <div className="text-muted-foreground">رصيد قابل للسحب</div>
                  <div className="font-bold text-primary">{formatKwd(a.available)}</div>
                </div>
                <div className="border rounded p-2">
                  <div className="text-muted-foreground">قيد الدفع</div>
                  <div className="font-bold">{formatKwd(a.inPayout)}</div>
                </div>
                <div className="border rounded p-2">
                  <div className="text-muted-foreground">مدفوع له</div>
                  <div className="font-bold">{formatKwd(a.paid)}</div>
                </div>
                <div className="border rounded p-2">
                  <div className="text-muted-foreground">طريقة الدفع</div>
                  <div className="font-bold text-[11px]">
                    {a.paymentMethod ? PAYOUT_METHOD_LABELS[a.paymentMethod] || a.paymentMethod : '—'}
                  </div>
                </div>
              </div>
              {a.paymentAccount && (
                <div dir="ltr" className="text-[11px] text-muted-foreground text-right">حساب: {a.paymentAccount}</div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
