'use client';

import { useAppStore, View } from '@/lib/stores/app-store';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Tags,
  LogOut,
  Store,
  Home,
  Brain,
  Facebook,
  BarChart3,
  Megaphone,
  Settings,
  Search,
  Images,
  Star,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  view: View;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { view: 'admin-dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { view: 'admin-reports', label: 'التقارير اليومية', icon: BarChart3 },
  { view: 'admin-landing', label: 'صفحات الهبوط', icon: Megaphone },
  { view: 'admin-slider', label: 'السلايدر', icon: Images },
  { view: 'admin-reviews', label: 'التقييمات', icon: Star },
  { view: 'admin-seo', label: 'SEO والبحث', icon: Search },
  { view: 'admin-products', label: 'المنتجات', icon: Package },
  { view: 'admin-top100', label: 'الأكثر طلباً Top 100', icon: Trophy },
  { view: 'admin-inventory', label: 'المخزون', icon: Boxes },
  { view: 'admin-orders', label: 'الطلبات', icon: ShoppingCart },
  { view: 'admin-categories', label: 'الفئات', icon: Tags },
  { view: 'admin-insights', label: 'محرك الذكاء', icon: Brain },
  { view: 'admin-facebook', label: 'التتبع والتحليلات', icon: Facebook },
  { view: 'admin-settings', label: 'الإعدادات', icon: Settings },
];

export function AdminSidebar() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const logoutAdmin = useAppStore((s) => s.logoutAdmin);

  return (
    <aside className="hidden md:flex w-60 flex-shrink-0 border-l bg-card flex-col">
      <div className="p-4 border-b">
        <button
          onClick={() => setView('admin-dashboard')}
          className="flex items-center gap-2 font-bold text-primary"
        >
          <Store className="h-6 w-6" />
          لوحة التحكم
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-2 border-t space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setView('home')}
        >
          <Home className="h-4 w-4 ml-2" />
          عرض المتجر
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={logoutAdmin}
        >
          <LogOut className="h-4 w-4 ml-2" />
          تسجيل الخروج
        </Button>
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  return (
    <nav className="md:hidden flex overflow-x-auto border-b bg-card">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = view === item.view;
        return (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2 text-xs border-b-2 transition-colors ${
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
