'use client';

/**
 * AffiliatePortal — shell of بوابة المسوقين (the marketer commission portal).
 * Mirrors the admin shell pattern: own sidebar, own auth guard, own views.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  UserCircle,
  LogOut,
  Store,
  PlusCircle,
  Receipt,
  Handshake,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AffiliateLoginView } from './affiliate-login-view';
import { AffiliateDashboardView } from './affiliate-dashboard-view';
import { AffiliateProductsView } from './affiliate-products-view';
import { AffiliateAddOrderView } from './affiliate-add-order-view';
import { AffiliateOrdersView } from './affiliate-orders-view';
import { AffiliateCommissionsView } from './affiliate-commissions-view';
import { AffiliateProfileView } from './affiliate-profile-view';
import { ViewErrorBoundary } from '@/components/store/view-error-boundary';

const NAV_ITEMS = [
  { view: 'affiliate-dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { view: 'affiliate-products', label: 'المنتجات والعمولات', icon: Package },
  { view: 'affiliate-add-order', label: 'اضف طلب', icon: PlusCircle },
  { view: 'affiliate-orders', label: 'طلباتي', icon: ShoppingCart },
  { view: 'affiliate-commissions', label: 'عمولاتي والسحب', icon: Wallet },
  { view: 'affiliate-profile', label: 'حسابي', icon: UserCircle },
] as const;

export function AffiliatePortal() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const affiliateUser = useAppStore((s) => s.affiliateUser);
  const logoutAffiliate = useAppStore((s) => s.logoutAffiliate);

  // Re-validate the session with the server (status changes take effect live)
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setChecked(true);
    };
    if (!affiliateToken) {
      // defer one tick so this isn't a synchronous setState inside the effect
      const t = setTimeout(finish, 0);
      return () => clearTimeout(t);
    }
    fetch('/api/affiliate/login', {
      headers: { Authorization: `Bearer ${affiliateToken}` },
    })
      .then(async (r) => {
        if (!r.ok) {
          logoutAffiliate();
        } else {
          const data = await r.json();
          if (data?.affiliate) {
            useAppStore.getState().updateAffiliateStatus(data.affiliate.status);
          }
        }
      })
      .catch(() => {})
      .finally(finish);

    return () => {
      cancelled = true;
    };
     
  }, []);

  if (!affiliateToken || !affiliateUser) {
    return <AffiliateLoginView />;
  }
  if (!checked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground text-sm">
        جاري التحقق من الجلسة...
      </div>
    );
  }

  const content = (() => {
    switch (view) {
      case 'affiliate-products':
        return <AffiliateProductsView />;
      case 'affiliate-add-order':
        return <AffiliateAddOrderView />;
      case 'affiliate-orders':
        return <AffiliateOrdersView />;
      case 'affiliate-commissions':
        return <AffiliateCommissionsView />;
      case 'affiliate-profile':
        return <AffiliateProfileView />;
      default:
        return <AffiliateDashboardView />;
    }
  })();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-60 flex-shrink-0 border-l bg-card flex-col">
          <div className="p-4 border-b">
            <button
              onClick={() => setView('affiliate-dashboard')}
              className="flex items-center gap-2 font-bold text-primary"
            >
              <Handshake className="h-6 w-6" />
              بوابة المسوقين
            </button>
            <div className="mt-2 text-xs text-muted-foreground">
              {affiliateUser.name}
              <span className="mx-1">·</span>
              <span className="font-mono font-medium text-primary">{affiliateUser.code}</span>
            </div>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {NAV_ITEMS.map((item) => {
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
              <Store className="h-4 w-4 ml-2" />
              زيارة المتجر
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={logoutAffiliate}
            >
              <LogOut className="h-4 w-4 ml-2" />
              تسجيل الخروج
            </Button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile nav */}
          <nav className="md:hidden flex overflow-x-auto border-b bg-card">
            {NAV_ITEMS.map((item) => {
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
          <main className="flex-1">
            <ViewErrorBoundary>{content}</ViewErrorBoundary>
          </main>
          <footer className="border-t bg-card px-4 py-3 text-xs text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Receipt className="h-3.5 w-3.5" />
              نظام عمولات محل شوب — عمولتك محسوبة تلقائياً على كل طلب مسلّم
            </span>
            <button
              className="underline hover:text-foreground md:hidden"
              onClick={logoutAffiliate}
            >
              خروج
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
