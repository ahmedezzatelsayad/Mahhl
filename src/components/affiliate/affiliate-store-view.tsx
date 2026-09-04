'use client';

/**
 * affiliate-store-view — «متجري المجاني» (الميزة القاتلة).
 * المسوّق يفتح متجره الخاص: اسم + لوجو + لون + هامش تسعير + دومين،
 * يضيف منتجات من كتالوج المنصة بنقرة واحدة، ويشارك رابط متجره.
 * الزوار يطلبون من متجره والطلبات تدخل عمولاته تلقائياً.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check, Copy, ExternalLink, Plus, Search, Store, Trash2, Globe } from 'lucide-react';

interface MyStore {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string;
  whatsapp: string | null;
  customDomain: string | null;
  defaultMarkup: number;
  thankYouNote: string | null;
  isActive: boolean;
}

interface MyProduct {
  id: string;
  productId: string;
  name: string;
  thumb: string | null;
  category: string | null;
  isBestSeller: boolean;
  stock: number;
  platformPrice: number;
  storePrice: number;
  myProfit: number;
  customPrice: number | null;
  isActive: boolean;
}

interface CatalogItem {
  id: string;
  name: string;
  thumb: string | null;
  price: number;
  salePrice: number;
  commission: number;
  isBestSeller?: boolean;
  category?: { name?: string | null } | null;
}

const COLORS = ['#B45309', '#047857', '#1D4ED8', '#7C3AED', '#DC2626', '#0F766E', '#C2410C', '#111827'];
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mahhl-qzjn.vercel.app').replace(/\/+$/, '');
const fmt = (n: number) => `${Number(n).toFixed(3)} د.ك`;

export function AffiliateStoreView() {
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const auth = useMemo(() => ({ headers: { Authorization: `Bearer ${affiliateToken || ''}` } }), [affiliateToken]);

  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<MyStore | null>(null);
  const [products, setProducts] = useState<MyProduct[]>([]);

  // نموذج الإنشاء/الإعدادات
  const [form, setForm] = useState({ name: '', slug: '', tagline: '', logoUrl: '', primaryColor: '#B45309', whatsapp: '', defaultMarkup: 2, customDomain: '', thankYouNote: '' });
  const [savingStore, setSavingStore] = useState(false);
  const [editing, setEditing] = useState(false);

  // متصفح الكتالوج لإضافة المنتجات
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/storefront/me', auth);
      const data = await res.json();
      if (data.storefront) {
        setStore(data.storefront);
        setProducts(data.products || []);
        setForm({
          name: data.storefront.name || '',
          slug: data.storefront.slug || '',
          tagline: data.storefront.tagline || '',
          logoUrl: data.storefront.logoUrl || '',
          primaryColor: data.storefront.primaryColor || '#B45309',
          whatsapp: data.storefront.whatsapp || '',
          defaultMarkup: data.storefront.defaultMarkup ?? 2,
          customDomain: data.storefront.customDomain || '',
          thankYouNote: data.storefront.thankYouNote || '',
        });
        setEditing(false);
      } else {
        setStore(null);
      }
    } catch {
      toast.error('ما قدرت أجيب بيانات متجرك');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    // defer one tick — avoids sync setState inside effect (cascading renders)
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  // بحث الكتالوج (debounced)
  useEffect(() => {
    if (!store) return;
    if (!q.trim()) {
      // deferred — avoids sync setState inside effect
      const c = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(c);
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(q.trim())}&limit=12`, auth);
        const data = await res.json();
        setResults(data.items || []);
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, store, auth]);

  async function createStore() {
    setSavingStore(true);
    try {
      const res = await fetch('/api/storefront/me', {
        method: 'POST',
        headers: { ...auth.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, isActive: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'صار خطأ');
      toast.success('🎉 متجرك جاهز! أضف منتجاتك وشارك رابط متجرك');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingStore(false);
    }
  }

  async function saveStore() {
    setSavingStore(true);
    try {
      const res = await fetch('/api/storefront/me', {
        method: 'POST',
        headers: { ...auth.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'صار خطأ');
      toast.success('انحفظت إعدادات متجرك ✅');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingStore(false);
    }
  }

  async function addProduct(productId: string) {
    setAdding(productId);
    try {
      const res = await fetch('/api/storefront/me/products', {
        method: 'POST',
        headers: { ...auth.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'صار خطأ');
      toast.success('انضاف المنتج لمتجرك بنقرة واحدة ✅');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAdding(null);
    }
  }

  async function patchProduct(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch('/api/storefront/me/products', {
        method: 'PATCH',
        headers: { ...auth.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'صار خطأ');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function removeProduct(id: string) {
    try {
      const res = await fetch(`/api/storefront/me/products?id=${id}`, { method: 'DELETE', ...auth });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'صار خطأ');
      toast.success('انشال المنتج من متجرك');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const storeLink = store ? `${SITE}/store/${store.slug}` : '';

  if (loading) {
    return <div className="p-10 text-center text-muted-foreground text-sm">جاري تحميل متجرك…</div>;
  }

  // ============ لا يوجد متجر بعد → شاشة الافتتاح ============
  if (!store) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="rounded-2xl border bg-gradient-to-l from-amber-50 to-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <Store className="h-8 w-8 text-amber-600" />
            <h2 className="text-2xl font-extrabold">افتح متجرك المجاني 🏪</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-7">
            متجر بإسمك، لوجوك، وألوانك — مربوط مباشرة بمنتجات المنصة (أكثر من 2,600 منتج).
            اختر هامش ربحك على كل منتج، شارك رابط متجرك، وزبائنك يطلبون أونلاين بالدفع عند الاستلام
            وطلباتهم تدخل محفظتك تلقائياً. بدون رأس مال وبدون هم الشحن.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-extrabold">خطوتين ويكون متجرك جاهز</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">اسم المتجر *</span>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: متجر أحمد للجمال" className="mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">معرف الرابط (إنجليزي) *</span>
              <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="ahmed-store" dir="ltr" className="mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm" />
              <span className="text-[11px] text-muted-foreground" dir="ltr">{SITE}/store/{form.slug || '…'}</span>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">جملة تعريفية (اختياري)</span>
              <input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="أفضل منتجات الجمال بأفضل سعر" className="mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">واتساب للزبائن (اختياري)</span>
              <input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="+965…" dir="ltr" className="mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm" />
            </label>
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground">لون هوية متجرك</span>
            <div className="mt-2 flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm((f) => ({ ...f, primaryColor: c }))} className={`h-9 w-9 rounded-full border-2 ${form.primaryColor === c ? 'border-stone-900 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} aria-label={c} />
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-bold text-muted-foreground">هامش الربح الافتراضي (د.ك لكل منتج) — تعدله لاحقاً على كل منتج</span>
            <div className="mt-1 flex items-center gap-3">
              <input type="range" min={0.5} max={10} step={0.5} value={form.defaultMarkup} onChange={(e) => setForm((f) => ({ ...f, defaultMarkup: Number(e.target.value) }))} className="flex-1 accent-amber-600" />
              <span className="font-extrabold text-lg w-24 text-center">{form.defaultMarkup.toFixed(1)} د.ك</span>
            </div>
          </label>
          <Button onClick={createStore} disabled={savingStore || form.name.trim().length < 2 || form.slug.length < 3} className="w-full h-12 text-base font-extrabold">
            {savingStore ? 'جاري الافتتاح…' : 'افتح متجري الآن — مجاناً 🚀'}
          </Button>
        </div>
      </div>
    );
  }

  // ============ المتجر موجود → لوحة الإدارة ============
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* رأس المتجر + الرابط */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0" style={{ backgroundColor: store.primaryColor }}>
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logoUrl} alt={store.name} className="h-14 w-14 rounded-2xl object-cover" />
            ) : (
              store.name.charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-xl font-extrabold">{store.name} {store.isActive ? '' : '(موقوف مؤقتاً)'}</h2>
            <p className="text-xs text-muted-foreground">{products.filter((p) => p.isActive).length} منتج نشط · هامش افتراضي {store.defaultMarkup} د.ك</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <code className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs" dir="ltr">/store/{store.slug}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(storeLink); toast.success('نُسخ رابط متجرك — شاركه في كل مكان 📣'); }}>
                <Copy className="h-3.5 w-3.5" /> نسخ الرابط
              </Button>
              <a href={storeLink} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5" /> شوف متجرك</Button></a>
              {store.whatsapp && (
                <a href={`https://wa.me/?text=${encodeURIComponent(`تسوق من ${store.name} 🛍️\n${storeLink}`)}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-[#25D366] hover:bg-[#1fb457] text-white">شارك على واتساب</Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* إضافة منتجات بنقرة واحدة */}
      <div className="rounded-2xl border bg-white p-5 space-y-3">
        <h3 className="font-extrabold flex items-center gap-2"><Plus className="h-4 w-4 text-amber-600" /> أضف منتجات لمتجرك — بنقرة واحدة</h3>
        <div className="relative">
          <Search className="absolute top-3 start-3 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر في أكثر من 2,600 منتج… (اسم المنتج أو القسم)" className="w-full rounded-xl border px-10 py-2.5 text-sm" />
        </div>
        {searching && <p className="text-xs text-muted-foreground">جاري البحث…</p>}
        {results.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {results.map((r) => {
              const inStore = products.some((p) => p.productId === r.id);
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                  {r.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.thumb} alt={r.name} className="h-12 w-12 rounded-lg object-cover border" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-stone-100 flex items-center justify-center">🛍️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold line-clamp-1">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      سعر منصتي: {fmt(r.salePrice > 0 && r.salePrice < r.price ? r.salePrice : r.price)} · ربحك المتوقع: <span className="font-extrabold text-emerald-600">{fmt(store.defaultMarkup)}</span>
                    </p>
                  </div>
                  <Button size="sm" disabled={inStore || adding === r.id} onClick={() => addProduct(r.id)} className="shrink-0">
                    {inStore ? <><Check className="h-3.5 w-3.5" /> بمتجرك</> : adding === r.id ? '…' : <><Plus className="h-3.5 w-3.5" /> أضف</>}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* منتجات متجري */}
      <div className="rounded-2xl border bg-white p-5 space-y-3">
        <h3 className="font-extrabold">منتجات متجري ({products.length})</h3>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">ما أضفت منتجات بعد — دوّر فوق وأضف أول منتج بنقرة 👆</p>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <ProductRow key={p.id} p={p} markup={store.defaultMarkup} onPatch={patchProduct} onRemove={removeProduct} />
            ))}
          </div>
        )}
      </div>

      {/* الإعدادات + الدومين */}
      <StoreSettings
        form={form}
        setForm={setForm}
        editing={editing}
        setEditing={setEditing}
        saving={savingStore}
        onSave={saveStore}
        store={store}
      />
    </div>
  );
}

/** صف منتج في متجري: تعديل السعر/التفعيل/الحذف */
function ProductRow({
  p, markup, onPatch, onRemove,
}: {
  p: MyProduct;
  markup: number;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
}) {
  const [price, setPrice] = useState(p.customPrice !== null ? String(p.customPrice) : '');
  const effective = p.customPrice !== null ? p.customPrice : p.platformPrice + markup;
  const profit = Math.max(0, Math.round((effective - p.platformPrice) * 1000) / 1000);

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-2.5 ${p.isActive ? '' : 'opacity-50'}`}>
      {p.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.thumb} alt={p.name} className="h-12 w-12 rounded-lg object-cover border" />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-stone-100 flex items-center justify-center">🛍️</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold line-clamp-1">{p.isBestSeller && '🔥 '}{p.name}</p>
        <p className="text-[11px] text-muted-foreground">
          سعر المنصة {fmt(p.platformPrice)} · ربحك <span className="font-extrabold text-emerald-600">{fmt(profit)}</span>
          {p.stock <= 0 && ' · نفذ من المنصة'}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0" dir="ltr">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={fmt(p.platformPrice + markup)}
          className="w-24 rounded-lg border px-2 py-1.5 text-xs text-center"
          inputMode="decimal"
        />
        <Button size="sm" variant="outline" onClick={() => onPatch(p.id, { price: price === '' ? null : Number(price) })}>حفظ</Button>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" onClick={() => onPatch(p.id, { isActive: !p.isActive })} title={p.isActive ? 'إيقاف' : 'تفعيل'}>
          {p.isActive ? '⏸' : '▶️'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { if (confirm(`تشال «${p.name}» من متجرك؟`)) onRemove(p.id); }} title="حذف">
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

/** إعدادات المتجر + بطاقة الدومين */
function StoreSettings({
  form, setForm, editing, setEditing, saving, onSave, store,
}: {
  form: { name: string; slug: string; tagline: string; logoUrl: string; primaryColor: string; whatsapp: string; defaultMarkup: number; customDomain: string; thankYouNote: string };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; slug: string; tagline: string; logoUrl: string; primaryColor: string; whatsapp: string; defaultMarkup: number; customDomain: string; thankYouNote: string }>>;
  editing: boolean;
  setEditing: (v: boolean) => void;
  saving: boolean;
  onSave: () => void;
  store: MyStore;
}) {
  const [logoPreview, setLogoPreview] = useState(form.logoUrl);

  function pickLogo(file: File | null) {
    if (!file) return;
    if (file.size > 150_000) {
      toast.error('اللوجو كبير — ارفع صورة أقل من 150KB أو حط رابط صورة');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setLogoPreview(url);
      setForm((f) => ({ ...f, logoUrl: url }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      {/* بطاقة الدومين */}
      <div className="rounded-2xl border bg-gradient-to-l from-blue-50 to-white p-5 space-y-3">
        <h3 className="font-extrabold flex items-center gap-2"><Globe className="h-4 w-4 text-blue-600" /> رابط متجرك ودومينك الخاص</h3>
        <div className="text-sm space-y-2">
          <p>✅ <b>رابطك الجاهز الآن:</b> <code className="rounded bg-white px-2 py-0.5 text-xs" dir="ltr">{SITE}/store/{store.slug}</code></p>
          <p>🌐 <b>سب دومين:</b> لو عندنا دومين المنصة (مثل <code dir="ltr">mahhlkw.com</code>) رابطك يصير <code dir="ltr">{store.slug}.mahhlkw.com</code> — يشتغل تلقائياً أول ما تربط المنصة دومينها.</p>
          <p>🏷️ <b>دومينك الخاص:</b> اشترِ دومينك (مثل <code dir="ltr">souq-ahmed.com</code>) واربطه بمتجرك من الحقل بالأسفل، ثم أضفه في إعدادات دومينات مشروع المنصة على Vercel (CNAME → <code dir="ltr">cname.vercel-dns.com</code>) — وبس! زبائنك يفتحون دومينك ويشوفون متجرك.</p>
        </div>
      </div>

      {/* نموذج الإعدادات */}
      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold">إعدادات متجرك</h3>
          <Button size="sm" variant={editing ? 'ghost' : 'outline'} onClick={() => setEditing(!editing)}>
            {editing ? 'إلغاء' : '✏️ تعديل'}
          </Button>
        </div>
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold text-muted-foreground">اسم المتجر</span>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-muted-foreground">المعرف (حذار: تغييره يغير رابط متجرك)</span>
                <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} dir="ltr" className="mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-muted-foreground">الجملة التعريفية</span>
                <input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} className="mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-muted-foreground">واتساب</span>
                <input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} dir="ltr" className="mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-muted-foreground">اللوجو (رابط صورة أو ارفع ملف)</span>
                <div className="mt-1 flex items-center gap-2">
                  {logoPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="لوجو" className="h-10 w-10 rounded-lg object-cover border" />
                  )}
                  <input value={form.logoUrl.startsWith('data:') ? '' : form.logoUrl} onChange={(e) => { setLogoPreview(e.target.value); setForm((f) => ({ ...f, logoUrl: e.target.value })); }} placeholder="https://…" dir="ltr" className="flex-1 rounded-xl border px-3.5 py-2.5 text-sm" />
                  <label className="shrink-0 cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold">
                    رفع
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-muted-foreground">دومينك الخاص (اختياري)</span>
                <input value={form.customDomain} onChange={(e) => setForm((f) => ({ ...f, customDomain: e.target.value.toLowerCase() }))} placeholder="souq-ahmed.com" dir="ltr" className="mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm" />
              </label>
            </div>
            <div>
              <span className="text-xs font-bold text-muted-foreground">لون الهوية</span>
              <div className="mt-2 flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setForm((f) => ({ ...f, primaryColor: c }))} className={`h-9 w-9 rounded-full border-2 ${form.primaryColor === c ? 'border-stone-900 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} aria-label={c} />
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">هامش الربح الافتراضي: {form.defaultMarkup} د.ك لكل منتج (للمنتجات بدون سعر مخصص)</span>
              <input type="range" min={0.5} max={10} step={0.5} value={form.defaultMarkup} onChange={(e) => setForm((f) => ({ ...f, defaultMarkup: Number(e.target.value) }))} className="w-full accent-amber-600 mt-2" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">رسالة الشكر بعد الطلب (تشوفها زبونك)</span>
              <input value={form.thankYouNote} onChange={(e) => setForm((f) => ({ ...f, thankYouNote: e.target.value }))} placeholder="شكراً لطلبك! نوصل طلبك خلال ٢٤–٤٨ ساعة" className="mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm" />
            </label>
            <Button onClick={onSave} disabled={saving} className="w-full h-11 font-extrabold">
              {saving ? 'جاري الحفظ…' : 'حفظ الإعدادات ✅'}
            </Button>
          </div>
        ) : (
          <div className="text-sm space-y-1.5 text-muted-foreground">
            <p>الاسم: <b className="text-foreground">{store.name}</b></p>
            <p>الرابط: <code dir="ltr" className="text-xs">/store/{store.slug}</code>{store.customDomain && <> · دومينك: <code dir="ltr" className="text-xs">{store.customDomain}</code></>}</p>
            <p>الهامش الافتراضي: <b className="text-foreground">{store.defaultMarkup} د.ك</b></p>
            <p>رسالة الشكر: {store.thankYouNote || '—'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
