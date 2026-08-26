'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Store } from 'lucide-react';
import { toast } from 'sonner';

export function AdminLoginView() {
  const loginAdmin = useAppStore((s) => s.loginAdmin);
  const setView = useAppStore((s) => s.setView);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('ahmedezzatelsayad@gmail.com');
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
        toast.success(`مرحباً ${data.name || email}!`);
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
          <h1 className="text-2xl font-bold">لوحة تحكم Mahhl</h1>
          <p className="text-muted-foreground text-sm mt-1">
            سجل دخولك كـ Owner للوصول إلى لوحة الإدارة والمحرك الذكي
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
              placeholder="founder@example.com"
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
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </Button>
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded text-center">
            محرك AI لفهم السلوك و upsell مُفعّل على المتجر بالكامل.
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setView('home')}
          >
            العودة للمتجر
          </Button>
        </form>
      </div>
    </div>
  );
}
