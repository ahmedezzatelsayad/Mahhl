'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatKwd } from '@/lib/utils/format';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, Loader2, ShoppingBag } from 'lucide-react';
import { UpsellWidget } from '@/components/store/upsell-widget';
import { trackEvent } from '@/lib/behavior-tracker';
import { trackFB } from '@/lib/facebook-pixel';

const KUWAIT_GOVERNORATES = [
  'محافظة العاصمة',
  'محافظة حولي',
  'محافظة الفروانية',
  'محافظة الجهراء',
  'محافظة الأحمدي',
  'محافظة مبارك الكبير',
];

export function CheckoutView() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const setView = useAppStore((s) => s.setView);
  const setLastOrder = useAppStore((s) => s.setLastOrder);

  const [loading, setLoading] = useState(false);
  const [shippingCfg, setShippingCfg] = useState({ price: 2, freeThreshold: 50, note: '' });
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    governorate: KUWAIT_GOVERNORATES[0],
    area: '',
    address: '',
    notes: '',
    paymentMethod: 'cod',
  });

  // Load admin-configured shipping settings
  useEffect(() => {
    fetch('/api/settings/shipping')
      .then((r) => r.json())
      .then((s) => {
        if (s && typeof s.price === 'number') {
          setShippingCfg({ price: s.price, freeThreshold: s.freeThreshold, note: s.note || '' });
        }
      })
      .catch(() => {});
  }, []);

  // Track checkout_start once on mount
  useEffect(() => {
    trackEvent('checkout_start', { metadata: { itemsCount: items.length, subtotal } });
    // Facebook Pixel — InitiateCheckout (with cart contents)
    if (items.length > 0) {
      trackFB('InitiateCheckout', {
        value: subtotal + (subtotal >= 50 ? 0 : 2),
        currency: 'KWD',
        content_type: 'product',
        content_ids: items.map((i) => i.sku || i.productId),
        contents: items.map((i) => ({
          id: i.sku || i.productId,
          quantity: i.quantity,
          item_price: i.price,
        })),
        num_items: items.reduce((sum, i) => sum + i.quantity, 0),
      });
    }
  }, [items.length, subtotal]);

  const shipping = shippingCfg.freeThreshold > 0 && subtotal >= shippingCfg.freeThreshold ? 0 : shippingCfg.price;
  const total = subtotal + shipping;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('السلة فارغة');
      return;
    }
    if (!form.customerName.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error('يرجى تعبئة البيانات المطلوبة');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            sku: i.sku,
            price: i.price,
            quantity: i.quantity,
            image: i.image,
            variations: i.variations,
          })),
          shipping,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLastOrder(data.order.orderNumber);
        clearCart();
        setView('order-success');
        toast.success('تم إنشاء طلبك بنجاح!');
        // Track successful checkout
        trackEvent('checkout_complete', {
          metadata: { orderId: data.order.id, total: data.order.total },
        });
        // Facebook Pixel — Purchase (highest-value conversion event)
        // Phone goes only to OUR server, which hashes it (SHA-256) before Meta.
        trackFB(
          'Purchase',
          {
            value: data.order.total,
            currency: 'KWD',
            order_id: data.order.orderNumber,
            content_type: 'product',
            content_ids: items.map((i) => i.sku || i.productId),
            contents: items.map((i) => ({
              id: i.sku || i.productId,
              quantity: i.quantity,
              item_price: i.price,
            })),
            num_items: items.reduce((sum, i) => sum + i.quantity, 0),
          },
          { phone: form.phone }
        );
      } else {
        toast.error(data.error || 'فشل إنشاء الطلب');
      }
    } catch (e: any) {
      toast.error(e.message || 'فشل الاتصال');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <button
        onClick={() => setView('cart')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        العودة للسلة
      </button>

      <h1 className="text-2xl font-bold mb-5">إتمام الطلب</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="mb-4">سلتك فارغة</p>
          <Button onClick={() => setView('shop')}>تصفح المنتجات</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-5">
            <div className="border rounded-lg p-5 bg-card space-y-4">
              <h2 className="font-bold">بيانات العميل</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">
                    الاسم الكامل <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.customerName}
                    onChange={(e) => update('customerName', e.target.value)}
                    required
                    placeholder="مثال: أحمد محمد"
                  />
                </div>
                <div>
                  <Label className="mb-1 block">
                    رقم الهاتف <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    required
                    placeholder="5xxxxxxxx"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="mb-1 block">البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-5 bg-card space-y-4">
              <h2 className="font-bold">عنوان التوصيل</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">المحافظة</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                    value={form.governorate}
                    onChange={(e) => update('governorate', e.target.value)}
                  >
                    {KUWAIT_GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block">المنطقة</Label>
                  <Input
                    value={form.area}
                    onChange={(e) => update('area', e.target.value)}
                    placeholder="مثال: السالمية"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1 block">
                  العنوان التفصيلي <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  required
                  placeholder="الشارع، رقم المبنى، رقم الدور..."
                  rows={3}
                />
              </div>
              <div>
                <Label className="mb-1 block">ملاحظات الطلب</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="أي ملاحظات إضافية للطلب..."
                  rows={2}
                />
              </div>
            </div>

            <div className="border rounded-lg p-5 bg-card space-y-4">
              <h2 className="font-bold">طريقة الدفع</h2>
              <RadioGroup
                value={form.paymentMethod}
                onValueChange={(v) => update('paymentMethod', v)}
              >
                <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-accent/50">
                  <RadioGroupItem value="cod" className="mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">الدفع عند الاستلام (K Cash)</p>
                    <p className="text-sm text-muted-foreground">
                      ادفع نقداً عند استلام طلبك. متاح لجميع المحافظات.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-accent/50 opacity-50">
                  <RadioGroupItem value="card" disabled className="mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">بطاقة بنكية (قريباً)</p>
                    <p className="text-sm text-muted-foreground">
                      Visa / Mastercard - سيتم توفيرها قريباً
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-5 bg-card sticky top-20">
              <h2 className="font-bold mb-4">ملخص الطلب</h2>
              <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
                {items.map((i, idx) => (
                  <div key={idx} className="flex gap-2 text-sm">
                    <div className="w-12 h-12 flex-shrink-0 bg-muted/30 rounded-md overflow-hidden">
                      {i.image && (
                         
                        <img
                          src={i.image}
                          alt={i.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.quantity} × {formatKwd(i.price)}
                      </p>
                    </div>
                    <p className="font-medium">{formatKwd(i.price * i.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي:</span>
                  <span>{formatKwd(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الشحن:</span>
                  {shipping === 0 ? (
                    <span className="text-green-600">مجاني</span>
                  ) : (
                    <span>{formatKwd(shipping)}</span>
                  )}
                </div>
                {shipping > 0 && shippingCfg.freeThreshold > 0 && (
                  <p className="text-xs text-muted-foreground">
                    أضف بقيمة {formatKwd(Math.max(0, shippingCfg.freeThreshold - subtotal))} للحصول على شحن مجاني
                  </p>
                )}
                {shippingCfg.note && (
                  <p className="text-xs text-muted-foreground">{shippingCfg.note}</p>
                )}
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>الإجمالي:</span>
                  <span className="text-primary">{formatKwd(total)}</span>
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full mt-4" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري إنشاء الطلب...
                  </>
                ) : (
                  'تأكيد الطلب'
                )}
              </Button>

              {/* Last-chance AI upsell */}
              <div className="mt-4">
                <UpsellWidget context="checkout" limit={2} compact />
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export function OrderSuccessView() {
  const lastOrderId = useAppStore((s) => s.lastOrderId);
  const setView = useAppStore((s) => s.setView);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-green-700">تم استلام طلبك بنجاح!</h1>
        <p className="text-muted-foreground">
          شكراً لتسوقك من محل شوب. سيتواصل معك فريقنا قريباً لتأكيد الطلب.
        </p>
        {lastOrderId && (
          <div className="bg-muted/30 px-4 py-2 rounded-md text-sm">
            رقم الطلب: <span className="font-mono font-bold">{lastOrderId}</span>
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <Button onClick={() => setView('home')} variant="outline">
            الصفحة الرئيسية
          </Button>
          <Button onClick={() => setView('shop')}>متابعة التسوق</Button>
        </div>
      </div>
    </div>
  );
}
