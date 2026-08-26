'use client';

/**
 * AdminSettingsView — store operations settings.
 * Currently: shipping price control (fee + free threshold + note).
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Truck, Save, Loader2, Coins, Gift, MessageSquareText } from 'lucide-react';

export function AdminSettingsView() {
  const adminToken = useAppStore((s) => s.adminToken);
  const [shipping, setShipping] = useState({ price: 2, freeThreshold: 50, note: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/shipping', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.ok) {
          const s = await res.json();
          setShipping({
            price: s.price,
            freeThreshold: s.freeThreshold,
            note: s.note || '',
          });
        }
      } catch {
        toast.error('فشل تحميل الإعدادات');
      } finally {
        setLoading(false);
      }
    })();
  }, [adminToken]);

  async function saveShipping(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/shipping', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(shipping),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        toast.success('تم حفظ إعدادات التوصيل — سارية فوراً في المتجر');
      } else {
        toast.error('فشل الحفظ');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-7 w-7 text-primary" />
          إعدادات المتجر
        </h1>
        <p className="text-sm text-muted-foreground">
          تحكم في أسعار التوصيل — التغييرات تظهر للعملاء فوراً
        </p>
      </div>

      <form onSubmit={saveShipping}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5 text-accent" />
              سعر التوصيل
            </CardTitle>
            <CardDescription>
              يُطبّق على جميع الطلبات الجديدة في صفحة إتمام الطلب
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ship-price" className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  سعر التوصيل (د.ك)
                </Label>
                <Input
                  id="ship-price"
                  type="number"
                  min="0"
                  step="0.25"
                  dir="ltr"
                  value={shipping.price}
                  onChange={(e) =>
                    setShipping((s) => ({ ...s, price: Number(e.target.value) || 0 }))
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  المبلغ الذي يدفعه العميل عند عدم تحقيق الشحن المجاني
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ship-free" className="flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5" />
                  حد الشحن المجاني (د.ك)
                </Label>
                <Input
                  id="ship-free"
                  type="number"
                  min="0"
                  step="1"
                  dir="ltr"
                  value={shipping.freeThreshold}
                  onChange={(e) =>
                    setShipping((s) => ({
                      ...s,
                      freeThreshold: Number(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  الطلبات بهذه القيمة أو أكثر = توصيل مجاني (0 = تعطيل)
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ship-note" className="flex items-center gap-1.5">
                <MessageSquareText className="h-3.5 w-3.5" />
                ملاحظة تظهر للعميل في الدفع (اختياري)
              </Label>
              <Input
                id="ship-note"
                placeholder="مثال: التوصيل خلال 24-48 ساعة لكل المحافظات"
                value={shipping.note}
                onChange={(e) => setShipping((s) => ({ ...s, note: e.target.value }))}
              />
            </div>

            {/* Live preview */}
            <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1.5">
              <p className="font-bold text-xs mb-1">معاينة لما سيراه العميل:</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">طلب بقيمة 30 د.ك:</span>
                <span>
                  توصيل {shipping.price} د.ك + تلميح "أضف{' '}
                  {Math.max(0, shipping.freeThreshold - 30)} د.ك للشحن المجاني"
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  طلب بقيمة {shipping.freeThreshold} د.ك+:
                </span>
                <span className="text-green-600 font-medium">توصيل مجاني 🎉</span>
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ إعدادات التوصيل
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
