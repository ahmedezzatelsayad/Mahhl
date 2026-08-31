'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { useCartStore } from '@/lib/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatKwd } from '@/lib/utils/format';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ShoppingCart,
  Minus,
  Plus,
  Star,
  Truck,
  Shield,
  CheckCircle,
  Flame,
} from 'lucide-react';
import { ProductCard } from '@/components/store/product-card';
import { UpsellWidget } from '@/components/store/upsell-widget';
import { BoughtTogether } from '@/components/store/bought-together';
import { ReviewsSection, useReviewSummary, StarsRow } from '@/components/store/reviews-section';
import { pushRecentlyViewed } from '@/components/store/recently-viewed';
import { trackEvent } from '@/lib/behavior-tracker';
import { trackFB } from '@/lib/facebook-pixel';
import { trackGA4, ga4Item } from '@/lib/ga4';
import { useT } from '@/lib/i18n';
import { readLang } from '@/lib/stores/lang-store';

interface Variation {
  label: string;
  type: string;
  values: string[];
}

interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  metaDescription: string | null;
  metaTitle?: string | null;
  price: number;
  salePrice: number;
  quantity: number;
  trackStock: boolean;
  disableOOS: boolean;
  thumb: string | null;
  images: string;
  sku: string;
  isBestSeller: boolean;
  variations: string | null;
  category: { name: string } | null;
}

export function ProductView() {
  const slug = useAppStore((s) => s.selectedProductSlug);
  const setView = useAppStore((s) => s.setView);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const { t, lang } = useT();

  const [product, setProduct] = useState<(ProductDetail & { demandRank?: number | null; liveViewers?: number }) | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const { summary: reviewSummary } = useReviewSummary(slug ?? undefined);

  useEffect(() => {
    if (!slug) {
      setView('shop');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setActiveImage(0);
    setQty(1);
    setSelectedVariations({});
    fetch(`/api/products/${slug}${readLang() === 'en' ? '?lang=en' : ''}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.product) {
          setProduct(data.product);
          setRelated(data.related || []);
          // Keep the browser tab title in sync with the product (UX + sharing).
          // Arabic: prefer the curated SEO title so the tab matches the SERP
          // title; English falls back to the translated product name.
          document.title = `${
            lang === 'en' ? data.product.name : (data.product.metaTitle || data.product.name)
          } | ${lang === 'en' ? 'Mahal Shop' : 'محل شوب'}`;
          // record in recently-viewed rail
          pushRecentlyViewed({
            slug: data.product.slug,
            name: data.product.name,
            price: data.product.price,
            salePrice: data.product.salePrice,
            thumb: data.product.thumb || (data.product.images ? data.product.images.split(',')[0] : ''),
            id: data.product.id,
          });
          try {
            window.dispatchEvent(new Event('mahhl-rv'));
          } catch {
            /* noop */
          }
          // Track product_view event (fire and forget)
          trackEvent('product_view', { productId: data.product.id });
          // Facebook Pixel — ViewContent
          trackFB('ViewContent', {
            content_ids: [data.product.sku || data.product.id],
            content_name: data.product.name,
            content_type: 'product',
            value: data.product.salePrice || data.product.price,
            currency: 'KWD',
          });
          trackGA4('view_item', {
            currency: 'KWD',
            value: data.product.salePrice || data.product.price,
            items: [ga4Item({
              sku: data.product.sku,
              name: data.product.name,
              price: data.product.salePrice || data.product.price,
            })],
          });
          // Pre-select first variation values
          if (data.product.variations) {
            try {
              const parsed: Variation[] = JSON.parse(data.product.variations);
              const initial: Record<string, string> = {};
              parsed.forEach((v) => {
                if (v.values.length > 0) initial[v.label] = v.values[0];
              });
              setSelectedVariations(initial);
            } catch (e) {
              console.error('Failed to parse variations', e);
            }
          }
        } else {
          toast.error(t('p.notFound'));
          setView('shop');
        }
      })
      .catch(() => {
        toast.error(t('p.loadFail'));
        setView('shop');
      })
      .finally(() => setLoading(false));
  }, [slug, setView]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const images = product.images
    ? product.images.split(',').map((s) => s.trim()).filter(Boolean)
    : product.thumb
      ? [product.thumb]
      : [];

  const discount =
    product.price > product.salePrice
      ? Math.round(((product.price - product.salePrice) / product.price) * 100)
      : 0;

  let parsedVariations: Variation[] = [];
  if (product.variations) {
    try {
      parsedVariations = JSON.parse(product.variations);
    } catch {}
  }

  function handleAddToCart() {
    if (!product) return;
    const variationStr = Object.entries(selectedVariations)
      .map(([k, v]) => `${k}: ${v}`)
      .join('، ');
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        sku: product.sku,
        price: product.salePrice,
        image: images[activeImage] || product.thumb || '',
        variations: variationStr || undefined,
      },
      qty
    );
    toast.success(lang === 'en' ? `Added ${qty} × "${product.name}" to cart` : `تمت إضافة ${qty} × "${product.name}" إلى السلة`);
    openCart();
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <button onClick={() => setView('home')} className="hover:text-primary">
          {t('hdr.home')}
        </button>
        <ChevronLeft className="h-4 w-4" />
        <button onClick={() => setView('shop')} className="hover:text-primary">
          {t('p.products')}
        </button>
        {product.category && (
          <>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-foreground">{product.category.name}</span>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-square bg-white rounded-lg overflow-hidden border">
            {images[activeImage] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={images[activeImage]}
                alt={product.name}
                className="h-full w-full img-contain p-4"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
            {discount > 0 && (
              <Badge className="absolute top-3 right-3 bg-red-600 text-white">
                -{discount}%
              </Badge>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                    i === activeImage ? 'border-primary' : 'border-border hover:border-primary/50'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${t('p.products')} ${i + 1}`} className="h-full w-full img-contain p-0.5 bg-white" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          {product.category?.name && (
            <Badge variant="secondary">{product.category.name}</Badge>
          )}
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">
            {product.name}
          </h1>

          {product.isBestSeller && (
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-500 text-white">
                <Star className="h-3 w-3 ml-1" />
                {t('p.bestseller')}
              </Badge>
            </div>
          )}

          {/* Kuwait demand rank — research-based social proof */}
          {product.demandRank != null && product.demandRank <= 100 && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-yellow-500 to-amber-600 text-white px-3 py-1 text-xs font-extrabold w-fit shadow">
              <Flame className="h-3.5 w-3.5" />
              #{product.demandRank} {t('p.kwRank')}
            </div>
          )}

          {/* live viewers — real 24h view events */}
          {product.liveViewers != null && product.liveViewers > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              {t('m.liveViewers', { n: product.liveViewers })}
            </p>
          )}

          {/* Rating summary — clickable, scrolls to reviews */}
          {(reviewSummary.count > 0 || reviewSummary.soldCount > 0) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {reviewSummary.count > 0 && (
                <a
                  href="#reviews"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 hover:opacity-80"
                >
                  <StarsRow value={reviewSummary.average} />
                  <span className="font-semibold">{reviewSummary.average.toFixed(1)}</span>
                  <span className="text-muted-foreground underline decoration-dotted">
                    ({reviewSummary.count} {t('p.reviews')})
                  </span>
                </a>
              )}
              {reviewSummary.soldCount > 0 && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  {t('p.soldTimes', { n: reviewSummary.soldCount })}
                </span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">
              {formatKwd(product.salePrice)}
            </span>
            {discount > 0 && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatKwd(product.price)}
                </span>
                <Badge className="bg-red-600 text-white">
                  {t('p.save')} {discount}%
                </Badge>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2 text-sm">
            {product.quantity > 0 ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-700">{t('p.inStock')} ({product.quantity} {t('p.pieces')})</span>
                {product.quantity > 0 && product.quantity <= 5 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {t('p.lowStock')}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <span className="text-destructive">{t('p.oos')}</span>
              </>
            )}
          </div>

          {/* Shipping transparency — Baymard #1 abandonment reason is hidden costs */}
          <div className="rounded-lg border bg-muted/40 px-3.5 py-2.5 flex items-center gap-2.5 text-sm">
            <Truck className="h-5 w-5 text-primary shrink-0" />
            <p className="text-muted-foreground">
              {[t('p.shipping1')]
                .flatMap((s) => s.split('1 د.ك'))
                .reduce<React.ReactNode[]>((acc, part, i) => {
                  if (i > 0) acc.push(<b key={`b1-${i}`} className="text-foreground">{lang === 'en' ? '1 KWD' : '1 د.ك'}</b>);
                  const segs = part.split('30 د.ك');
                  segs.forEach((seg, j) => {
                    if (j > 0) acc.push(<b key={`b2-${i}-${j}`} className="text-foreground">{lang === 'en' ? '30 KWD' : '30 د.ك'}</b>);
                    const parts2 = seg.split(lang === 'en' ? 'FREE' : 'مجاني');
                    parts2.forEach((s2, k) => {
                      if (k > 0) acc.push(<b key={`b3-${i}-${j}-${k}`} className="text-foreground">{lang === 'en' ? 'FREE' : 'مجاني'}</b>);
                      if (s2) acc.push(<span key={`s-${i}-${j}-${k}`}>{s2}</span>);
                    });
                  });
                  return acc;
                }, [])}
            </p>
          </div>

          {/* Description */}
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {product.description || t('p.noDesc')}
            </p>
          </div>

          {/* Variations */}
          {parsedVariations.length > 0 && (
            <div className="space-y-3">
              {parsedVariations.map((v, idx) => (
                <div key={idx}>
                  <label className="text-sm font-medium block mb-2">{v.label}</label>
                  <div className="flex flex-wrap gap-2">
                    {v.values.map((val) => {
                      const selected = selectedVariations[v.label] === val;
                      // Parse color hex if available
                      const hexMatch = val.match(/=([#a-fA-F0-9]+)/);
                      const color = hexMatch ? hexMatch[1] : null;
                      const labelOnly = val.split('=')[0].trim();
                      return (
                        <button
                          key={val}
                          onClick={() =>
                            setSelectedVariations((prev) => ({
                              ...prev,
                              [v.label]: val,
                            }))
                          }
                          className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm transition-all ${
                            selected
                              ? 'border-primary bg-primary/10'
                              : 'hover:border-primary/50'
                          }`}
                        >
                          {color && (
                            <span
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: color }}
                            />
                          )}
                          {labelOnly}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity + Add to cart */}
          <div id="main-atc-block" className="flex items-center gap-3 pt-4">
            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{qty}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setQty((q) => Math.min(product.quantity || 99, q + 1))
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="lg"
              className="flex-1"
              disabled={product.quantity <= 0}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-5 w-5 ml-2" />
              {t('p.addToCart')} ({formatKwd(product.salePrice * qty)})
            </Button>
          </div>

          {/* AI Upsell */}
          <UpsellWidget context="product" productId={product.id} limit={3} />

          {/* SKU + features */}
          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-muted-foreground">
              SKU: <span className="font-mono">{product.sku}</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4 text-primary" />
                {t('p.delivery')}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                {t('p.warranty')}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary" />
                {t('p.cod')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Amazon-style: frequently bought together (real co-purchase data) */}
      <div className="mt-10">
        <BoughtTogether productId={product.id} />
      </div>

      {/* Customer reviews */}
      <div className="mt-10">
        <ReviewsSection slug={product.slug} />
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">{t('p.related')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {related.slice(0, 6).map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky mobile add-to-cart bar — appears once the main button scrolls
          out of view. Global best practice: thumb-zone, always-reachable CTA. */}
      {product.quantity > 0 && <StickyAtcBar
        price={product.salePrice * qty}
        qty={qty}
        onAdd={handleAddToCart}
      />}
    </div>
  );
}

function StickyAtcBar({
  price,
  qty,
  onAdd,
}: {
  price: number;
  qty: number;
  onAdd: () => void;
}) {
  const { t } = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // observe the quantity+CTA block rendered in the product info column
    const cta = document.getElementById('main-atc-block');
    if (!cta || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        setShow(!entries[0]?.isIntersecting);
      },
      { rootMargin: '-56px 0px 0px 0px' }
    );
    io.observe(cta);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (show) document.body.setAttribute('data-sticky-atc', '1');
    else document.body.removeAttribute('data-sticky-atc');
    return () => document.body.removeAttribute('data-sticky-atc');
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t bg-card/95 backdrop-blur shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="container px-4 py-2.5 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground truncate">
            {t('p.total')} ({qty} {t('p.pieces')})
          </p>
          <p className="text-lg font-extrabold text-primary leading-tight">
            {formatKwd(price)}
          </p>
        </div>
        <Button
          size="lg"
          onClick={onAdd}
          className="flex-1 max-w-[60%] h-12 text-base gap-2"
        >
          <ShoppingCart className="h-5 w-5" />
          {t('p.addToCart')}
        </Button>
      </div>
    </div>
  );
}
