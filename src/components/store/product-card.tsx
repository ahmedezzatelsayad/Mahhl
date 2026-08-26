'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/stores/app-store';
import { formatKwd } from '@/lib/utils/format';
import { ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/stores/cart-store';
import { toast } from 'sonner';
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
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const openProduct = useAppStore((s) => s.openProduct);
  const addItem = useCartStore((s) => s.addItem);
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

  function addToCart(e: React.MouseEvent) {
    e.stopPropagation();
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: (product as { sku?: string }).sku || product.slug,
      price: product.salePrice,
      image: imgUrl,
    });
    toast.success(`تمت إضافة "${product.name}" إلى السلة`);
  }

  return (
    <Card
      onClick={() => openProduct(product.slug)}
      className="card-lift group overflow-hidden border-border/60 hover:border-accent/50"
    >
      <div className="relative aspect-square overflow-hidden bg-muted/30">
        {imgUrl && !imgError ? (
           
          <img
            src={imgUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ShoppingCart className="h-12 w-12 opacity-30" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {discount > 0 && (
            <Badge className="bg-red-600 text-white hover:bg-red-700">
              -{discount}%
            </Badge>
          )}
          {product.isBestSeller && (
            <Badge className="btn-gold border-0 text-white hover:opacity-90">
              <Star className="h-3 w-3 ml-1" />
              الأكثر مبيعاً
            </Badge>
          )}
        </div>

        {product.quantity <= 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold">نفذ المخزون</span>
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
          disabled={product.quantity <= 0}
          onClick={addToCart}
        >
          <ShoppingCart className="h-4 w-4 ml-1" />
          أضف للسلة
        </Button>
      </div>
    </Card>
  );
}
