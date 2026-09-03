'use client';

/**
 * AffiliateProductsView — كتالوج المنتجات مع العمولة لكل منتج.
 * فلترة بالشرائح (1 / 1.5 / 2 د.ك) + ترتيب + مشاركة واتساب
 * + نسخ الرابط التسويقي المباشر ?p=<slug>&ref=<code>.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatKwd } from '@/lib/utils/format';
import { toast } from 'sonner';
import { Search, PlusCircle, Copy, Share2, Flame } from 'lucide-react';

interface AffProduct {
  id: string; slug: string; name: string; sku: string; thumb: string | null;
  sellPrice: number; commission: number; quantity: number; trackStock: boolean;
  isBestSeller: boolean; soldCount: number;
  suggestedPrice?: number | null; demandTier?: string | null; adChannel?: string | null; studyNote?: string | null;
}

const TIER_OPTIONS = [
  { value: '', label: 'كل المنتجات', badge: '' },
  { value: '1', label: 'عمولة 1 د.ك', badge: 'bg-emerald-600' },
  { value: '1.5', label: 'عمولة 1.5 د.ك', badge: 'bg-amber-500' },
  { value: '2', label: 'عمولة 2 د.ك', badge: 'bg-rose-600' },
];

const SORT_OPTIONS = [
  { value: 'best', label: 'الأكثر مبيعاً' },
  { value: 'commission', label: 'أعلى عمولة' },
  { value: 'demand', label: 'الأعلى طلباً 🔥' },
  { value: 'suggested', label: 'أعلى سعر بيع مقترح' },
  { value: 'price_asc', label: 'الأرخص سعراً' },
  { value: 'price_desc', label: 'الأغلى سعراً' },
];

/** لون شريحة العمولة */
function tierBadgeClass(commission: number) {
  if (commission <= 1) return 'bg-emerald-600 hover:bg-emerald-600';
  if (commission <= 1.5) return 'bg-amber-500 hover:bg-amber-500';
  return 'bg-rose-600 hover:bg-rose-600';
}

export function AffiliateProductsView() {
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const affiliateUser = useAppStore((s) => s.affiliateUser);
  const setView = useAppStore((s) => s.setView);
  const code = affiliateUser?.code || '';
  const [products, setProducts] = useState<AffProduct[]>([]);
  const [tierCounts, setTierCounts] = useState<{ commission: number; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const [sort, setSort] = useState('best');
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setOrigin(window.location.origin), 0);
    return () => clearTimeout(t);
  }, []);

  async function load(p = 1, query = '', tierV = tier, sortV = sort) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/affiliate/products?page=${p}&perPage=24&q=${encodeURIComponent(query)}` +
        `&tier=${encodeURIComponent(tierV)}&sort=${sortV}`,
        { headers: { Authorization: `Bearer ${affiliateToken || ''}` } }
      );
      if (res.status === 401) {
        toast.error('انتهت جلستك — سجل دخول مرة ثانية');
        return;
      }
      const data = await res.json();
      setProducts(data.products || []);
      setTierCounts(data.tierCounts || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(Math.max(1, Math.ceil((data.total || 0) / (data.perPage || 24))));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(1), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copySku(sku: string) {
    navigator.clipboard?.writeText(sku).then(() => toast.success(`تم نسخ الكود ${sku}`));
  }

  function productLink(slug: string) {
    return `${origin}/?p=${encodeURIComponent(slug)}${code ? `&ref=${code}` : ''}`;
  }

  function copyLink(slug: string) {
    navigator.clipboard?.writeText(productLink(slug)).then(
      () => toast.success('تم نسخ الرابط التسويقي — أي طلب منه يتحسب عمولتك تلقائياً')
    );
  }

  function shareWhatsApp(p: AffProduct) {
    const text = encodeURIComponent(
      `${p.name}\nالسعر: ${formatKwd(p.sellPrice)} — توصيل لكل الكويت 🚚\n${productLink(p.slug)}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  const tierCountFor = (v: number) =>
    tierCounts.find((t) => Math.abs(t.commission - v) < 0.001)?.count;

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">المنتجات والعمولات</h1>
        <Button size="sm" onClick={() => setView('affiliate-add-order')}>
          <PlusCircle className="h-4 w-4 ml-1" />
          اضف طلب
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        كل منتج عليه عمولة من 1 إلى 2 د.ك حسب تنافسيته — شاركه برابطك الخاص أو ابيعه لعميلك وحط الطلب من «اضف طلب».
        {total > 0 && ` — ${total} منتج`}
      </p>

      {/* Commission tier chips */}
      <div className="flex flex-wrap items-center gap-2">
        {TIER_OPTIONS.map((opt) => {
          const cnt = opt.value
            ? tierCountFor(parseFloat(opt.value))
            : tierCounts.reduce((s, t) => s + t.count, 0);
          const active = tier === opt.value;
          return (
            <button
              key={opt.value || 'all'}
              onClick={() => {
                setTier(opt.value);
                load(1, q, opt.value, sort);
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-accent'
              }`}
            >
              {opt.badge && <span className={`w-2 h-2 rounded-full ${opt.badge}`} />}
              {opt.label}
              {typeof cnt === 'number' && (
                <span className={`text-[10px] ${active ? 'opacity-80' : 'text-muted-foreground'}`}>
                  ({cnt})
                </span>
              )}
            </button>
          );
        })}
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            load(1, q, tier, e.target.value);
          }}
          className="text-xs border rounded-md px-2 py-1.5 bg-card mr-auto"
          aria-label="ترتيب المنتجات"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(1, q, tier, sort);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو الكود..."
            className="pr-9"
          />
        </div>
        <Button type="submit" variant="outline">ابحث</Button>
      </form>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {products.map((p) => (
            <Card key={p.id} className="overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-muted">
                {p.thumb ? (

                  <img
                    src={p.thumb}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    بدون صورة
                  </div>
                )}
                {p.isBestSeller && (
                  <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-500 text-white">
                    <Flame className="h-3 w-3 ml-0.5" />
                    الأكثر مبيعاً
                  </Badge>
                )}
                <Badge
                  className={`absolute top-2 left-2 text-white ${tierBadgeClass(p.commission)}`}
                >
                  عمولة {formatKwd(p.commission)}
                </Badge>
              </div>
              <div className="p-3 flex-1 flex flex-col gap-1.5">
                <div className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]">
                  {p.name}
                </div>
                <button
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground w-fit"
                  onClick={() => copySku(p.sku)}
                  title="نسخ كود المنتج"
                >
                  <Copy className="h-3 w-3" />
                  <span className="font-mono">{p.sku}</span>
                </button>
                <div className="text-[11px] text-muted-foreground">
                  🔥 طُلب {p.soldCount > 0 ? p.soldCount.toLocaleString('en') : '—'} مرة
                </div>
                {/* الدراسة التسويقية: سعر مقترح + طلب + قناة */}
                {(p.suggestedPrice != null || p.demandTier || p.adChannel) && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-2 text-[11px] space-y-1">
                    {p.suggestedPrice != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-amber-800">سعر البيع المقترح</span>
                        <span className="font-extrabold text-amber-900">{formatKwd(p.suggestedPrice)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.demandTier === 'hot' && <Badge className="bg-red-500 hover:bg-red-500 text-white text-[9px] px-1.5 py-0">طلب عالي 🔥</Badge>}
                      {p.demandTier === 'warm' && <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[9px] px-1.5 py-0">طلب متوسط</Badge>}
                      {p.demandTier === 'cold' && <Badge className="bg-slate-500 hover:bg-slate-500 text-white text-[9px] px-1.5 py-0">نيتش 💎</Badge>}
                      {p.adChannel === 'snapchat' && <Badge variant="outline" className="text-[9px] px-1.5 py-0">سناب شات</Badge>}
                      {p.adChannel === 'tiktok' && <Badge variant="outline" className="text-[9px] px-1.5 py-0">تيك توك</Badge>}
                      {p.adChannel === 'instagram' && <Badge variant="outline" className="text-[9px] px-1.5 py-0">إنستقرام</Badge>}
                      {p.adChannel === 'whatsapp' && <Badge variant="outline" className="text-[9px] px-1.5 py-0">واتساب</Badge>}
                    </div>
                  </div>
                )}
                <div className="mt-auto space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">{formatKwd(p.sellPrice)}</div>
                    <div className="text-primary font-bold text-sm">
                      عمولتك {formatKwd(p.commission)}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 text-[11px]"
                      onClick={() => copyLink(p.slug)}
                    >
                      <Copy className="h-3 w-3 ml-0.5" />
                      رابطك
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 flex-1 text-[11px] bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => shareWhatsApp(p)}
                    >
                      <Share2 className="h-3 w-3 ml-0.5" />
                      واتساب
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {!products.length && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              لا توجد نتائج مطابقة
            </div>
          )}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => load(page - 1, q, tier, sort)}
          >
            السابق
          </Button>
          <span className="text-xs text-muted-foreground">
            صفحة {page} من {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => load(page + 1, q, tier, sort)}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}
