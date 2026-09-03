'use client';

import { useWishlistStore } from '@/lib/stores/wishlist-store';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { Heart, HandCoins, Trash2 } from 'lucide-react';
import { formatKwd } from '@/lib/utils/format';

export function WishlistView() {
  const { t, lang } = useT();
  const items = useWishlistStore((s) => s.items);
  const remove = useWishlistStore((s) => s.remove);
  const openProduct = useAppStore((s) => s.openProduct);
  const setView = useAppStore((s) => s.setView);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Heart className="h-16 w-16 text-muted-foreground/25 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">{t('wl.empty')}</h1>
        <p className="text-muted-foreground text-sm mb-5">
          {t('wl.emptySub')}
        </p>
        <Button onClick={() => setView('shop')} className="btn-gold border-0">
          {t('wl.start')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold mb-1">{t('wl.title')}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t('wl.saved', { n: items.length })}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((w) => (
          <div key={w.productId} className="border rounded-xl bg-card overflow-hidden flex">
            <button
              onClick={() => openProduct(w.slug)}
              className="h-28 w-28 shrink-0 bg-white cursor-pointer"
              aria-label={w.name}
            >
              {w.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={w.image} alt={w.name} className="h-full w-full img-contain p-1.5" loading="lazy" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  <Heart className="h-8 w-8 opacity-30" />
                </div>
              )}
            </button>
            <div className="flex-1 p-3 flex flex-col min-w-0">
              <button
                onClick={() => openProduct(w.slug)}
                className="text-right text-sm font-medium line-clamp-2 hover:text-accent cursor-pointer"
              >
                {w.name}
              </button>
              <p className="font-extrabold text-gold-deep mt-1">{formatKwd(w.price)}</p>
              <div className="mt-auto flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="btn-gold border-0 flex-1"
                  onClick={() => openProduct(w.slug)}
                >
                  <HandCoins className="h-3.5 w-3.5 ml-1" /> {lang === 'en' ? 'Market & earn' : 'سوّقه واربح'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => remove(w.productId)}
                  className="text-destructive hover:text-destructive"
                  aria-label={t('wl.removeAria')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
