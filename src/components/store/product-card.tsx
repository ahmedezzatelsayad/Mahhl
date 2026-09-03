'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/stores/app-store';
import { formatKwd } from '@/lib/utils/format';
import { ShoppingCart, Star, Heart, Flame, HandCoins, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlistStore } from '@/lib/stores/wishlist-store';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { useState, useEffect } from 'react';

export interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    salePrice: number;
    thumb: string | null;
    images: string;
    quantity: number;
    isBestSeller?: boolean;
    category?: { name: string } | null;
    /** open suggested commission (KWD 1–10) — shown to ALL visitors (منصة افلييت) */
    commission?: number | null;
    /** optional social proof (top-demand / related endpoints) */
    rating?: number;
    reviewCount?: number;
    soldCount?: number;
    demandRank?: number | null;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useT();
  const openProduct = useAppStore((s) => s.openProduct);
  const setView = useAppStore((s) => s.setView);
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const affiliateCode = useAppStore((s) => s.affiliateUser?.code ?? null);
  const toggleWish = useWishlistStore((s) => s.toggle);
  const wished = useWishlistStore((s) => s.items.some((i) => i.productId === product.id));
  const [imgError, setImgError] = useState(false);
  const [imgUrl, setImgUrl] = useState<string>('');

  useEffect(() => {
    const thumb =
      product.thumb ||
      (product.images ? product.images.split(',')[0] : '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImgUrl(thumb || '');
  }, [product.thumb, product.images]);

  const discount =
    product.price > product.salePrice
      ? Math.round(((product.price - product.salePrice) / product.price) * 100)
      : 0;

  /** marketing link with the marketer's ref code (no direct selling — منصة افلييت) */
  function marketerCta(e: React.MouseEvent) {
    e.stopPropagation();
    if (affiliateToken && affiliateCode) {
      const url = `${window.location.origin}/?p=${encodeURIComponent(product.slug)}&ref=${affiliateCode}`;
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success(t('pc.linkCopied')))
        .catch(() => toast.error(t('pc.linkCopyFail')));
    } else {
      setView('affiliate-login');
    }
  }

  function toggleWishlist(e: React.MouseEvent) {
    e.stopPropagation();
    const added = toggleWish({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.salePrice,
      image: imgUrl,
    });
    toast.success(added ? t('pc.wishAdd') : t('pc.wishRemove'));
  }

  return (
    <Card
      onClick={() => openProduct(product.slug)}
      className="card-lift group overflow-hidden border-border/60 hover:border-accent/50"
    >
      <div className="relative aspect-square overflow-hidden bg-white">
        {imgUrl && !imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imgUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full img-contain p-2 transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ShoppingCart className="h-12 w-12 opacity-30" />
          </div>
        )}

        {/* Kuwait demand rank badge — bottom-left of image */}
        {product.demandRank != null && product.demandRank <= 100 && (
          <Badge
            className={`absolute bottom-2 left-2 border-0 text-white font-extrabold shadow ${
              product.demandRank <= 3
                ? 'bg-gradient-to-l from-yellow-500 to-amber-600'
                : 'bg-primary/90'
            }`}
          >
            {t('pc.rank', { n: product.demandRank })}
          </Badge>
        )}

        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {discount > 0 && (
            <Badge className="bg-red-600 text-white hover:bg-red-700 border-0">
              -{discount}%
            </Badge>
          )}
          {product.isBestSeller && (
            <Badge className="btn-gold border-0 text-white hover:opacity-90">
              <Star className="h-3 w-3 ml-1" />
              {t('pc.bestseller')}
            </Badge>
          )}
        </div>

        {/* wishlist heart */}
        <button
          onClick={toggleWishlist}
          aria-label={wished ? t('pc.wishRemoveAria') : t('pc.wishAddAria')}
          className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 border shadow-sm hover:scale-110 transition-transform cursor-pointer"
        >
          <Heart
            className={`h-4 w-4 ${wished ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
          />
        </button>

        {product.quantity <= 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold">{t('pc.oos')}</span>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {product.category?.name && (
          <p className="text-[10px] text-muted-foreground truncate">
            {product.category.name}
          </p>
        )}
        <h3
          className="text-sm font-medium line-clamp-2 min-h-[2.5rem] group-hover:text-accent"
          title={product.name}
        >
          {product.name}
        </h3>
        {/* social proof — stars + sold count (when provided by the endpoint) */}
        {(product.rating && product.reviewCount) || product.soldCount ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {product.rating && product.rating > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <b className="text-foreground">{product.rating.toFixed(1)}</b>
                {product.reviewCount ? <span>({product.reviewCount})</span> : null}
              </span>
            )}
            {product.soldCount ? (
              <span className="inline-flex items-center gap-0.5">
                <Flame className="h-3 w-3 text-orange-500" />
                {t('pc.sold', { n: product.soldCount })}
              </span>
            ) : null}
          </div>
        ) : null}
        {/* العمولة المقترحة أعلى السعر — هوية منصة الافلييت: المسوق يختار عمولته 1–10 د.ك */}
        {product.commission != null && product.commission > 0 && (
          <p className="inline-flex max-w-full items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 whitespace-nowrap">
            <HandCoins className="h-3 w-3 shrink-0" />
            <span className="truncate">{t('pc.commissionShort', { n: product.commission.toFixed(3) })}</span>
          </p>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-base font-extrabold text-foreground">
            {formatKwd(product.salePrice)}
          </span>
          {discount > 0 && (
            <span className="text-xs text-muted-foreground line-through">
              {formatKwd(product.price)}
            </span>
          )}
        </div>
        <Button
          size="sm"
          className="w-full btn-gold border-0 hover:opacity-95"
          onClick={marketerCta}
        >
          {affiliateToken && affiliateCode ? (
            <>
              <Link2 className="h-4 w-4 ml-1" />
              {t('pc.copyLink')}
            </>
          ) : (
            <>
              <HandCoins className="h-4 w-4 ml-1" />
              {t('pc.marketIt')}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
