'use client';

/**
 * AdminFacebookView — Facebook Pixel / Conversions API settings.
 *
 * Founder pastes the Pixel ID (from Meta Events Manager) and optionally a
 * System-User access token to unlock server-side Conversions API tracking.
 * Includes a live "test event" button that fires ViewContent through both
 * the browser pixel and the CAPI forwarder.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Facebook,
  Loader2,
  Save,
  Send,
  ShieldCheck,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface FBSettings {
  enabled: boolean;
  pixelId: string;
  accessToken: string;
  testEventCode: string;
}

export function AdminFacebookView() {
  const adminToken = useAppStore((s) => s.adminToken);
  const [settings, setSettings] = useState<FBSettings>({
    enabled: false,
    pixelId: '',
    accessToken: '',
    testEventCode: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/facebook', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          setHasToken(!!data.accessToken);
        }
      } catch {
        toast.error('فشل تحميل الإعدادات');
      } finally {
        setLoading(false);
      }
    })();
  }, [adminToken]);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/facebook', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // Clear cached public settings so the storefront picks up changes
        try {
          sessionStorage.removeItem('mahhl_fb_settings');
        } catch {}
        setHasToken(!!data.settings?.accessToken);
        toast.success('تم حفظ إعدادات فيسبوك بنجاح');
      } else {
        toast.error(data.error || 'فشل الحفظ');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setSaving(false);
    }
  }

  async function sendTestEvent() {
    if (!settings.enabled || !settings.pixelId) {
      toast.error('فعّل التتبع وأدخل معرّف البكسل أولاً');
      return;
    }
    setTesting(true);
    try {
      // Save first so the server uses the latest config, then fire
      await save();
      const res = await fetch('/api/track/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'ViewContent',
          eventId: `test_${Date.now()}`,
          eventData: { content_name: 'اختبار من لوحة التحكم', content_type: 'product' },
        }),
      });
      const data = await res.json();
      if (data.forwarded) {
        toast.success('تم إرسال الحدث التجريبي لفيسبوك — راجع تبويب Test Events');
      } else if (data.skipped) {
        toast.info('البكسل يعمل من المتصفح فقط — أضف Access Token لتشغيل التتبع من السيرفر');
      } else {
        toast.error('فشل إرسال الحدث — تحقق من الـ Access Token');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Facebook className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">تتبع فيسبوك</h1>
          <p className="text-sm text-muted-foreground">
            Facebook Pixel + Conversions API — تتبع سلوك الزوار وقياس إعلاناتك
          </p>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {settings.enabled && settings.pixelId ? (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-bold">البكسل</p>
              <p className="text-xs text-muted-foreground">
                {settings.enabled && settings.pixelId ? 'مفعّل ويعمل' : 'غير مفعّل'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {hasToken ? (
              <ShieldCheck className="h-8 w-8 text-green-600" />
            ) : (
              <Info className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-bold">Conversions API</p>
              <p className="text-xs text-muted-foreground">
                {hasToken ? 'تتبع من السيرفر مفعّل' : 'اختياري — يعمل بدون توكن'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Send className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm font-bold">الأحداث المتتبعة</p>
              <p className="text-xs text-muted-foreground">7 أحداث قياسية</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={save}>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">إعدادات البكسل</CardTitle>
            <CardDescription>
              معرّف البكسل تجده في Meta Events Manager ← Data Sources ← اسم البكسل ← Pixel ID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="font-bold">تفعيل التتبع</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  عند التفعيل يبدأ تسجيل الأحداث لكل زوار المتجر
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
                aria-label="تفعيل التتبع"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pixelId">معرّف البكسل (Pixel ID)</Label>
              <Input
                id="pixelId"
                dir="ltr"
                inputMode="numeric"
                placeholder="مثال: 123456789012345"
                value={settings.pixelId}
                onChange={(e) => setSettings((s) => ({ ...s, pixelId: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token — Conversions API (اختياري)</Label>
              <Input
                id="accessToken"
                dir="ltr"
                type="password"
                placeholder="EAAG..."
                value={settings.accessToken}
                onChange={(e) => setSettings((s) => ({ ...s, accessToken: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                يُنشأ من System User في Meta Business Manager بصلاحية ads_management. يخوّل
                السيرفر إرسال الأحداث مباشرة لفيسبوك — أقوى ضد حاصرات الإعلانات، ويطابق
                العملاء برقم الهاتف المشفّر (SHA-256).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testEventCode">Test Event Code (اختياري)</Label>
              <Input
                id="testEventCode"
                dir="ltr"
                placeholder="TEST12345"
                value={settings.testEventCode}
                onChange={(e) => setSettings((s) => ({ ...s, testEventCode: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                يُظهر الأحداث في تبويب "Test Events" بـ Events Manager أثناء التجربة
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
            حفظ الإعدادات
          </Button>
          <Button type="button" variant="outline" onClick={sendTestEvent} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Send className="h-4 w-4 ml-2" />}
            إرسال حدث تجريبي
          </Button>
        </div>
      </form>

      {/* Tracked events reference */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">الأحداث المتتبعة تلقائياً</CardTitle>
          <CardDescription>كل حدث يُرسل من المتصفح ومن السيرفر معاً بدون تكرار</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {[
              ['PageView', 'زيارة أي صفحة في المتجر'],
              ['ViewContent', 'مشاهدة صفحة منتج (مع الاسم والسعر)'],
              ['AddToCart', 'إضافة منتج للسلة'],
              ['InitiateCheckout', 'بدء إتمام الطلب (مع محتويات السلة)'],
              ['Purchase', 'إتمام الشراء (مع قيمة الطلب ورقم الهاتف المشفّر)'],
              ['Search', 'البحث عن منتج'],
            ].map(([ev, desc]) => (
              <li key={ev} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded" dir="ltr">
                    {ev}
                  </code>
                  <span className="text-muted-foreground mr-2">{desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
