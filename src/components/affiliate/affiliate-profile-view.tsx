'use client';

/**
 * AffiliateProfileView — حساب المسوق: بيانات الدفع + كود التسويقي + تغيير كلمة المرور.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PAYOUT_METHODS } from '@/lib/commission';
import { toast } from 'sonner';
import { Copy, ShieldCheck, Clock, XCircle } from 'lucide-react';

export function AffiliateProfileView() {
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const affiliateUser = useAppStore((s) => s.affiliateUser);

  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/affiliate/me', {
      headers: { Authorization: `Bearer ${affiliateToken || ''}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.affiliate) {
          setPaymentMethod(d.affiliate.paymentMethod || '');
          setPaymentAccount(d.affiliate.paymentAccount || '');
          setEmail(d.affiliate.email || '');
        }
      })
      .catch(() => {});
  }, [affiliateToken]);

  async function save(profile: boolean) {
    setSaving(true);
    try {
      const res = await fetch('/api/affiliate/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${affiliateToken || ''}`,
        },
        body: JSON.stringify(
          profile
            ? { paymentMethod, paymentAccount, email }
            : { currentPassword, newPassword }
        ),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(profile ? 'تم حفظ بيانات الدفع' : 'تم تغيير كلمة المرور');
        if (!profile) {
          setCurrentPassword('');
          setNewPassword('');
        }
      } else {
        toast.error(d.error || 'فشل الحفظ');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setSaving(false);
    }
  }

  const statusBadge =
    affiliateUser?.status === 'active' ? (
      <Badge className="bg-green-100 text-green-800">
        <ShieldCheck className="h-3 w-3 ml-1" /> حساب مفعّل
      </Badge>
    ) : affiliateUser?.status === 'pending' ? (
      <Badge className="bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 ml-1" /> قيد المراجعة
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <XCircle className="h-3 w-3 ml-1" /> موقوف
      </Badge>
    );

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">حسابي</h1>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">{affiliateUser?.name}</div>
            <div dir="ltr" className="text-xs text-muted-foreground text-right">{affiliateUser?.phone}</div>
          </div>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2 border rounded-lg p-3 bg-muted/30">
          <div className="flex-1">
            <div className="text-[11px] text-muted-foreground">كودك التسويقي — تقدر تطلبه من عميلك عند الطلب</div>
            <div className="font-mono font-bold text-lg">{affiliateUser?.code}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(affiliateUser?.code || '');
              toast.success('تم نسخ الكود');
            }}
          >
            <Copy className="h-4 w-4 ml-1" /> نسخ
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-bold text-sm">بيانات استلام الأرباح</h2>
        <div>
          <Label className="text-xs mb-1 block">طريقة التحويل المفضلة</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue placeholder="اختر طريقة الدفع" />
            </SelectTrigger>
            <SelectContent>
              {PAYOUT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1 block">رقم الحساب / الآيبان / حساب PayPal</Label>
          <Input value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)} dir="ltr" />
        </div>
        <div>
          <Label className="text-xs mb-1 block">الإيميل</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" type="email" />
        </div>
        <Button onClick={() => save(true)} disabled={saving}>حفظ البيانات</Button>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-bold text-sm">تغيير كلمة المرور</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block">كلمة المرور الحالية</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              dir="ltr"
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">كلمة المرور الجديدة</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              dir="ltr"
              minLength={6}
            />
          </div>
        </div>
        <Button variant="outline" onClick={() => save(false)} disabled={saving || !newPassword}>
          تحديث كلمة المرور
        </Button>
      </Card>
    </div>
  );
}
