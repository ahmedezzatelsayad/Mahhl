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
import { useT } from '@/lib/i18n';

const KUWAIT_GOVERNORATES = [
  { ar: 'محافظة العاصمة', en: 'Capital Governorate' },
  { ar: 'محافظة حولي', en: 'Hawalli Governorate' },
  { ar: 'محافظة الفروانية', en: 'Farwaniya Governorate' },
  { ar: 'محافظة الجهراء', en: 'Jahra Governorate' },
  { ar: 'محافظة الأحمدي', en: 'Ahmadi Governorate' },
  { ar: 'محافظة مبارك الكبير', en: 'Mubarak Al-Kabeer Governorate' },
];

type Tab = 'orders' | 'profile' | 'security';

export function AccountView() {
  const { t, lang } = useT();
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
    city: KUWAIT_GOVERNORATES[0].ar,
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
      .catch(() => toast.error(t('a.loadFail')))
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
        toast.success(t('a.loginOk', { name: data.customer.name.split(' ')[0] }));
      } else {
        toast.error(data.error || t('a.loginFail'));
      }
    } catch {
      toast.error(t('ck.connFail'));
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
        toast.error(data.error || t('a.signupFail'));
      }
    } catch {
      toast.error(t('ck.connFail'));
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
        toast.success(data.message || t('a.updated'));
        if (data.customer) {
          loginCustomer(data.customer, customerToken!);
        }
      } else {
        toast.error(data.error || t('a.updateFail'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passForm.next !== passForm.confirm) {
      toast.error(t('a.pwMismatch'));
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
        toast.success(t('a.pwChanged'));
        setPassForm({ current: '', next: '', confirm: '' });
        if (data.token) loginCustomer(data.customer, data.token);
      } else {
        toast.error(data.error || t('a.pwChangeFail'));
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
                <h1 className="text-xl font-extrabold">{t('a.hello', { name: customer.name.split(' ')[0] })}</h1>
                <p className="text-xs text-primary-foreground/60" dir="ltr">
                  {customer.phone}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => setView('wishlist')}>
                <Heart className="h-4 w-4" /> {t('a.wishlist')}
              </Button>
              <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => setView('cart')}>
                <ShoppingCart className="h-4 w-4" /> {t('a.cart')}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10" onClick={logoutCustomer}>
                <LogOut className="h-4 w-4" /> {t('a.logout')}
              </Button>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-2 mb-5 border-b">
          {([
            ['orders', t('a.orders'), Package],
            ['profile', t('a.profile'), User],
            ['security', t('a.security'), KeyRound],
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
                <Loader2 className="h-5 w-5 animate-spin" /> {t('a.loadingOrders')}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 border rounded-xl">
                <Package className="h-14 w-14 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">{t('a.noOrders')}</p>
                <Button onClick={() => setView('shop')}>{t('a.startShopping')}</Button>
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
                <Label className="mb-1 block">{t('a.name')}</Label>
                <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
              </div>
              <div>
                <Label className="mb-1 block">{t('a.phone')}</Label>
                <Input value={profile.phone} dir="ltr" disabled className="bg-muted/40" />
              </div>
              <div>
                <Label className="mb-1 block">{t('a.gov')}</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                >
                  {KUWAIT_GOVERNORATES.map((g) => (
                    <option key={g.ar} value={g.ar}>{lang === 'en' ? g.en : g.ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block">{t('a.area')}</Label>
                <Input value={profile.area} onChange={(e) => setProfile({ ...profile, area: e.target.value })} placeholder={t('a.areaPh')} />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">{t('a.address')}</Label>
              <Textarea value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>{t('a.save')}</Button>
            </div>
          </form>
        )}

        {tab === 'security' && (
          <form onSubmit={changePassword} className="border rounded-xl bg-card p-5 space-y-4 max-w-xl">
            <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {t('a.defaultPw')}
            </div>
            <div>
              <Label className="mb-1 block">{t('a.currentPw')}</Label>
              <Input
                type="password" dir="ltr" required
                value={passForm.current}
                onChange={(e) => setPassForm({ ...passForm, current: e.target.value })}
                placeholder={t('a.currentPwPh')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block">{t('a.newPw')}</Label>
                <Input type="password" dir="ltr" required minLength={6} value={passForm.next} onChange={(e) => setPassForm({ ...passForm, next: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">{t('a.confirmPw')}</Label>
                <Input type="password" dir="ltr" required minLength={6} value={passForm.confirm} onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>{t('a.changePw')}</Button>
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
          <h1 className="text-2xl font-extrabold">{t('hdr.account')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('a.loginSub')}
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
            <LogIn className="h-4 w-4" /> {t('a.login')}
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
              mode === 'register' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-4 w-4" /> {t('a.register')}
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="border rounded-xl p-6 bg-card space-y-4">
            <div>
              <Label className="mb-1 block">{t('ck.phone')}</Label>
              <Input
                type="tel" dir="ltr" required placeholder="5xxxxxxxx"
                value={loginForm.phone}
                onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block">{t('a.password')}</Label>
              <Input
                type="password" dir="ltr" required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder={t('a.currentPwPh')}
              />
            </div>
            <Button type="submit" className="w-full btn-gold border-0" size="lg" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('a.loginBtn')}
            </Button>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {t('a.firstTime')}
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="border rounded-xl p-6 bg-card space-y-4">
            <div>
              <Label className="mb-1 block">{t('ck.name')} <span className="text-destructive">*</span></Label>
              <Input required placeholder={t('a.namePh')} value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">{t('ck.phone')} <span className="text-destructive">*</span></Label>
              <Input type="tel" dir="ltr" required placeholder="5xxxxxxxx" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">{t('a.gov')}</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm"
                  value={regForm.city}
                  onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                >
                  {KUWAIT_GOVERNORATES.map((g) => (
                    <option key={g.ar} value={g.ar}>{lang === 'en' ? g.en : g.ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block">{t('a.area')}</Label>
                <Input placeholder={t('a.areaPh')} value={regForm.area} onChange={(e) => setRegForm({ ...regForm, area: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">{t('a.address')} <span className="text-destructive">*</span></Label>
              <Textarea required rows={2} placeholder={t('ck.addrPh')} value={regForm.address} onChange={(e) => setRegForm({ ...regForm, address: e.target.value })} />
            </div>
            <div className="rounded-lg bg-accent/10 border border-accent/25 px-3 py-2.5 text-xs leading-relaxed text-foreground">
              <Lock className="h-3.5 w-3.5 inline ml-1 text-gold-deep" />
              {t('a.pwNote')}
            </div>
            <Button type="submit" className="w-full btn-gold border-0" size="lg" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('a.createBtn')}
            </Button>
          </form>
        )}

        {/* quick links for guests */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          <button onClick={() => setView('track-order')} className="flex items-center gap-1 text-muted-foreground hover:text-accent cursor-pointer">
            <ChevronLeft className="h-4 w-4" /> {t('a.trackGuest')}
          </button>
          <span className="text-muted-foreground/30">|</span>
          <a
            href={waHref(brand.whatsapp, lang === 'en' ? 'Hi Mahal Shop, I need help with my account 🙏' : 'هلا محل شوب، أحتاج مساعدة بحسابي 🙏')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-green-600 hover:text-green-500"
          >
            <MessageCircle className="h-4 w-4" /> {t('a.waHelp')}
          </a>
        </div>
      </div>
    </div>
  );
}
