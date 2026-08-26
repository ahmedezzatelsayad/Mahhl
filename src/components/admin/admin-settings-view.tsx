'use client';

/**
 * AdminSettingsView — store operations settings.
 * 1. Site identity: logo, browser icon, store name, announcement bar, WhatsApp
 * 2. Shipping price control (fee + free threshold + note)
 */
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Truck, Save, Loader2, Coins, Gift, MessageSquareText,
  Store, ImagePlus, Globe, MessageCircle, Trash2,
} from 'lucide-react';

export function AdminSettingsView() {
  const adminToken = useAppStore((s) => s.adminToken);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const [shipping, setShipping] = useState({ price: 2, freeThreshold: 30, note: '' });
  const [identity, setIdentity] = useState({
    siteName: '',
    announcement: '',
    whatsapp: '',
    logo: '',
    favicon: '',
  });
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [shipRes, idRes] = await Promise.all([
          fetch('/api/admin/shipping', {
            headers: { Authorization: `Bearer ${adminToken}` },
          }),
          fetch('/api/admin/identity', {
            headers: { Authorization: `Bearer ${adminToken}` },
          }),
        ]);
        if (shipRes.ok) {
          const s = await shipRes.json();
          setShipping({
            price: s.price,
            freeThreshold: s.freeThreshold,
            note: s.note || '',
          });
        }
        if (idRes.ok) {
          const i = await idRes.json();
          setIdentity({
            siteName: i.siteName || '',
            announcement: i.announcement || '',
            whatsapp: i.whatsapp || '',
            logo: i.logo || '',
            favicon: i.favicon || '',
          });
        }
      } catch {
        toast.error('فشل تحميل الإعدادات');
      } finally {
        setLoading(false);
      }
    })();
  }, [adminToken]);

  function pickImage(
    e: React.ChangeEvent<HTMLInputElement>,
    key: 'logo' | 'favicon',
    maxMB: number
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`الحد الأقصى ${maxMB}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setIdentity((prev) => ({ ...prev, [key]: String(reader.result) }));
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function saveIdentity(ev: React.FormEvent) {
    ev.preventDefault();
    setSavingIdentity(true);
    try {
      const res = await fetch('/api/admin/identity', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          siteName: identity.siteName.trim() || 'محل شوب',
          announcement: identity.announcement.trim(),
          whatsapp: identity.whatsapp.replace(/\D/g, ''),
          logo: identity.logo,
          favicon: identity.favicon,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success('تم حفظ هوية المتجر — حدّث الصفحة تشوف اللوجو والأيقونة ✅');
      } else {
        toast.error(d.error || 'فشل الحفظ');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setSavingIdentity(false);
    }
  }

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
          هوية المتجر وأسعار التوصيل — التغييرات تظهر للعملاء فوراً
        </p>
      </div>

      {/* ============ Site Identity ============ */}
      <form onSubmit={saveIdentity}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="h-5 w-5 text-accent" />
              هوية المتجر
            </CardTitle>
            <CardDescription>
              اللوجو الرسمي، أيقونة المتصفح، اسم المتجر، شريط الإعلان وواتساب التواصل
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* logo + favicon uploads */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5" />
                  لوجو المتجر
                </Label>
                <div className="h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-white overflow-hidden">
                  {identity.logo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={identity.logo} alt="اللوجو" className="h-full object-contain p-1" />
                  ) : (
                    <span className="text-xs text-muted-foreground">PNG بخلفية شفافة (مستحسن)</span>
                  )}
                </div>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e, 'logo', 1.5)} />
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => logoRef.current?.click()}>
                    رفع لوجو
                  </Button>
                  {identity.logo && (
                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setIdentity((p) => ({ ...p, logo: '' }))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  أيقونة المتصفح (Favicon)
                </Label>
                <div className="h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-white overflow-hidden">
                  {identity.favicon ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={identity.favicon} alt="الأيقونة" className="h-16 w-16 object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">مربعة 512×512</span>
                  )}
                </div>
                <input ref={faviconRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e, 'favicon', 0.5)} />
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => faviconRef.current?.click()}>
                    رفع أيقونة
                  </Button>
                  {identity.favicon && (
                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setIdentity((p) => ({ ...p, favicon: '' }))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" />
                اسم المتجر
              </Label>
              <Input
                value={identity.siteName}
                onChange={(e) => setIdentity((p) => ({ ...p, siteName: e.target.value }))}
                placeholder="محل شوب"
              />
            </div>

            <div className="space-y-1.5">
              <Label>شريط الإعلان أعلى الموقع</Label>
              <Input
                value={identity.announcement}
                onChange={(e) => setIdentity((p) => ({ ...p, announcement: e.target.value }))}
                placeholder="توصيل لجميع محافظات الكويت — دفع عند الاستلام"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" />
                رقم واتساب التواصل (8 أرقام بدون 965)
              </Label>
              <Input
                dir="ltr"
                value={identity.whatsapp}
                onChange={(e) => setIdentity((p) => ({ ...p, whatsapp: e.target.value }))}
                placeholder="66046358"
              />
              <p className="text-[11px] text-muted-foreground">
                يظهر في الفوتر وزر الواتساب العائم بكل الصفحات
              </p>
            </div>

            <Button type="submit" disabled={savingIdentity} className="btn-gold border-0">
              {savingIdentity ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ هوية المتجر
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* ============ Shipping ============ */}

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
