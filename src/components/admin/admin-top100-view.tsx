'use client';

/**
 * Top-100 Kuwait demand products — AI copy desk for the founder.
 * Lists the 100 highest-demand products (demandRank) and lets the founder
 * regenerate their AR+EN copy (name/description/meta) with the DeepSeek
 * THINKING model, preview the diff, edit it, then apply — wired to the
 * same AI settings (key + model) from «محرك الذكاء».
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { toast } from 'sonner';
import {
  Trophy, Search, Sparkles, Loader2, Check, X, RefreshCcw, Languages,
  AlertTriangle, ExternalLink, Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function useAdminAuth() {
  const adminToken = useAppStore((s) => s.adminToken);
  return { Authorization: `Bearer ${adminToken || ''}` };
}

interface TopProduct {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  description: string;
  descriptionEn: string | null;
  metaDescription: string | null;
  price: number;
  salePrice: number;
  quantity: number;
  thumb: string | null;
  demandRank: number | null;
  soldCount: number;
  categoryName: string | null;
  hasEn: boolean;
  descLen: number;
}

interface Suggestion {
  name: string;
  description: string;
  nameEn: string;
  descriptionEn: string;
  metaDescription: string;
  reasoning: string;
}

const MODELS = [
  { id: 'deepseek-reasoner', label: 'DeepSeek v4 Thinking (reasoner) — تفكير عميق' },
  { id: 'deepseek-chat', label: 'DeepSeek Chat — سريع' },
];

export function AdminTop100View() {
  const auth = useAdminAuth();
  const openProduct = useAppStore((s) => s.openProduct);
  const setView = useAppStore((s) => s.setView);
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [stats, setStats] = useState({ total: 0, withEn: 0, thinDesc: 0, outOfStock: 0 });
  const [ai, setAi] = useState({ enabled: false, model: 'deepseek-chat', hasKey: false });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [model, setModel] = useState('deepseek-reasoner');

  /** product currently being AI-improved */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [current, setCurrent] = useState<TopProduct | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/top100', { headers: auth });
      if (r.ok) {
        const d = await r.json();
        setProducts(d.products || []);
        setStats(d.stats || { total: 0, withEn: 0, thinDesc: 0, outOfStock: 0 });
        setAi(d.ai || { enabled: false, model: 'deepseek-chat', hasKey: false });
      } else {
        toast.error('فشل تحميل قائمة الأكثر طلباً');
      }
    } catch {
      toast.error('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return products;
    return products.filter(
      (p) => p.name.includes(q) || (p.nameEn || '').toLowerCase().includes(q.toLowerCase())
    );
  }, [products, search]);

  async function generate(p: TopProduct) {
    setActiveId(p.id);
    setCurrent(p);
    setBusy(true);
    setSuggestion(null);
    try {
      const r = await fetch('/api/admin/top100', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id, model }),
      });
      const d = await r.json();
      if (r.ok && d.suggestion) {
        setSuggestion(d.suggestion);
      } else {
        toast.error(d.error || 'فشل توليد النص');
        setActiveId(null);
      }
    } catch {
      toast.error('تعذر الاتصال — جرّب مرة ثانية');
      setActiveId(null);
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!suggestion || !activeId) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/products/${activeId}`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: suggestion.name,
          description: suggestion.description,
          nameEn: suggestion.nameEn || undefined,
          descriptionEn: suggestion.descriptionEn || undefined,
          metaDescription: suggestion.metaDescription || undefined,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success('تم تطبيق النص الجديد ونشره في المتجر ✅');
        setActiveId(null);
        setSuggestion(null);
        load();
      } else {
        toast.error(d.error || 'فشل الحفظ');
      }
    } catch {
      toast.error('تعذر الحفظ — جرّب مرة ثانية');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-gold-deep" />
            الأكثر طلباً في الكويت — Top 100
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مقصدك لتحسين نصوص أفضل 100 منتج بالذكاء الاصطناعي — الاسم، الوصف، والترجمة الإنجليزية بنموذج التفكير العميق
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* stats + AI status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border rounded-xl bg-card p-3">
          <p className="text-xs text-muted-foreground">إجمالي القائمة</p>
          <p className="text-2xl font-extrabold">{stats.total}</p>
        </div>
        <div className="border rounded-xl bg-card p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Languages className="h-3 w-3" /> مترجم للإنجليزية
          </p>
          <p className="text-2xl font-extrabold text-emerald-600">{stats.withEn}</p>
        </div>
        <div className="border rounded-xl bg-card p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> وصف ضعيف
          </p>
          <p className="text-2xl font-extrabold text-amber-600">{stats.thinDesc}</p>
        </div>
        <div className="border rounded-xl bg-card p-3">
          <p className="text-xs text-muted-foreground">نفد المخزون</p>
          <p className="text-2xl font-extrabold text-red-600">{stats.outOfStock}</p>
        </div>
      </div>

      {/* AI settings banner */}
      <div className="border rounded-xl bg-card p-4 flex flex-wrap items-center gap-3">
        <Brain className={`h-5 w-5 ${ai.enabled ? 'text-emerald-600' : 'text-muted-foreground'}`} />
        <div className="flex-1 min-w-48">
          <p className="text-sm font-bold">
            محرك الذكاء: {ai.enabled ? (
              <span className="text-emerald-600">متصل ✅</span>
            ) : (
              <span className="text-red-600">غير مفعّل</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            الموديل المحفوظ في الإعدادات: <span dir="ltr">{ai.model}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">موديل التوليد لهذه الصفحة:</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            dir="ltr"
            className="text-xs border rounded-lg px-2 py-1.5 bg-background"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.id} — {m.label.split('—')[1]?.trim() || m.label}</option>
            ))}
            <option value={ai.model}>الموديل المحفوظ ({ai.model})</option>
          </select>
        </div>
        {!ai.enabled && (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-1.5">
            فعّل مفتاح DeepSeek من صفحة «محرك الذكاء» لاستخدام التوليد الذكي
          </p>
        )}
      </div>

      {/* search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم العربي أو الإنجليزي..."
          className="pr-10"
        />
      </div>

      {/* product list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">لا توجد نتائج مطابقة</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const isActive = activeId === p.id;
            return (
              <div key={p.id} className="border rounded-xl bg-card overflow-hidden">
                <div className="p-3 flex flex-wrap items-center gap-3">
                  {/* rank */}
                  <span
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm ${
                      p.demandRank === 1
                        ? 'bg-amber-400 text-amber-950'
                        : p.demandRank === 2
                          ? 'bg-slate-300 text-slate-800'
                          : p.demandRank === 3
                            ? 'bg-amber-700 text-amber-100'
                            : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    #{p.demandRank}
                  </span>
                  {/* thumb */}
                  <div className="h-12 w-12 rounded-lg bg-white border overflow-hidden flex-shrink-0">
                    {p.thumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.thumb} alt={p.name} className="h-full w-full object-contain p-0.5" />
                    ) : null}
                  </div>
                  {/* info */}
                  <div className="flex-1 min-w-52">
                    <p className="font-bold text-sm line-clamp-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {p.nameEn || <span className="text-amber-600">بدون ترجمة إنجليزية</span>}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-[10px] bg-muted rounded-full px-2 py-0.5">{p.categoryName}</span>
                      <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-bold">
                        {(p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price).toFixed(2)} د.ك
                      </span>
                      <span className="text-[10px] bg-muted rounded-full px-2 py-0.5">مبيع: {p.soldCount}</span>
                      {p.quantity <= 0 ? (
                        <span className="text-[10px] bg-red-100 text-red-700 rounded-full px-2 py-0.5">نفد</span>
                      ) : p.quantity <= 5 ? (
                        <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">آخر {p.quantity}</span>
                      ) : null}
                      {p.descLen < 60 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">وصف ضعيف</span>
                      )}
                    </div>
                  </div>
                  {/* actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => generate(p)}
                      disabled={busy || !ai.enabled}
                      title={ai.enabled ? 'توليد نص محسّن بالذكاء الاصطناعي' : 'فعّل محرك الذكاء أولاً'}
                    >
                      {busy && isActive ? (
                        <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 ml-1" />
                      )}
                      تحسين AI
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setView('home');
                        openProduct(p.slug);
                      }}
                      title="فتح في المتجر"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* AI suggestion panel */}
                {isActive && (busy || suggestion) && (
                  <div className="border-t bg-muted/30 p-4 space-y-4">
                    {busy && !suggestion && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        نموذج التفكير يحلل المنتج ويكتب النص المحسّن... (قد يستغرق حتى دقيقة)
                      </div>
                    )}
                    {suggestion && (
                      <>
                        <div className="flex items-start gap-2 text-xs bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <Brain className="h-4 w-4 text-primary mt-0.5" />
                          <p><b>سبب التحسين:</b> {suggestion.reasoning}</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <Field
                            label={`الاسم العربي (${suggestion.name.length} حرف)`}
                            value={suggestion.name}
                            onChange={(v) => setSuggestion((s) => (s ? { ...s, name: v } : s))}
                            old={current?.name}
                          />
                          <Field
                            label={`الاسم الإنجليزي (${suggestion.nameEn.length} حرف)`}
                            value={suggestion.nameEn}
                            onChange={(v) => setSuggestion((s) => (s ? { ...s, nameEn: v } : s))}
                            old={current?.nameEn || ''}
                            ltr
                          />
                          <Field
                            label={`الوصف العربي (${suggestion.description.length} حرف)`}
                            value={suggestion.description}
                            onChange={(v) => setSuggestion((s) => (s ? { ...s, description: v } : s))}
                            old={current?.description || ''}
                            textarea
                          />
                          <Field
                            label={`الوصف الإنجليزي (${suggestion.descriptionEn.length} حرف)`}
                            value={suggestion.descriptionEn}
                            onChange={(v) => setSuggestion((s) => (s ? { ...s, descriptionEn: v } : s))}
                            old={current?.descriptionEn || ''}
                            textarea
                            ltr
                          />
                          <Field
                            label={`Meta Description (${suggestion.metaDescription.length} حرف)`}
                            value={suggestion.metaDescription}
                            onChange={(v) => setSuggestion((s) => (s ? { ...s, metaDescription: v } : s))}
                            old={current?.metaDescription || ''}
                            textarea
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={apply} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Check className="h-4 w-4 ml-1" />}
                            تطبيق ونشر
                          </Button>
                          <Button variant="outline" onClick={() => current && generate(current)} disabled={busy}>
                            <RefreshCcw className="h-4 w-4 ml-1" />
                            إعادة توليد
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setActiveId(null);
                              setSuggestion(null);
                            }}
                          >
                            <X className="h-4 w-4 ml-1" />
                            إلغاء
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  old,
  textarea,
  ltr,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  old?: string;
  textarea?: boolean;
  ltr?: boolean;
}) {
  const changed = (old || '') !== value;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-muted-foreground">{label}</label>
        {changed && <span className="text-[10px] text-emerald-600 font-bold">معدّل عن الأصل ✓</span>}
      </div>
      {textarea ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir={ltr ? 'ltr' : 'rtl'}
          rows={6}
          className="text-sm bg-background"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir={ltr ? 'ltr' : 'rtl'}
          className="text-sm bg-background"
        />
      )}
      {old ? (
        <details className="text-[11px] text-muted-foreground">
          <summary className="cursor-pointer">النص الحالي</summary>
          <p className="mt-1 whitespace-pre-line p-2 border rounded bg-background max-h-32 overflow-y-auto">{old}</p>
        </details>
      ) : null}
    </div>
  );
}
