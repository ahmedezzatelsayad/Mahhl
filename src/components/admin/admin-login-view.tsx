'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Store, User } from 'lucide-react';
import { toast } from 'sonner';

/** Admin (founder) login — email is NEVER prefilled for visitors */
export function AdminLoginView() {
  const loginAdmin = useAppStore((s) => s.loginAdmin);
  const setView = useAppStore((s) => s.setView);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        loginAdmin(data.token);
        setView('admin-dashboard');
        toast.success(`مرحباً بك في لوحة الإدارة 👑`);
      } else {
        toast.error(data.error || 'فشل الدخول');
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
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">دخول الإدارة</h1>
          <p className="text-muted-foreground text-sm mt-1">
            هذه الصفحة خاصة بمالك المتجر وفريقه فقط
          </p>
        </div>
        <form onSubmit={handleLogin} className="border rounded-lg p-6 bg-card space-y-4">
          <div>
            <Label className="mb-1 block flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> البريد الإلكتروني
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
              placeholder="admin@example.com"
              autoComplete="username"
            />
          </div>
          <div>
            <Label className="mb-1 block">كلمة المرور</Label>
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
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded text-center leading-relaxed">
            <Store className="h-3.5 w-3.5 inline ml-1" />
            جلستك تبقى محفوظة حتى بعد إغلاق الصفحة — لا حاجة لتسجيل الدخول كل مرة.
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setView('home')}
          >
            <User className="h-4 w-4 ml-1" />
            أنت عميل؟ ادخل من «حسابي»
          </Button>
        </form>
      </div>
    </div>
  );
}
