'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAppStore } from '@/lib/stores/app-store';
import { formatKwd } from '@/lib/utils/format';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { UpsellWidget } from '@/components/store/upsell-widget';
import { trackEvent } from '@/lib/behavior-tracker';
import { useEffect } from 'react';

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity } = useCartStore();
  const subtotal = useCartStore((s) => s.getSubtotal());
  const setView = useAppStore((s) => s.setView);

  // Track cart_open when sheet opens
  useEffect(() => {
    if (isOpen) {
      trackEvent('cart_open', { metadata: { itemsCount: items.length } });
    }
  }, [isOpen, items.length]);

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent side="left" className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            سلة التسوق ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-muted-foreground text-center">
              سلتك فارغة.
              <br />
              ابدأ التسوق الآن!
            </p>
            <Button
              onClick={() => {
                closeCart();
                setView('shop');
              }}
            >
              تصفح المنتجات
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {items.map((item, i) => (
                <div
                  key={`${item.productId}-${i}`}
                  className="flex gap-3 pb-3 border-b border-border/50 last:border-0"
                >
                  <div className="w-20 h-20 flex-shrink-0 bg-muted/30 rounded-md overflow-hidden">
                    {item.image && (
                       
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium line-clamp-2 mb-1">
                      {item.name}
                    </h4>
                    {item.variations && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {item.variations}
                      </p>
                    )}
                    <p className="text-sm font-bold text-primary">
                      {formatKwd(item.price)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border rounded-md">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1, item.variations)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1, item.variations)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          removeItem(item.productId, item.variations);
                          toast('تم حذف المنتج من السلة');
                          trackEvent('remove_from_cart', { productId: item.productId });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-left">
                    {formatKwd(item.price * item.quantity)}
                  </div>
                </div>
              ))}

              {/* AI Upsell */}
              {items.length > 0 && (
                <div className="pt-2">
                  <UpsellWidget context="cart" limit={2} compact />
                </div>
              )}
            </div>

            <div className="border-t p-4 space-y-3">
              <div className="flex justify-between font-bold">
                <span>المجموع:</span>
                <span className="text-primary">{formatKwd(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                * الشحن يُحسب عند الدفع
              </p>
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  closeCart();
                  setView('checkout');
                }}
              >
                إتمام الطلب
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  closeCart();
                  setView('cart');
                }}
              >
                عرض السلة كاملة
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
