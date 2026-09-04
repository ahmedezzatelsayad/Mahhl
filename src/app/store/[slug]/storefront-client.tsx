'use client';

/**
 * storefront-client — واجهة المتجر العام لزوار المسوّق.
 * هوية المسوّق (لوجو/لون/اسم) + شبكة منتجات + طلب سريع (COD) بنافذة واحدة.
 * Mobile-first، بدون أي روابط للمنصة الرئيسية (المتجر عالم مستقل).
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export interface StorefrontProductView {
  id: string;
  name: string;
  thumb: string | null;
  price: number;
  oldPrice: number | null;
  isBestSeller: boolean;
  inStock: boolean;
  category: string | null;
  description: string | null;
}

interface StoreInfo {
  slug: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string;
  whatsapp: string | null;
  thankYouNote: string | null;
}

const GOVERNORATES = [
  'محافظة العاصمة',
  'محافظة حولي',
  'محافظة الفروانية',
  'محافظة الجهراء',
  'محافظة الأحمدي',
  'محافظة مبارك الكبير',
];

const fmt = (n: number) => `${n.toFixed(3)} د.ك`;

export default function StorefrontClient({
  store,
  products,
}: {
  store: StoreInfo;
  products: StorefrontProductView[];
}) {
  const accent = store.primaryColor || '#B45309';
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [ordering, setOrdering] = useState<StorefrontProductView | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[])),
    [products]
  );

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (cat && p.category !== cat) return false;
        if (query && !p.name.includes(query.trim())) return false;
        return true;
      }),
    [products, cat, query]
  );

  return (
    <div className="min-h-screen bg-stone-50" style={{ ['--accent' as string]: accent }}>
      {/* ===== الهيدر بهوية المتجر ===== */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logoUrl}
              alt={store.name}
              className="h-11 w-11 rounded-xl object-cover border border-stone-200"
            />
          ) : (
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0"
              style={{ backgroundColor: accent }}
            >
              {store.name.trim().charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold text-stone-900 leading-tight truncate">{store.name}</h1>
            {store.tagline && (
              <p className="text-xs text-stone-500 truncate">{store.tagline}</p>
            )}
          </div>
          {store.whatsapp && (
            <a
              href={`https://wa.me/${store.whatsapp.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] text-white text-xs font-bold px-3 py-2"
            >
              واتساب
            </a>
          )}
        </div>
      </header>

      {/* ===== شريط الثقة ===== */}
      <div className="bg-stone-900 text-stone-100 text-[11px] sm:text-xs">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-center gap-4 sm:gap-6 flex-wrap text-center">
          <span>🚚 توصيل لكل الكويت</span>
          <span>💵 الدفع عند الاستلام</span>
          <span>↩️ استبدال خلال 3 أيام</span>
          <span className="hidden sm:inline">✅ منتجات أصلية</span>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-5">
        {/* بحث + تصنيفات */}
        <div className="flex gap-2 mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="دوّر على منتج…"
            className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-500"
          />
        </div>
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
            <button
              onClick={() => setCat(null)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold border transition ${
                cat === null ? 'text-white border-transparent' : 'bg-white text-stone-600 border-stone-300'
              }`}
              style={cat === null ? { backgroundColor: accent } : undefined}
            >
              الكل ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c === cat ? null : c)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold border transition ${
                  cat === c ? 'text-white border-transparent' : 'bg-white text-stone-600 border-stone-300'
                }`}
                style={cat === c ? { backgroundColor: accent } : undefined}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* شبكة المنتجات */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-bold">ما لقينا منتجات مطابقة</p>
            <p className="text-sm mt-1">جرّب كلمة بحث ثانية أو شوف «الكل»</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p) => (
              <article
                key={p.id}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col hover:shadow-md transition"
              >
                <div className="relative aspect-square bg-stone-100">
                  {p.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumb} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-stone-300 text-3xl">🛍️</div>
                  )}
                  {p.isBestSeller && (
                    <span className="absolute top-2 start-2 rounded-full bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5">
                      الأكثر مبيعاً 🔥
                    </span>
                  )}
                  {!p.inStock && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-stone-700 font-extrabold text-sm">
                      نفذت الكمية
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <h3 className="text-sm font-bold text-stone-800 leading-snug line-clamp-2 flex-1">{p.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-extrabold" style={{ color: accent }}>
                      {fmt(p.price)}
                    </span>
                    {p.oldPrice && (
                      <span className="text-[11px] text-stone-400 line-through">{fmt(p.oldPrice)}</span>
                    )}
                  </div>
                  <button
                    disabled={!p.inStock}
                    onClick={() => setOrdering(p)}
                    className="rounded-xl text-white text-sm font-extrabold py-2.5 disabled:bg-stone-300 disabled:cursor-not-allowed transition active:scale-[0.98]"
                    style={p.inStock ? { backgroundColor: accent } : undefined}
                  >
                    اطلب الآن
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* فوتر المتجر — حلقة النمو للمنصة */}
      <footer className="border-t border-stone-200 bg-white mt-8">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-stone-500 space-y-1">
          <p className="font-bold text-stone-700">{store.name}</p>
          <p>الدفع عند الاستلام · توصيل لكل المحافظات · خدمة زبائن سريعة</p>
          <p className="text-[10px] text-stone-400">
            هذا المتجر يعمل بمنصة <span className="font-bold">محل شوب</span> — دروب شيبنج الكويت
          </p>
        </div>
      </footer>

      {ordering && (
        <OrderSheet
          store={store}
          product={ordering}
          accent={accent}
          onClose={() => setOrdering(null)}
        />
      )}
    </div>
  );
}

/** نافذة الطلب السريع — بيانات الزبون + تأكيد */
function OrderSheet({
  store,
  product,
  accent,
  onClose,
}: {
  store: StoreInfo;
  product: StorefrontProductView;
  accent: string;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '', governorate: '', area: '', address: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ orderNumber: string; total: number } | null>(null);

  const total = Math.round(product.price * qty * 1000) / 1000;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/storefront/${encodeURIComponent(store.slug)}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ productId: product.id, quantity: qty, name: product.name }],
          customerName: form.name,
          phone: form.phone,
          governorate: form.governorate,
          area: form.area,
          address: form.address,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'صار خطأ — جرّب مرة ثانية');
      setDone({ orderNumber: data.orderNumber, total: data.total });
    } catch (e: any) {
      toast.error(e.message || 'صار خطأ — جرّب مرة ثانية');
    } finally {
      setBusy(false);
    }
  }

  const phoneOk = /^[569]\d{7}$/.test(form.phone.replace(/\s/g, '').replace(/^\+?965/, ''));
  const formOk = form.name.trim().length >= 2 && phoneOk && form.governorate && form.address.trim().length >= 5;

  if (done) {
    return (
      <Sheet onClose={onClose}>
        <div className="text-center py-6 space-y-3">
          <div className="text-6xl">🎉</div>
          <h3 className="text-xl font-extrabold text-stone-900">تم استلام طلبك!</h3>
          <p className="text-stone-600 text-sm">
            رقم الطلب <span className="font-extrabold text-stone-900">{done.orderNumber}</span>
          </p>
          <p className="text-sm text-stone-600">
            الإجمالي: <span className="font-extrabold">{fmt(done.total)}</span> — الدفع عند الاستلام
          </p>
          {store.thankYouNote && <p className="text-sm text-stone-500 bg-stone-100 rounded-xl p-3">{store.thankYouNote}</p>}
          <p className="text-xs text-stone-400">بيوصلك اتصال للتأكيد خلال وقت قصير 🚚</p>
          <button onClick={onClose} className="mt-2 rounded-xl text-white font-extrabold px-8 py-3" style={{ backgroundColor: accent }}>
            تابع التسوق
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {product.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.thumb} alt={product.name} className="h-16 w-16 rounded-xl object-cover border border-stone-200" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-stone-900 text-sm leading-snug line-clamp-2">{product.name}</h3>
            <p className="font-extrabold" style={{ color: accent }}>
              {fmt(product.price)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-8 w-8 rounded-lg bg-stone-100 font-bold">−</button>
            <span className="w-8 text-center font-extrabold">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(20, q + 1))} className="h-8 w-8 rounded-lg bg-stone-100 font-bold">+</button>
          </div>
        </div>

        <div className="rounded-xl bg-stone-100 p-3 flex items-center justify-between text-sm">
          <span className="text-stone-600 font-bold">الإجمالي (دفع عند الاستلام)</span>
          <span className="font-extrabold text-lg" style={{ color: accent }}>{fmt(total)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.name} onChange={set('name')} placeholder="الاسم *" className={inputCls} />
          <input value={form.phone} onChange={set('phone')} placeholder="رقم الهاتف (8 أرقام) *" inputMode="numeric" className={inputCls} />
          <select value={form.governorate} onChange={set('governorate')} className={inputCls}>
            <option value="">اختر المحافظة *</option>
            {GOVERNORATES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <input value={form.area} onChange={set('area')} placeholder="المنطقة (مثال: السالمية)" className={inputCls} />
        </div>
        <input value={form.address} onChange={set('address')} placeholder="العنوان بالتفصيل (قطعة، شارع، منزل) *" className={inputCls} />
        <textarea value={form.notes} onChange={set('notes')} placeholder="ملاحظات (اختياري)" rows={2} className={inputCls} />

        <button
          disabled={busy || !formOk}
          onClick={submit}
          className="w-full rounded-xl text-white font-extrabold py-3.5 disabled:bg-stone-300 disabled:cursor-not-allowed transition active:scale-[0.99]"
          style={!busy && formOk ? { backgroundColor: accent } : undefined}
        >
          {busy ? 'جاري إرسال الطلب…' : 'أكّد الطلب — الدفع عند الاستلام 💵'}
        </button>
        <p className="text-[11px] text-center text-stone-400">بالتأكيد أنت توافق على استلام مكالمة تأكيد الطلب</p>
      </div>
    </Sheet>
  );
}

const inputCls =
  'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-stone-500';

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 end-3 h-8 w-8 rounded-full bg-stone-100 text-stone-500 font-bold"
          aria-label="إغلاق"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
