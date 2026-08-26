'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatKwd, formatNumber } from '@/lib/utils/format';
import {
  Sparkles,
  Users,
  Eye,
  ShoppingCart,
  TrendingUp,
  Brain,
  RefreshCw,
  KeyRound,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Insights {
  range: string;
  kpis: {
    sessions: number;
    events: number;
    addToCart: number;
    checkoutStart: number;
    checkoutComplete: number;
    cartRate: number;
    checkoutRate: number;
    avgIntent: number;
  };
  upsellFunnel: {
    shown: number;
    clicked: number;
    added: number;
    clickRate: number;
    addRate: number;
  };
  topViewed: any[];
  personas: Record<string, number>;
  budgets: Record<string, number>;
}

const PERSONA_LABELS: Record<string, string> = {
  new_visitor: 'زائر جديد',
  browser: 'متصفّح عادي',
  explorer: 'مستكشف',
  bargain_hunter: 'صائد التخفيضات',
  cart_builder: 'يبني سلة',
  high_intent: 'نية شراء عالية',
  returning_buyer: 'مشترٍ سابق',
  unknown: 'غير مصنّف',
};

const BUDGET_LABELS: Record<string, string> = {
  low: 'محدود',
  mid: 'متوسط',
  high: 'مرتفع',
  premium: 'بريميوم',
};

export function AdminInsightsView() {
  const adminToken = useAppStore((s) => s.adminToken);
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  // DeepSeek settings state
  const [dsSettings, setDsSettings] = useState({
    enabled: false,
    apiKey: '',
    model: 'deepseek-chat',
  });
  const [dsLoading, setDsLoading] = useState(true);
  const [dsSaving, setDsSaving] = useState(false);
  const [dsTesting, setDsTesting] = useState(false);
  const [dsTestResult, setDsTestResult] = useState<
    { ok: boolean; message: string } | null
  >(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/insights', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const d = await res.json();
      if (res.ok) setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load DeepSeek settings
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/ai-settings', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.ok) {
          const s = await res.json();
          setDsSettings({
            enabled: !!s.enabled,
            apiKey: s.apiKey || '',
            model: s.model || 'deepseek-chat',
          });
        }
      } catch {
        /* ignore */
      } finally {
        setDsLoading(false);
      }
    })();
  }, [adminToken]);

  async function saveDeepSeek(e?: React.FormEvent) {
    e?.preventDefault();
    setDsSaving(true);
    setDsTestResult(null);
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(dsSettings),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        toast.success('تم حفظ إعدادات DeepSeek');
      } else {
        toast.error('فشل الحفظ');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setDsSaving(false);
    }
  }

  async function testDeepSeek() {
    setDsTesting(true);
    setDsTestResult(null);
    try {
      // save first so the test uses the latest key
      await saveDeepSeek();
      const res = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const d = await res.json();
      if (d.ok) {
        setDsTestResult({ ok: true, message: 'المفتاح يعمل بنجاح ✅' });
      } else {
        setDsTestResult({
          ok: false,
          message:
            d.error === 'not-configured'
              ? 'أدخل المفتاح وفعّله أولاً'
              : `فشل: ${d.error}`,
        });
      }
    } catch {
      setDsTestResult({ ok: false, message: 'فشل الاتصال' });
    } finally {
      setDsTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">لا توجد بيانات متاحة</p>
        <Button onClick={load} className="mt-3">
          <RefreshCw className="h-4 w-4 ml-2" /> إعادة التحميل
        </Button>
      </div>
    );
  }

  const k = data.kpis;
  const u = data.upsellFunnel;
  const totalSessions = k.sessions || 1;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            محرك الذكاء — رؤى السلوك
          </h1>
          <p className="text-sm text-muted-foreground">
            آخر 7 أيام — تحليل مباشر لسلوك الزوار وأداء الـ upsell
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 ml-2" />
          تحديث
        </Button>
      </div>

      {/* DeepSeek API settings card */}
      <Card className="border-accent/30 bg-gradient-to-l from-accent/5 to-transparent">
        <form onSubmit={saveDeepSeek} className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl btn-gold">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-base flex items-center gap-2">
                  مفتاح DeepSeek المدفوع
                  {dsSettings.enabled && dsSettings.apiKey ? (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3" /> مفعّل
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      <XCircle className="h-3 w-3" /> غير مفعّل — يعمل بالنظام المدمج
                    </span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  يُستخدم لتحسين اقتراحات الـ upsell وإنشاء صفحات الهبوط بالذكاء الاصطناعي
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={dsSettings.enabled}
                onCheckedChange={(v) => setDsSettings((s) => ({ ...s, enabled: v }))}
                aria-label="تفعيل DeepSeek"
                disabled={dsLoading}
              />
              <span className="text-xs text-muted-foreground">تفعيل</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="ds-api-key" className="text-xs">
                API Key — من platform.deepseek.com
              </Label>
              <Input
                id="ds-api-key"
                dir="ltr"
                type="password"
                placeholder="sk-..."
                value={dsSettings.apiKey}
                onChange={(e) => setDsSettings((s) => ({ ...s, apiKey: e.target.value }))}
                disabled={dsLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الموديل</Label>
              <Select
                value={dsSettings.model}
                onValueChange={(v) => setDsSettings((s) => ({ ...s, model: v }))}
                disabled={dsLoading}
              >
                <SelectTrigger dir="ltr">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepseek-chat">deepseek-chat</SelectItem>
                  <SelectItem value="deepseek-reasoner">deepseek-reasoner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={dsSaving || dsLoading}>
              {dsSaving ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ المفتاح
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={testDeepSeek}
              disabled={dsTesting || dsLoading || !dsSettings.apiKey}
            >
              {dsTesting ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 ml-2" />
              )}
              اختبار المفتاح
            </Button>
            {dsTestResult && (
              <span
                className={`text-xs font-medium ${
                  dsTestResult.ok ? 'text-green-600' : 'text-destructive'
                }`}
              >
                {dsTestResult.message}
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InsightCard
          icon={<Users className="h-5 w-5" />}
          label="الجلسات النشطة"
          value={formatNumber(k.sessions)}
          sub={`${(k.avgIntent * 100).toFixed(0)}% نيّة شراء`}
          color="bg-blue-50 text-blue-700"
        />
        <InsightCard
          icon={<Eye className="h-5 w-5" />}
          label="الإجراءات (Events)"
          value={formatNumber(k.events)}
          sub={`${(k.events / totalSessions).toFixed(1)} حدث/جلسة`}
          color="bg-cyan-50 text-cyan-700"
        />
        <InsightCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label="أضيف للسلة"
          value={formatNumber(k.addToCart)}
          sub={`${k.cartRate}% من الجلسات`}
          color="bg-amber-50 text-amber-700"
        />
        <InsightCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="طلبات مكتملة"
          value={formatNumber(k.checkoutComplete)}
          sub={`${k.checkoutRate}% تحويل`}
          color="bg-emerald-50 text-emerald-700"
        />
      </div>

      {/* Funnel */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-bold">قمع الـ AI Upsell</h2>
        </div>
        <div className="space-y-4">
          <FunnelRow label="عُرضت التوصيات" value={u.shown} max={u.shown || 1} color="bg-blue-500" />
          <FunnelRow
            label="نُقرت للتوسيع"
            value={u.clicked}
            max={u.shown || 1}
            color="bg-amber-500"
            rateLabel={`${u.clickRate}% نقر`}
          />
          <FunnelRow
            label="أُضيفت للسلة"
            value={u.added}
            max={u.shown || 1}
            color="bg-emerald-500"
            rateLabel={`${u.addRate}% من الناقرين`}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          معدّل التحويل من النقر للإضافة = مدى فعالية الأسباب التي ينشئها المحرك.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top viewed */}
        <Card className="p-5">
          <h2 className="font-bold mb-3">الأكثر مشاهدة (7 أيام)</h2>
          {data.topViewed.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد بيانات بعد</p>
          ) : (
            <div className="space-y-2">
              {data.topViewed.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted/30 rounded-md overflow-hidden flex-shrink-0">
                    {p.thumb && <img src={p.thumb} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.views} مشاهدة • {formatKwd(p.salePrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Personas */}
        <Card className="p-5">
          <h2 className="font-bold mb-3">شخصنة الزوار</h2>
          <div className="space-y-2">
            {Object.entries(data.personas).map(([key, n]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{PERSONA_LABELS[key] || key}</span>
                  <span className="text-muted-foreground">{n}</span>
                </div>
                <Progress value={(n / totalSessions) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Budget tiers */}
      <Card className="p-5">
        <h2 className="font-bold mb-3">توزيع الفئة السعرية</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(data.budgets).map(([k, n]) => (
            <div
              key={k}
              className="border rounded-lg p-3 text-center bg-gradient-to-b from-primary/5 to-transparent"
            >
              <p className="text-xs text-muted-foreground">{BUDGET_LABELS[k] || k}</p>
              <p className="text-xl font-bold mt-1">{n}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function InsightCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-xl md:text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function FunnelRow({
  label,
  value,
  max,
  color,
  rateLabel,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  rateLabel?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-bold">
          {value} {rateLabel && <span className="text-xs text-muted-foreground font-normal">({rateLabel})</span>}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
