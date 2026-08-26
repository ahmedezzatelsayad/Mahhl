'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { ProductCard } from '@/components/store/product-card';
import { UpsellWidget } from '@/components/store/upsell-widget';
import { BoughtTogether } from '@/components/store/bought-together';
import { trackEvent } from '@/lib/behavior-tracker';
import { trackFB } from '@/lib/facebook-pixel';
import { trackGA4, ga4Item } from '@/lib/ga4';

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

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});

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
    fetch(`/api/products/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.product) {
          setProduct(data.product);
          setRelated(data.related || []);
          // Keep the browser tab title in sync with the product (UX + sharing)
          document.title = `${data.product.name} | محل شوب`;
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
          toast.error('المنتج غير موجود');
          setView('shop');
        }
      })
      .catch(() => {
        toast.error('فشل تحميل المنتج');
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
    toast.success(`تمت إضافة ${qty} × "${product.name}" إلى السلة`);
    openCart();
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <button onClick={() => setView('home')} className="hover:text-primary">
          الرئيسية
        </button>
        <ChevronLeft className="h-4 w-4" />
        <button onClick={() => setView('shop')} className="hover:text-primary">
          المنتجات
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
                  <img src={url} alt={`صورة ${i + 1}`} className="h-full w-full img-contain p-0.5 bg-white" />
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
                الأكثر مبيعاً
              </Badge>
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
                  وفّر {discount}%
                </Badge>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2 text-sm">
            {product.quantity > 0 ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-700">متوفر ({product.quantity} قطعة)</span>
              </>
            ) : (
              <>
                <span className="text-destructive">نفذ المخزون</span>
              </>
            )}
          </div>

          {/* Description */}
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {product.description || 'لا يوجد وصف متاح لهذا المنتج.'}
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
          <div className="flex items-center gap-3 pt-4">
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
              أضف للسلة ({formatKwd(product.salePrice * qty)})
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
                توصيل خلال 2-5 أيام
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                ضمان استبدال 7 أيام
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary" />
                دفع عند الاستلام
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Amazon-style: frequently bought together (real co-purchase data) */}
      <div className="mt-10">
        <BoughtTogether productId={product.id} />
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">منتجات ذات صلة</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {related.slice(0, 6).map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
