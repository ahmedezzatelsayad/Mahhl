'use client';

import { useCartStore } from '@/lib/stores/cart-store';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { formatKwd } from '@/lib/utils/format';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function CartView() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const subtotal = useCartStore((s) => s.getSubtotal());
  const setView = useAppStore((s) => s.setView);
  const shipping = subtotal > 50 ? 0 : 2;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <ShoppingBag className="h-20 w-20 text-muted-foreground/30" />
          <h1 className="text-2xl font-bold">سلة التسوق فارغة</h1>
          <p className="text-muted-foreground">
            لم تقم بإضافة أي منتجات بعد. ابدأ التسوق الآن!
          </p>
          <Button size="lg" onClick={() => setView('shop')}>
            تصفح المنتجات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-5">سلة التسوق ({items.length} منتج)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item, i) => (
            <div
              key={`${item.productId}-${i}`}
              className="flex gap-4 p-4 border rounded-lg bg-card"
            >
              <div className="w-24 h-24 flex-shrink-0 bg-white rounded-md overflow-hidden border">
                {item.image && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full img-contain p-1"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium line-clamp-2 mb-1">{item.name}</h3>
                {item.variations && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {item.variations}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mb-2">
                  SKU: {item.sku}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity - 1, item.variations)
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-10 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity + 1, item.variations)
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      removeItem(item.productId, item.variations);
                      toast('تم حذف المنتج');
                    }}
                  >
                    <Trash2 className="h-4 w-4 ml-1" />
                    حذف
                  </Button>
                </div>
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-primary">
                  {formatKwd(item.price * item.quantity)}
                </p>
                {item.quantity > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {formatKwd(item.price)} للقطعة
                  </p>
                )}
              </div>
            </div>
          ))}

          <Button variant="ghost" onClick={() => setView('shop')}>
            <ArrowLeft className="h-4 w-4 ml-1" />
            متابعة التسوق
          </Button>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg p-5 bg-card sticky top-20">
            <h2 className="font-bold mb-4">ملخص الطلب</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الفرعي:</span>
                <span className="font-medium">{formatKwd(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الشحن:</span>
                {shipping === 0 ? (
                  <span className="text-green-600 font-medium">مجاني</span>
                ) : (
                  <span className="font-medium">{formatKwd(shipping)}</span>
                )}
              </div>
              {shipping > 0 && (
                <p className="text-xs text-muted-foreground bg-accent/50 p-2 rounded">
                  💡 أضف {formatKwd(50 - subtotal)} للحصول على شحن مجاني!
                </p>
              )}
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>الإجمالي:</span>
                <span className="text-primary">{formatKwd(total)}</span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full mt-4"
              onClick={() => setView('checkout')}
            >
              متابعة الدفع
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
