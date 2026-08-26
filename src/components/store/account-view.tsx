'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  User, LogIn, LogOut, Package, Heart, ShoppingCart, Lock,
  KeyRound, Loader2, ChevronLeft, MessageCircle,
} from 'lucide-react';
import { OrderCard, TrackOrder } from '@/components/store/order-tracking';
import { useBrand, waHref } from '@/components/store/header';

const KUWAIT_GOVERNORATES = [
  'محافظة العاصمة',
  'محافظة حولي',
  'محافظة الفروانية',
  'محافظة الجهراء',
  'محافظة الأحمدي',
  'محافظة مبارك الكبير',
];

type Tab = 'orders' | 'profile' | 'security';

export function AccountView() {
  const customer = useAppStore((s) => s.customer);
  const customerToken = useAppStore((s) => s.customerToken);
  const loginCustomer = useAppStore((s) => s.loginCustomer);
  const logoutCustomer = useAppStore((s) => s.logoutCustomer);
  const setView = useAppStore((s) => s.setView);
  const brand = useBrand();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);

  // login form
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  // register form — name + phone + address only (Kuwaiti-simple)
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: KUWAIT_GOVERNORATES[0],
    area: '',
  });

  // dashboard
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<TrackOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [profile, setProfile] = useState({ name: '', phone: '', address: '', area: '', city: '' });
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });

  const authHeaders = { Authorization: `Bearer ${customerToken || ''}` };

  // load my orders + profile
  useEffect(() => {
    if (!customer || !customerToken) return;
    setOrdersLoading(true);
    Promise.all([
      fetch('/api/customer/orders', { headers: authHeaders }).then((r) => r.json()),
      fetch('/api/customer/me', { headers: authHeaders }).then((r) => r.json()),
    ])
      .then(([ordersData, meData]) => {
        setOrders(ordersData.orders || []);
        if (meData.customer) {
          setProfile({
            name: meData.customer.name || '',
            phone: meData.customer.phone || '',
            address: meData.customer.address || '',
            area: meData.customer.area || '',
            city: meData.customer.city || '',
          });
        }
      })
      .catch(() => toast.error('فشل تحميل بياناتك'))
      .finally(() => setOrdersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, customerToken]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (res.ok) {
        loginCustomer(data.customer, data.token);
        toast.success(`هلا ${data.customer.name.split(' ')[0]}! 👋`);
      } else {
        toast.error(data.error || 'فشل الدخول');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });
      const data = await res.json();
      if (res.ok) {
        loginCustomer(data.customer, data.token);
        toast.success(data.message, { duration: 7000 });
      } else {
        toast.error(data.error || 'فشل إنشاء الحساب');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/customer/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          name: profile.name,
          address: profile.address,
          area: profile.area,
          city: profile.city,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'تم التحديث');
        if (data.customer) {
          loginCustomer(data.customer, customerToken!);
        }
      } else {
        toast.error(data.error || 'فشل التحديث');
      }
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passForm.next !== passForm.confirm) {
      toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/customer/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          currentPassword: passForm.current,
          newPassword: passForm.next,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('تم تغيير كلمة المرور بنجاح ✅');
        setPassForm({ current: '', next: '', confirm: '' });
        if (data.token) loginCustomer(data.customer, data.token);
      } else {
        toast.error(data.error || 'فشل التغيير');
      }
    } finally {
      setBusy(false);
    }
  }

  // ==================== LOGGED-IN DASHBOARD ====================
  if (customer) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* header */}
        <div className="rounded-2xl bg-primary text-primary-foreground p-6 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 hero-glow" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full btn-gold text-lg font-extrabold">
                {customer.name.charAt(0)}
              </span>
              <div>
                <h1 className="text-xl font-extrabold">هلا {customer.name.split(' ')[0]} 👋</h1>
                <p className="text-xs text-primary-foreground/60" dir="ltr">
                  {customer.phone}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => setView('wishlist')}>
                <Heart className="h-4 w-4" /> المفضلة
              </Button>
              <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => setView('cart')}>
                <ShoppingCart className="h-4 w-4" /> السلة
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10" onClick={logoutCustomer}>
                <LogOut className="h-4 w-4" /> خروج
              </Button>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-2 mb-5 border-b">
          {([
            ['orders', 'طلباتي', Package],
            ['profile', 'بياناتي', User],
            ['security', 'كلمة المرور', KeyRound],
          ] as [Tab, string, typeof Package][]).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                tab === key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {tab === 'orders' && (
          <div className="space-y-4">
            {ordersLoading ? (
              <div className="text-center py-12 text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> جاري تحميل طلباتك...
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 border rounded-xl">
                <Package className="h-14 w-14 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">ما عندك طلبات بعد</p>
                <Button onClick={() => setView('shop')}>ابدأ التسوق</Button>
              </div>
            ) : (
              orders.map((o) => <OrderCard key={o.orderNumber} order={o} />)
            )}
          </div>
        )}

        {tab === 'profile' && (
          <form onSubmit={saveProfile} className="border rounded-xl bg-card p-5 space-y-4 max-w-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block">الاسم</Label>
                <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
              </div>
              <div>
                <Label className="mb-1 block">رقم الهاتف (المعروف)</Label>
                <Input value={profile.phone} dir="ltr" disabled className="bg-muted/40" />
              </div>
              <div>
                <Label className="mb-1 block">المحافظة</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                >
                  {KUWAIT_GOVERNORATES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block">المنطقة</Label>
                <Input value={profile.area} onChange={(e) => setProfile({ ...profile, area: e.target.value })} placeholder="مثال: السالمية" />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">العنوان</Label>
              <Textarea value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>حفظ البيانات</Button>
            </div>
          </form>
        )}

        {tab === 'security' && (
          <form onSubmit={changePassword} className="border rounded-xl bg-card p-5 space-y-4 max-w-xl">
            <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              كلمة المرور الافتراضية هي <b>رقم هاتفك</b> — ننصحك تغييرها لكلمة خاصة فيك.
            </div>
            <div>
              <Label className="mb-1 block">كلمة المرور الحالية</Label>
              <Input
                type="password" dir="ltr" required
                value={passForm.current}
                onChange={(e) => setPassForm({ ...passForm, current: e.target.value })}
                placeholder="رقم هاتفك إذا ما غيّرتها"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block">كلمة المرور الجديدة</Label>
                <Input type="password" dir="ltr" required minLength={6} value={passForm.next} onChange={(e) => setPassForm({ ...passForm, next: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">تأكيد الجديدة</Label>
                <Input type="password" dir="ltr" required minLength={6} value={passForm.confirm} onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>تغيير كلمة المرور</Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // ==================== LOGIN / REGISTER ====================
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <User className="h-8 w-8 text-gold-deep" />
          </div>
          <h1 className="text-2xl font-extrabold">حسابي</h1>
          <p className="text-muted-foreground text-sm mt-1">
            سجل دخولك وتابع طلباتك — أو أنشئ حسابك بنقرة واحدة
          </p>
        </div>

        {/* mode switch */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/40 mb-5">
          <button
            onClick={() => setMode('login')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
              mode === 'login' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LogIn className="h-4 w-4" /> تسجيل الدخول
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
              mode === 'register' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-4 w-4" /> حساب جديد
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="border rounded-xl p-6 bg-card space-y-4">
            <div>
              <Label className="mb-1 block">رقم الهاتف</Label>
              <Input
                type="tel" dir="ltr" required placeholder="5xxxxxxxx"
                value={loginForm.phone}
                onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block">كلمة المرور</Label>
              <Input
                type="password" dir="ltr" required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="رقم هاتفك (إذا ما غيّرتها)"
              />
            </div>
            <Button type="submit" className="w-full btn-gold border-0" size="lg" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'دخول'}
            </Button>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              أول مرة تدخل؟ كلمة المرور هي <b>رقم هاتفك نفسه</b> — سوّيت طلب من قبل؟
              حسابك جاهز تلقائياً 🔑
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="border rounded-xl p-6 bg-card space-y-4">
            <div>
              <Label className="mb-1 block">الاسم الكامل <span className="text-destructive">*</span></Label>
              <Input required placeholder="مثال: عبدالله الأحمد" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">رقم الهاتف <span className="text-destructive">*</span></Label>
              <Input type="tel" dir="ltr" required placeholder="5xxxxxxxx" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">المحافظة</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm"
                  value={regForm.city}
                  onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                >
                  {KUWAIT_GOVERNORATES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block">المنطقة</Label>
                <Input placeholder="السالمية" value={regForm.area} onChange={(e) => setRegForm({ ...regForm, area: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">العنوان <span className="text-destructive">*</span></Label>
              <Textarea required rows={2} placeholder="الشارع، المبنى، الدور..." value={regForm.address} onChange={(e) => setRegForm({ ...regForm, address: e.target.value })} />
            </div>
            <div className="rounded-lg bg-accent/10 border border-accent/25 px-3 py-2.5 text-xs leading-relaxed text-foreground">
              <Lock className="h-3.5 w-3.5 inline ml-1 text-gold-deep" />
              كلمة مرورك ستكون <b>رقم هاتفك نفسه</b> وتظهر لك بعد التسجيل — تقدر تغيّرها بعدين من صفحة كلمة المرور.
            </div>
            <Button type="submit" className="w-full btn-gold border-0" size="lg" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إنشاء حسابي'}
            </Button>
          </form>
        )}

        {/* quick links for guests */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          <button onClick={() => setView('track-order')} className="flex items-center gap-1 text-muted-foreground hover:text-accent cursor-pointer">
            <ChevronLeft className="h-4 w-4" /> تتبع طلب بدون تسجيل
          </button>
          <span className="text-muted-foreground/30">|</span>
          <a
            href={waHref(brand.whatsapp, 'هلا محل شوب، أحتاج مساعدة بحسابي 🙏')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-green-600 hover:text-green-500"
          >
            <MessageCircle className="h-4 w-4" /> مساعدة على واتساب
          </a>
        </div>
      </div>
    </div>
  );
}
