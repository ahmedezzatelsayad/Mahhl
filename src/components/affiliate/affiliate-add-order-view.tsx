'use client';

/**
 * AffiliateAddOrderView — أضف طلب لعميلك (نفس نموذج الـ checkout لكن مبسط
 * للمسوق): بيانات العميل + المنتجات والكميات + ملخص فوري (الإجمالي + عمولتك).
 */
import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatKwd } from '@/lib/utils/format';
import { toast } from 'sonner';
import { Search, Trash2, PlusCircle, CheckCircle2 } from 'lucide-react';
import { KUWAIT_GOVERNORATES } from '@/lib/commission-constants';

interface Picked {
  productId: string;
  name: string;
  price: number;
  commission: number;
  thumb: string | null;
  quantity: number;
}

export function AffiliateAddOrderView() {
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const affiliateUser = useAppStore((s) => s.affiliateUser);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Picked[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ orderNumber: string; total: number; commissionTotal: number } | null>(null);

  // product picker
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/affiliate/products?perPage=8&q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${affiliateToken || ''}` } }
        );
        const data = await res.json();
        setResults(data.products || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  }, [query, affiliateToken]);

  function addProduct(p: any) {
    setItems((prev) => {
      const found = prev.find((x) => x.productId === p.id);
      if (found) {
        return prev.map((x) =>
          x.productId === p.id ? { ...x, quantity: Math.min(20, x.quantity + 1) } : x
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          price: p.sellPrice ?? p.salePrice ?? p.price,
          commission: p.commission || 0,
          thumb: p.thumb,
          quantity: 1,
        },
      ];
    });
    setQuery('');
    setResults([]);
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const commissionTotal = items.reduce((s, i) => s + i.commission * i.quantity, 0);
  const shipping = subtotal >= 30 ? 0 : subtotal > 0 ? 1 : 0;
  const total = subtotal + shipping;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) {
      toast.error('أضف منتجاً واحداً على الأقل');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/affiliate/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${affiliateToken || ''}`,
        },
        body: JSON.stringify({
          customerName, phone, governorate, area, address, notes,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess({
          orderNumber: data.order.orderNumber,
          total: data.order.total,
          commissionTotal: data.order.commissionTotal || 0,
        });
        setItems([]);
        setCustomerName(''); setPhone(''); setGovernorate(''); setArea(''); setAddress(''); setNotes('');
        toast.success(`تم إنشاء الطلب #${data.order.orderNumber} 🎉`);
      } else {
        toast.error(data.error || 'فشل إنشاء الطلب');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setSaving(false);
    }
  }

  if (affiliateUser?.status && affiliateUser.status !== 'active') {
    return (
      <div className="p-4">
        <Card className="p-8 text-center space-y-2">
          <PlusCircle className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="font-bold">حسابك قيد المراجعة</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            تقدر تتصفح المنتجات والعمولات، وتقدر تضيف الطلبات بعد موافقة إدارة المنصة على حسابك.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl">
      <h1 className="text-xl font-bold">اضف طلب لعميلك</h1>
      <p className="text-xs text-muted-foreground">
        الطلب يدخل نفس نظام المنصة — تتابع حالته من «طلباتي» وتُحسب عمولتك تلقائياً عند التسليم.
      </p>

      {success && (
        <Card className="p-4 border-green-300 bg-green-50 text-green-900 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-5 w-5" />
            تم إنشاء الطلب #{success.orderNumber}
          </div>
          <div className="text-sm">
            الإجمالي {formatKwd(success.total)} — عمولتك المتوقعة {formatKwd(success.commissionTotal)}
          </div>
          <button className="text-xs underline" onClick={() => setSuccess(null)}>
            إضافة طلب جديد
          </button>
        </Card>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* customer info */}
        <Card className="p-4 space-y-3">
          <h2 className="font-bold text-sm">بيانات العميل</h2>
          <div>
            <Label className="mb-1 block">اسم العميل *</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          </div>
          <div>
            <Label className="mb-1 block">رقم الهاتف (8 أرقام) *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              dir="ltr"
              inputMode="numeric"
              placeholder="XXXXXXXX"
            />
          </div>
          <div>
            <Label className="mb-1 block">المحافظة *</Label>
            <Select value={governorate} onValueChange={setGovernorate} required>
              <SelectTrigger>
                <SelectValue placeholder="اختر المحافظة" />
              </SelectTrigger>
              <SelectContent>
                {[...KUWAIT_GOVERNORATES].map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block">المنطقة</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="مثال: السالمية" />
          </div>
          <div>
            <Label className="mb-1 block">العنوان بالتفصيل *</Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              rows={2}
              placeholder="القطعة، الشارع، المنزل، أقرب علامة..."
            />
          </div>
          <div>
            <Label className="mb-1 block">ملاحظات (اختياري)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </Card>

        {/* products + summary */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h2 className="font-bold text-sm">المنتجات</h2>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم أو الكود وأضف المنتج..."
                className="pr-9"
              />
              {searching && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  جاري البحث...
                </span>
              )}
              {results.length > 0 && (
                <div className="absolute z-20 mt-1 w-full border rounded-md bg-card shadow-lg max-h-72 overflow-auto">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="w-full flex items-center gap-2 p-2 hover:bg-accent text-right"
                      onClick={() => addProduct(r)}
                    >
                      {r.thumb ? (
                         
                        <img src={r.thumb} alt="" className="w-9 h-9 rounded object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{r.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatKwd(r.sellPrice)} · عمولة {formatKwd(r.commission)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                لم تضف منتجات بعد — ابحث أعلاه وأضف المنتجات
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((i) => (
                  <div key={i.productId} className="flex items-center gap-2 border rounded-md p-2">
                    {i.thumb ? (
                       
                      <img src={i.thumb} alt="" className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{i.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatKwd(i.price)} · عمولة {formatKwd(i.commission)}
                      </div>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={i.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.productId === i.productId
                              ? { ...x, quantity: Math.max(1, Math.min(20, Number(e.target.value) || 1)) }
                              : x
                          )
                        )
                      }
                      className="w-16 h-8 text-center text-xs"
                    />
                    <button
                      type="button"
                      className="text-destructive hover:text-destructive/80"
                      onClick={() => setItems((prev) => prev.filter((x) => x.productId !== i.productId))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4 space-y-2 text-sm">
            <h2 className="font-bold text-sm mb-1">الملخص</h2>
            <div className="flex justify-between">
              <span className="text-muted-foreground">المجموع</span>
              <span>{formatKwd(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الشحن</span>
              <span>{shipping === 0 ? 'مجاني' : formatKwd(shipping)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>الإجمالي (الدفع عند الاستلام)</span>
              <span>{formatKwd(total)}</span>
            </div>
            <div className="flex justify-between font-bold text-primary">
              <span>عمولتك المتوقعة</span>
              <span>{formatKwd(commissionTotal)}</span>
            </div>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={saving || !items.length}>
            {saving ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
          </Button>
        </div>
      </form>
    </div>
  );
}
