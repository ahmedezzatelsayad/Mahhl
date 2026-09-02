'use client';

/**
 * AffiliateProductsView — كتالوج المنتجات مع العمولة لكل منتج
 * (سعر البيع شامل العمولة + عمولتك) + بحث وترقيم صفحات.
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
import { Search, PlusCircle, Copy } from 'lucide-react';

interface AffProduct {
  id: string; slug: string; name: string; sku: string; thumb: string | null;
  sellPrice: number; commission: number; quantity: number; trackStock: boolean;
  isBestSeller: boolean;
}

export function AffiliateProductsView() {
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const setView = useAppStore((s) => s.setView);
  const [products, setProducts] = useState<AffProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(p = 1, query = '') {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/affiliate/products?page=${p}&perPage=24&q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${affiliateToken || ''}` } }
      );
      if (res.status === 401) {
        toast.error('انتهت جلستك — سجل دخول مرة ثانية');
        return;
      }
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(Math.max(1, Math.ceil((data.total || 0) / (data.perPage || 24))));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
     
  }, []);

  function copySku(sku: string) {
    navigator.clipboard?.writeText(sku).then(() => toast.success(`تم نسخ الكود ${sku}`));
  }

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
        السعر المعروض هو سعر البيع للعميل، و«عمولتك» تُحسب تلقائياً عند تسليم الطلب.
        {total > 0 && ` — ${total} منتج`}
      </p>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(1, q);
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
                    الأكثر مبيعاً
                  </Badge>
                )}
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
                <div className="mt-auto">
                  <div className="text-sm">{formatKwd(p.sellPrice)}</div>
                  <div className="text-primary font-bold text-sm">
                    عمولتك {formatKwd(p.commission)}
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
            onClick={() => load(page - 1, q)}
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
            onClick={() => load(page + 1, q)}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}
