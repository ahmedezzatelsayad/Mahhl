'use client';

/**
 * AffiliateLoginView — دخول / انضمام كمسوق.
 * Login is phone + password; register creates a pending account.
 */
import { useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Handshake, Phone, Lock, User, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function AffiliateLoginView() {
  const loginAffiliate = useAppStore((s) => s.loginAffiliate);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/affiliate/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (res.ok) {
        loginAffiliate(data.token, data.affiliate);
        toast.success(`أهلاً بعودتك يا ${data.affiliate?.name || 'مسوق'} 👋`);
      } else {
        toast.error(data.error || 'فشل الدخول');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(data.message || 'تم استلام طلبك');
      } else {
        toast.error(data.error || 'فشل التسجيل');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Handshake className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">بوابة المسوقين — محل شوب</h1>
          <p className="text-muted-foreground text-sm mt-1">
            سوّق منتجاتنا واكسب عمولة على كل طلب مسلّم — بدون رأس مال
          </p>
        </div>

        {done ? (
          <div className="border rounded-lg p-6 bg-card space-y-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <p className="text-sm leading-relaxed">{done}</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setDone(null);
                setMode('login');
              }}
            >
              تسجيل الدخول
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg p-6 bg-card">
            {/* tabs */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <Button
                type="button"
                variant={mode === 'login' ? 'default' : 'outline'}
                onClick={() => setMode('login')}
              >
                تسجيل دخول
              </Button>
              <Button
                type="button"
                variant={mode === 'register' ? 'default' : 'outline'}
                onClick={() => setMode('register')}
              >
                انضم كمسوق
              </Button>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="mb-1 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> رقم الهاتف
                  </Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="XXXXXXXX"
                    autoComplete="username"
                  />
                </div>
                <div>
                  <Label className="mb-1 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> كلمة المرور
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    dir="ltr"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label className="mb-1 flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> الاسم الكامل
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="مثال: أحمد عبدالله"
                  />
                </div>
                <div>
                  <Label className="mb-1 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> رقم الهاتف (8 أرقام)
                  </Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="XXXXXXXX"
                  />
                </div>
                <div>
                  <Label className="mb-1 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> الإيميل (اختياري)
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <Label className="mb-1 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> كلمة المرور (6 أحرف على الأقل)
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    dir="ltr"
                    minLength={6}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'جاري الإرسال...' : 'إرسال طلب الانضمام'}
                </Button>
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  بعد التسجيل تقدر تتصفح المنتجات والعمولات فوراً،
                  وتبدأ إضافة الطلبات بعد موافقة الإدارة على حسابك.
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
