'use client';

/**
 * BoughtTogether — Amazon-style "العملاء اشتروا هذه المنتجات معاً"
 *
 * Sources its data from /api/products/bought-together which ranks REAL
 * co-purchase + co-view signals. Anything already in the visitor's cart is
 * excluded live, and items added from the widget fade out of the suggestion
 * row immediately (no re-suggesting what's already in the cart).
 */
import { useEffect, useMemo, useState } from 'react';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAppStore } from '@/lib/stores/app-store';
import { trackUpsellClick } from '@/lib/behavior-tracker';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus, ShoppingCart, Check, TrendingUp, Eye } from 'lucide-react';
import { formatKwd } from '@/lib/utils/format';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

interface Item {
  productId: string;
  slug: string;
  name: string;
  price: number;
  oldPrice: number | null;
  image: string | null;
  reason: string;
  score: number;
  source: 'order' | 'coview' | 'category';
}

const SOURCE_LABEL: Record<Item['source'], { icon: React.ReactNode; cls: string }> = {
  order: {
    icon: <TrendingUp className="h-3 w-3" />,
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  coview: {
    icon: <Eye className="h-3 w-3" />,
    cls: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  category: {
    icon: <Users className="h-3 w-3" />,
    cls: 'bg-amber-100 text-amber-800 border-amber-200',
  },
};

export function BoughtTogether({ productId }: { productId: string }) {
  const { t } = useT();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const openProduct = useAppStore((s) => s.openProduct);

  const cartIds = useMemo(() => cartItems.map((i) => i.productId), [cartItems]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ productId, limit: '4' });
        const res = await fetch(`/api/products/bought-together?${params}`);
        const data = await res.json();
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Live filter: never suggest what's already in the cart
  const visible = items.filter(
    (it) => !cartIds.includes(it.productId) && !addedIds.has(it.productId)
  );

  const bundleTotal = visible.reduce((s, it) => s + it.price, 0);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <Skeleton className="h-5 w-52 mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-28 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (visible.length < 2) return null;

  const hasRealSignal = items.some((i) => i.source === 'order');

  async function addOne(it: Item) {
    addItem(
      {
        productId: it.productId,
        slug: it.slug,
        name: it.name,
        sku: it.slug,
        price: it.price,
        image: it.image || '',
      },
      1
    );
    setAddedIds((s) => new Set(s).add(it.productId));
    toast.success(t('bt.added', { name: it.name }));
    await trackUpsellClick(it.productId, 'added');
  }

  async function addAll() {
    for (const it of visible) {
      addItem(
        {
          productId: it.productId,
          slug: it.slug,
          name: it.name,
          sku: it.slug,
          price: it.price,
          image: it.image || '',
        },
        1
      );
    }
    setAddedIds((s) => {
      const next = new Set(s);
      visible.forEach((v) => next.add(v.productId));
      return next;
    });
    toast.success(t('bt.addedAll', { n: visible.length }));
    await trackUpsellClick(visible[0].productId, 'added');
  }

  return (
    <section className="rounded-xl border-2 border-primary/15 bg-gradient-to-l from-primary/[0.03] via-transparent to-primary/[0.03] p-4 md:p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-extrabold text-base md:text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {hasRealSignal ? t('bt.titleReal') : t('bt.titleFall')}
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {hasRealSignal ? t('bt.subReal') : t('bt.subFall')}
        </span>
      </div>

      {/* Bundle row — Amazon style */}
      <div className="flex flex-wrap items-stretch gap-2 md:gap-3">
        {visible.map((it, idx) => {
          const badge = SOURCE_LABEL[it.source] || SOURCE_LABEL.category;
          return (
            <div key={it.productId} className="flex items-stretch">
              {idx > 0 && (
                <div className="flex items-center px-1 text-muted-foreground font-black text-lg">
                  +
                </div>
              )}
              <div className="w-[120px] md:w-[136px] rounded-xl border bg-card overflow-hidden hover:border-primary/40 transition-colors group flex flex-col">
                <button
                  onClick={() => openProduct(it.slug)}
                  className="relative h-24 bg-white overflow-hidden cursor-pointer"
                  aria-label={it.name}
                >
                  {it.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={it.image}
                      alt={it.name}
                      loading="lazy"
                      className="h-full w-full img-contain p-1.5 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl">🛍</div>
                  )}
                </button>
                <div className="p-2 flex-1 flex flex-col gap-1">
                  <button
                    onClick={() => openProduct(it.slug)}
                    className="text-right text-[11.5px] font-semibold line-clamp-2 leading-snug hover:text-primary transition-colors cursor-pointer"
                  >
                    {it.name}
                  </button>
                  <div className="flex items-center gap-1 mt-auto">
                    <span className="text-[13px] font-extrabold text-gold-deep">
                      {formatKwd(it.price)}
                    </span>
                    {it.oldPrice && (
                      <span className="text-[10px] text-muted-foreground line-through">
                        {formatKwd(it.oldPrice)}
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex w-fit items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold ${badge.cls}`}
                  >
                    {badge.icon}
                    {it.source === 'order'
                      ? t('bt.boughtReal')
                      : it.source === 'coview'
                        ? t('bt.coViewed')
                        : t('bt.commonPick')}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-full text-[11px]"
                    onClick={() => addOne(it)}
                  >
                    <Plus className="h-3 w-3 ml-1" />
                    {t('bt.add')}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bundle total + add-all */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3.5">
        <div>
          <p className="text-sm">
            <span className="text-muted-foreground">{t('bt.total', { n: visible.length })} </span>
            <span className="font-extrabold text-base text-gold-deep">{formatKwd(bundleTotal)}</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t('bt.addAll')}
          </p>
        </div>
        <Button className="btn-gold border-0 font-bold" onClick={addAll}>
          <ShoppingCart className="h-4 w-4 ml-2" />
          {t('bt.addAllBtn', { n: visible.length })}
        </Button>
      </div>

      {/* just-added confirmation line */}
      {addedIds.size > 0 && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <Check className="h-3.5 w-3.5" />
          {t('bt.done')}
        </p>
      )}
    </section>
  );
}
