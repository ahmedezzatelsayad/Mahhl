'use client';

import { useEffect, useRef, useState } from 'react';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useT } from '@/lib/i18n';
import { formatKwd } from '@/lib/utils/format';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, Loader2, ShoppingBag, KeyRound, Truck, ShieldCheck } from 'lucide-react';
import { UpsellWidget } from '@/components/store/upsell-widget';
import { trackEvent } from '@/lib/behavior-tracker';
import { trackFB } from '@/lib/facebook-pixel';
import { trackGA4, ga4Item } from '@/lib/ga4';
import { getUtmForOrder, captureUtm } from '@/lib/utm';
import { normalizeKwPhone, isValidKwPhone } from '@/lib/kw-phone';

const KUWAIT_GOVERNORATES = [
  'محافظة العاصمة',
  'محافظة حولي',
  'محافظة الفروانية',
  'محافظة الجهراء',
  'محافظة الأحمدي',
  'محافظة مبارك الكبير',
];

export function CheckoutView() {
  const { t, lang } = useT();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const setView = useAppStore((s) => s.setView);
  const setLastOrder = useAppStore((s) => s.setLastOrder);
  const customer = useAppStore((s) => s.customer);
  const customerToken = useAppStore((s) => s.customerToken);

  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const submitLock = useRef(false); // hard double-submit lock
  const [shippingCfg, setShippingCfg] = useState({ price: 1, freeThreshold: 30, note: '' });
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
  const [prefilled, setPrefilled] = useState(false);

  // Prefill from the logged-in customer's account (حسابي)
  useEffect(() => {
    if (!customer || prefilled) return;
    fetch('/api/customer/me', {
      headers: { Authorization: `Bearer ${customerToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.customer) {
          setForm((prev) => ({
            ...prev,
            customerName: data.customer.name || prev.customerName,
            phone: data.customer.phone || prev.phone,
            email: data.customer.email || prev.email,
            governorate: data.customer.city || prev.governorate,
            area: data.customer.area || prev.area,
            address: data.customer.address || prev.address,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setPrefilled(true));
  }, [customer, customerToken, prefilled]);

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
    captureUtm(); // make sure attribution exists even on a direct checkout entry
    trackEvent('checkout_start', { metadata: { itemsCount: items.length, subtotal } });
    if (items.length > 0) {
      const estShip =
        shippingCfg.freeThreshold > 0 && subtotal >= shippingCfg.freeThreshold
          ? 0
          : shippingCfg.price;
      // Facebook Pixel — InitiateCheckout (with cart contents)
      trackFB('InitiateCheckout', {
        value: subtotal + estShip,
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
      // GA4 — begin_checkout
      trackGA4('begin_checkout', {
        currency: 'KWD',
        value: subtotal + estShip,
        num_items: items.reduce((sum, i) => sum + i.quantity, 0),
        items: items.map((i) => ga4Item(i)),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shipping = shippingCfg.freeThreshold > 0 && subtotal >= shippingCfg.freeThreshold ? 0 : shippingCfg.price;
  const total = subtotal + shipping;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLock.current) return; // double-click / Enter race
    if (items.length === 0) {
      toast.error('السلة فارغة');
      return;
    }
    if (!form.customerName.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error('يرجى تعبئة البيانات المطلوبة');
      return;
    }
    const normalizedPhone = normalizeKwPhone(form.phone);
    if (!isValidKwPhone(normalizedPhone)) {
      toast.error('رقم الهاتف غير صحيح — اكتب رقم كويتي 8 أرقام يبدأ بـ 5 أو 6 أو 9');
      return;
    }
    submitLock.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          phone: normalizedPhone,
          website: honeypot, // honeypot — must stay empty
          ...getUtmForOrder(),
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            variations: i.variations,
            // NOTE: price/name/sku are re-fetched server-side — the
            // client copies are display-only and can never be trusted.
          })),
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        if (data.duplicate) {
          // same order already received seconds ago — don't create noise
          toast.info('استلمنا طلبك هذا من قبل — رقم الطلب نفسه');
        } else {
          toast.success('تم إنشاء طلبك بنجاح!');
        }
        setLastOrder(data.order.orderNumber);
        clearCart();
        setView('order-success');
        // persist account hint for the success page
        if (data.accountCreated && data.loginHint) {
          try {
            sessionStorage.setItem('last-order-hint', data.loginHint);
          } catch {}
        } else {
          try {
            sessionStorage.removeItem('last-order-hint');
          } catch {}
        }
        // Track successful checkout
        trackEvent('checkout_complete', {
          metadata: { orderId: data.order.id, total: data.order.total },
        });
        // GA4 — purchase
        trackGA4('purchase', {
          currency: 'KWD',
          value: data.order.total,
          transaction_id: data.order.orderNumber,
          shipping: data.order.shipping,
          num_items: (data.order.items || []).reduce((s: number, i: any) => s + i.quantity, 0),
          items: (data.order.items || []).map((i: any) => ga4Item(i)),
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
      submitLock.current = false;
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

      <h1 className="text-2xl font-bold mb-5">{t('ck.title')}</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="mb-4">سلتك فارغة</p>
          <Button onClick={() => setView('shop')}>تصفح المنتجات</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
          {/* Honeypot — invisible to humans, bots fill it and get rejected */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -top-[9999px] h-0 w-0 opacity-0"
          />
          {/* Form */}
          <div className="lg:col-span-2 space-y-5">
            <div className="border rounded-lg p-5 bg-card space-y-4">
              <h2 className="font-bold">بيانات العميل</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">
                    {t('ck.name')} <span className="text-destructive">*</span>
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
                    {t('ck.phone')} <span className="text-destructive">*</span>
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
                  <Label className="mb-1 block">{t('ck.gov')}</Label>
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
                  <Label className="mb-1 block">{t('ck.area')}</Label>
                  <Input
                    value={form.area}
                    onChange={(e) => update('area', e.target.value)}
                    placeholder="مثال: السالمية"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1 block">
                  {t('ck.address')} <span className="text-destructive">*</span>
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
                <Label className="mb-1 block">{t('ck.notes')}</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="أي ملاحظات إضافية للطلب..."
                  rows={2}
                />
              </div>
            </div>

            <div className="border rounded-lg p-5 bg-card space-y-4">
              <h2 className="font-bold">{t('ck.payment')}</h2>
              <RadioGroup
                value={form.paymentMethod}
                onValueChange={(v) => update('paymentMethod', v)}
              >
                <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-accent/50">
                  <RadioGroupItem value="cod" className="mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">{lang === 'en' ? 'Cash on Delivery (K Cash)' : 'الدفع عند الاستلام (K Cash)'}</p>
                    <p className="text-sm text-muted-foreground">
                      {lang === 'en' ? 'Pay cash when your order arrives. Available in all governorates.' : 'ادفع نقداً عند استلام طلبك. متاح لجميع المحافظات.'}
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
              <h2 className="font-bold mb-4">{t('ck.summary')}</h2>
              <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
                {items.map((i, idx) => (
                  <div key={idx} className="flex gap-2 text-sm">
                    <div className="w-12 h-12 flex-shrink-0 bg-white rounded-md overflow-hidden border">
                      {i.image && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={i.image}
                          alt={i.name}
                          className="h-full w-full img-contain p-0.5"
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
                  t('ck.place')
                )}
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
                تدفع فقط <b>عند الاستلام</b> — نتصل بك لتأكيد الطلب قبل شحنه، بدون أي رسوم مقدمة
              </p>

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
  const { t } = useT();
  const lastOrderId = useAppStore((s) => s.lastOrderId);
  const setView = useAppStore((s) => s.setView);
  // this view only renders client-side after checkout — safe to read sessionStorage lazily
  const [loginHint] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem('last-order-hint');
    } catch {
      return null;
    }
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center gap-4 py-10 text-center max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-green-700">تم استلام طلبك بنجاح!</h1>
        <p className="text-muted-foreground leading-relaxed">
          شكراً لتسوقك من محل شوب. سيتواصل معك فريقنا لتأكيد الطلب، وطلبك يُشحن
          تلقائياً كل يوم الساعة 10 صباحاً.
        </p>
        {lastOrderId && (
          <div className="bg-muted/40 px-4 py-2 rounded-md text-sm">
            رقم الطلب: <span className="font-mono font-bold" dir="ltr">{lastOrderId}</span>
          </div>
        )}

        {/* arrival promise */}
        <div className="flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/25 px-4 py-2.5 text-sm w-full">
          <Truck className="h-4 w-4 text-gold-deep shrink-0" />
          <span className="font-medium">سيصل في الميعاد المنسق مع خدمة العملاء والمندوب</span>
        </div>

        {/* auto-created account */}
        {loginHint && (
          <div className="rounded-lg border border-green-600/30 bg-green-50 text-right px-4 py-3 w-full space-y-1.5">
            <p className="flex items-center gap-1.5 font-bold text-sm text-green-800">
              <KeyRound className="h-4 w-4" />
              انشأ حسابك تلقائياً 🎉
            </p>
            <p className="text-[13px] leading-6 text-green-900/80">{loginHint}</p>
            <Button
              size="sm"
              variant="outline"
              className="border-green-600/40 text-green-800 hover:bg-green-50"
              onClick={() => setView('account')}
            >
              ادخل حسابك الآن
            </Button>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <Button onClick={() => setView('track-order')} className="btn-gold border-0">
            <Truck className="h-4 w-4 ml-1" />
            تتبع طلبك
          </Button>
          <Button onClick={() => setView('home')} variant="outline">
            الصفحة الرئيسية
          </Button>
          <Button onClick={() => setView('shop')} variant="ghost">
            متابعة التسوق
          </Button>
        </div>
      </div>
    </div>
  );
}
