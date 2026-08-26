'use client';

/**
 * AdminSliderView — founder control room for the homepage hero slider.
 *
 *  - full CRUD + reorder + activate/deactivate (real-time preview per slide)
 *  - autoplay speed + auto landing-promo slides toggle
 *  - AI: single-slide copy from a product, or a whole DYNAMIC product slider
 *  - save = one atomic PUT; reset = curated defaults with real photos
 */

import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { SliderSlide } from '@/lib/slider-types';
import { SlideEditor, type CategoryOption, type LandingOption } from './slider/slide-editor';
import { SlidePreview } from './slider/slide-preview';
import {
  Save,
  RotateCcw,
  Wand2,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Plus,
  ChevronDown as Expand,
  Loader2,
  Images,
  Replace,
} from 'lucide-react';

const MAX_SLIDES = 8;

type Msg = { type: 'ok' | 'err'; text: string } | null;

export function AdminSliderView() {
  const adminToken = useAppStore((s) => s.adminToken);

  const [slides, setSlides] = useState<SliderSlide[]>([]);
  const [autoplayMs, setAutoplayMs] = useState(5200);
  const [appendPromos, setAppendPromos] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [landings, setLandings] = useState<LandingOption[]>([]);

  // AI auto state
  const [autoCount, setAutoCount] = useState(4);
  const [autoStrategy, setAutoStrategy] = useState<'bestsellers' | 'discounted' | 'newest' | 'mixed'>('mixed');
  const [autoCategory, setAutoCategory] = useState('');
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoPreview, setAutoPreview] = useState<SliderSlide[] | null>(null);

  const notify = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4500);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [slRes, catRes, landRes] = await Promise.all([
          fetch('/api/admin/slider', { headers: { Authorization: `Bearer ${adminToken}` } }),
          fetch('/api/categories'),
          fetch('/api/landing'),
        ]);
        if (slRes.ok) {
          const d = await slRes.json();
          setSlides(Array.isArray(d.slides) ? d.slides : []);
          setAutoplayMs(Number(d.autoplayMs) || 5200);
          setAppendPromos(d.appendLandingPromos !== false);
        }
        if (catRes.ok) setCategories(await catRes.json());
        if (landRes.ok) {
          const l = await landRes.json();
          setLandings(Array.isArray(l) ? l : []);
        }
      } catch {
        notify('err', 'تعذّر تحميل إعدادات السلايدر');
      } finally {
        setLoading(false);
      }
    })();
  }, [adminToken, notify]);

  // ===== slide ops =====
  const touch = (next: SliderSlide[]) => {
    setSlides(next);
    setDirty(true);
  };

  const update = (id: string, patch: Partial<SliderSlide>) =>
    touch(slides.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    touch(next);
  };

  const duplicate = (i: number) => {
    if (slides.length >= MAX_SLIDES) return notify('err', `الحد الأقصى ${MAX_SLIDES} شرائح`);
    const copy = { ...slides[i], id: `s_${Date.now().toString(36)}` };
    const next = [...slides];
    next.splice(i + 1, 0, copy);
    touch(next);
  };

  const remove = (id: string) => touch(slides.filter((s) => s.id !== id));

  const addSlide = () => {
    if (slides.length >= MAX_SLIDES) return notify('err', `الحد الأقصى ${MAX_SLIDES} شرائح`);
    const s: SliderSlide = {
      id: `s_${Date.now().toString(36)}`,
      eyebrow: '✨ جديد محل شوب',
      title: 'عنوان الشريحة',
      highlight: 'كلمة مميزة',
      subtitle: 'وصف قصير وواضح يشرح العرض أو القسم.',
      tone: 'dark',
      chips: ['دفع عند الاستلام', 'توصيل 1 د.ك'],
      cta: { label: 'تسوق الآن', action: 'shop' },
      active: true,
    };
    touch([...slides, s]);
    setOpenId(s.id);
  };

  // ===== AI dynamic slider =====
  const runAuto = async () => {
    setAutoBusy(true);
    setAutoPreview(null);
    try {
      const res = await fetch('/api/admin/slider/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          count: autoCount,
          strategy: autoStrategy,
          categoryId: autoCategory || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل التوليد');
      setAutoPreview(data.slides);
      notify('ok', `جهزنا ${data.slides.length} شرائح بالذكاء الاصطناعي (${data.provider}) — راجعها ثم احفظ`);
    } catch (e) {
      notify('err', e instanceof Error ? e.message : 'فشل توليد السلايدر الديناميكي');
    } finally {
      setAutoBusy(false);
    }
  };

  const applyAuto = (mode: 'replace' | 'append') => {
    if (!autoPreview) return;
    if (mode === 'append' && slides.length + autoPreview.length > MAX_SLIDES) {
      return notify('err', `لا يمكن الإضافة — الحد ${MAX_SLIDES} شرائح (عندك ${slides.length})`);
    }
    touch(mode === 'replace' ? autoPreview : [...slides, ...autoPreview]);
    setAutoPreview(null);
    notify('ok', mode === 'replace' ? 'استُبدل السلايدر — اضغط حفظ للنشر' : 'أُضيفت الشرائح — اضغط حفظ للنشر');
  };

  // ===== save / reset =====
  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/slider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ slides, autoplayMs, appendLandingPromos: appendPromos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
      setSlides(data.slides);
      setDirty(false);
      notify('ok', 'تم حفظ السلايدر ونشره للزوار ✅');
    } catch (e) {
      notify('err', e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm('استعادة السلايدر الافتراضي (بالصور الحقيقية)؟ سيُلغى أي تعديل غير محفوظ.')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/slider', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      setSlides(data.slides || []);
      setAutoplayMs(data.autoplayMs || 5200);
      setAppendPromos(data.appendLandingPromos !== false);
      setDirty(false);
      setAutoPreview(null);
      notify('ok', 'أُعيد السلايدر الافتراضي');
    } catch {
      notify('err', 'فشل الاستعادة');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin ml-2" /> جاري تحميل السلايدر…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* ===== header ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Images className="h-6 w-6 text-primary" /> سلايدر الصفحة الرئيسية
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            صور حقيقية + نصوص بالذكاء الاصطناعي — تتحكم بكل شريحة وتعاينها قبل النشر.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={reset} disabled={saving}>
            <RotateCcw className="h-4 w-4" /> استعادة الافتراضي
          </Button>
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {dirty ? 'حفظ ونشر' : 'محفوظ'}
          </Button>
        </div>
      </div>

      {msg && (
        <div
          className={`rounded-lg border p-3 text-sm font-semibold ${
            msg.type === 'ok'
              ? 'border-green-300 bg-green-50 text-green-800'
              : 'border-red-300 bg-red-50 text-red-800'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* ===== global controls ===== */}
      <div className="rounded-xl border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-bold">سرعة تنقّل الشرائح: {(autoplayMs / 1000).toFixed(1)} ثانية</Label>
          <input
            type="range"
            min={3000}
            max={12000}
            step={500}
            value={autoplayMs}
            onChange={(e) => {
              setAutoplayMs(Number(e.target.value));
              setDirty(true);
            }}
            className="w-full mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">3–12 ثانية (موصى به 5 ثوانٍ)</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-bold">شرائح صفحات الهبوط تلقائياً</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              إضافة آخر صفحتَي هبوط مفعّلتين بعد شرائحك (إن وُجدت)
            </p>
          </div>
          <Switch
            checked={appendPromos}
            onCheckedChange={(v) => {
              setAppendPromos(v);
              setDirty(true);
            }}
          />
        </div>
      </div>

      {/* ===== AI dynamic slider ===== */}
      <div className="rounded-xl border-2 border-primary/30 bg-primary/[0.03] p-4 space-y-3">
        <p className="font-extrabold flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" /> سلايدر ديناميكي للمنتجات بالذكاء الاصطناعي
        </p>
        <p className="text-xs text-muted-foreground">
          يختار الذكاء الاصطناعي أفضل المنتجات المتوفرة (صور حقيقية من الكتالوج) ويكتب لكل منتج نصاً إعلانياً مختلف الأسلوب، ويربط كل شريحة بصفحة منتجها — مثل أمازون.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div>
            <Label className="text-xs">عدد الشرائح</Label>
            <select
              value={autoCount}
              onChange={(e) => setAutoCount(Number(e.target.value))}
              className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm"
            >
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">الاستراتيجية</Label>
            <select
              value={autoStrategy}
              onChange={(e) => setAutoStrategy(e.target.value as typeof autoStrategy)}
              className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="mixed">مزيج ذكي</option>
              <option value="bestsellers">الأكثر مبيعاً</option>
              <option value="discounted">أكبر الخصومات</option>
              <option value="newest">أحدث المنتجات</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">قسم محدد (اختياري)</Label>
            <select
              value={autoCategory}
              onChange={(e) => setAutoCategory(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">كل الأقسام</option>
              {categories
                .filter((c) => !c.isSub)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={runAuto} disabled={autoBusy} className="w-full">
              {autoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              أنشئ السلايدر
            </Button>
          </div>
        </div>

        {autoPreview && (
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-bold">معاينة — راجع ثم اختر:</p>
            <div className="grid grid-cols-1 gap-3">
              {autoPreview.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <SlidePreview slide={s} />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => {
                      const rest = autoPreview.filter((x) => x.id !== s.id);
                      setAutoPreview(rest.length ? rest : null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => applyAuto('replace')} disabled={!autoPreview.length}>
                <Replace className="h-4 w-4" /> استبدال السلايدر كاملاً
              </Button>
              <Button variant="secondary" onClick={() => applyAuto('append')} disabled={!autoPreview.length}>
                <Plus className="h-4 w-4" /> إضافة للسلايدر الحالي
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ===== slides list ===== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">
            الشرائح ({slides.length}/{MAX_SLIDES})
          </h2>
          <Button onClick={addSlide} disabled={slides.length >= MAX_SLIDES} size="sm">
            <Plus className="h-4 w-4" /> شريحة جديدة
          </Button>
        </div>

        {slides.map((s, i) => {
          const open = openId === s.id;
          return (
            <div key={s.id} className={`rounded-xl border bg-card overflow-hidden ${open ? 'ring-2 ring-primary/40' : ''}`}>
              <div className="flex items-center gap-2 p-2.5">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="أعلى">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === slides.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="أسفل">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <button onClick={() => setOpenId(open ? null : s.id)} className="flex-1 min-w-0 text-right">
                  <SlidePreview slide={s} />
                </button>
                <div className="flex flex-col gap-1">
                  <button onClick={() => duplicate(i)} className="text-muted-foreground hover:text-foreground" aria-label="تكرار">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive" aria-label="حذف">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setOpenId(open ? null : s.id)} className="text-muted-foreground hover:text-foreground" aria-label="فتح">
                    <Expand className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {open && (
                <div className="border-t p-4 bg-background/60">
                  <SlideEditor
                    slide={s}
                    categories={categories}
                    landings={landings}
                    adminToken={adminToken}
                    onChange={(patch) => update(s.id, patch)}
                    onNotify={notify}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
