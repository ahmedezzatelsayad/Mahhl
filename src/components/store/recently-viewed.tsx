'use client';

/**
 * RecentlyViewed — localStorage rail of the visitor's last viewed products.
 * Global best practice (Baymard/Nielsen): re-engages, speeds up re-finding,
 * and boosts cross-sell without extra API calls (product data cached at view time).
 */
import { useEffect, useState } from 'react';
import { History, ShoppingCart } from 'lucide-react';
import { useAppStore } from '@/lib/stores/app-store';
import { useT } from '@/lib/i18n';
import { formatKwd } from '@/lib/utils/format';

export interface RvItem {
  slug: string;
  name: string;
  price: number;
  salePrice: number;
  thumb: string;
  id?: string;
  at: number;
}

const KEY = 'mahhl-recently-viewed';
const MAX = 12;

export function pushRecentlyViewed(item: Omit<RvItem, 'at'>) {
  try {
    const list = readRv().filter((r) => r.slug !== item.slug);
    list.unshift({ ...item, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* private mode */
  }
}

function readRv(): RvItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as RvItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function RecentlyViewed() {
  const [items, setItems] = useState<RvItem[]>([]);
  const openProduct = useAppStore((s) => s.openProduct);
  const { t, lang } = useT();

  useEffect(() => {
    const update = () => setItems(readRv().filter((r) => r.slug));
    update();
    window.addEventListener('mahhl-rv', update);
    return () => window.removeEventListener('mahhl-rv', update);
  }, []);

  if (items.length < 2) return null;

  return (
    <section className="border-t bg-card/60 mt-10">
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-base md:text-lg font-bold flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-primary" />
          {t('m.recentlyViewed')}
        </h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {items.map((it) => (
            <div
              key={it.slug}
              className="shrink-0 w-36 md:w-40 rounded-xl border bg-card overflow-hidden card-lift"
            >
              <button onClick={() => openProduct(it.slug)} className="block w-full text-right cursor-pointer">
                <div className="aspect-square bg-white">
                  {it.thumb ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={it.thumb} alt={it.name} loading="lazy" className="h-full w-full img-contain p-2" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground/40">
                      <ShoppingCart className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium line-clamp-2 min-h-[2rem]">{it.name}</p>
                  <p className="text-sm font-extrabold text-primary mt-1">
                    {formatKwd(it.salePrice ?? it.price)}
                  </p>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
      <span className="hidden">{lang}</span>
    </section>
  );
}
