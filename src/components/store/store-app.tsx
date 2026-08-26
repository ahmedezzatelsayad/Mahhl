'use client';

/**
 * StoreApp — client shell of the store (previously the body of page.tsx).
 * Server page.tsx now wraps it and passes the SEO-resolved initial URL state
 * so landing directly on /?p=..., /?cat=..., /?q=... opens the right view.
 */
import { useEffect } from 'react';
import { useAppStore, View } from '@/lib/stores/app-store';
import { Header } from '@/components/store/header';
import { Footer } from '@/components/store/footer';
import { CartDrawer } from '@/components/store/cart-drawer';
import { HomeView } from '@/components/store/home-view';
import { ShopView } from '@/components/store/shop-view';
import { ProductView } from '@/components/store/product-view';
import { CartView } from '@/components/store/cart-view';
import { CheckoutView, OrderSuccessView } from '@/components/store/checkout-view';
import { AdminLoginView } from '@/components/admin/admin-login-view';
import { AdminSidebar, AdminMobileNav } from '@/components/admin/admin-sidebar';
import { AdminDashboardView } from '@/components/admin/admin-dashboard-view';
import { AdminProductsView, AdminAddProductView, AdminEditProductView } from '@/components/admin/admin-products-view';
import { AdminInventoryView } from '@/components/admin/admin-inventory-view';
import { AdminOrdersView } from '@/components/admin/admin-orders-view';
import { AdminCategoriesView } from '@/components/admin/admin-categories-view';
import { AdminInsightsView } from '@/components/admin/admin-insights-view';
import { AdminFacebookView } from '@/components/admin/admin-facebook-view';
import { AdminReportsView } from '@/components/admin/admin-reports-view';
import { AdminLandingView } from '@/components/admin/admin-landing-view';
import { AdminSeoView } from '@/components/admin/admin-seo-view';
import { AdminSettingsView } from '@/components/admin/admin-settings-view';
import { FacebookPixel } from '@/components/store/facebook-pixel';
import { LandingView } from '@/components/store/landing-view';

export interface InitialUrlState {
  view: Extract<View, 'home' | 'shop' | 'product' | 'landing'>;
  productSlug?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  searchQuery?: string;
  landingSlug?: string | null;
}

export function StoreApp({ initial }: { initial: InitialUrlState }) {
  const view = useAppStore((s) => s.view);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const setView = useAppStore((s) => s.setView);
  const applyUrlState = useAppStore((s) => s.applyUrlState);

  // Hydrate store from the server-resolved URL state (deep links / SEO)
  useEffect(() => {
    applyUrlState({
      view: initial.view,
      selectedProductSlug: initial.productSlug ?? null,
      selectedCategoryId: initial.categoryId ?? null,
      selectedCategorySlug: initial.categorySlug ?? null,
      searchQuery: initial.searchQuery ?? '',
      selectedLandingSlug: initial.landingSlug ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser back/forward: re-parse URL and apply without pushing
  useEffect(() => {
    const onPop = async () => {
      const sp = new URLSearchParams(window.location.search);
      const p = sp.get('p');
      const cat = sp.get('cat');
      const l = sp.get('l');
      const q = sp.get('q');
      const all = sp.get('all');

      if (p) {
        applyUrlState({ view: 'product', selectedProductSlug: p });
        return;
      }
      if (cat) {
        let id = useAppStore.getState().categoryMap[cat];
        if (!id) {
          try {
            const r = await fetch('/api/categories');
            const cats = await r.json();
            if (Array.isArray(cats)) {
              useAppStore.getState().setCategoryMap(cats);
              id = useAppStore.getState().categoryMap[cat];
            }
          } catch {
            /* ignore */
          }
        }
        applyUrlState({
          view: 'shop',
          selectedCategoryId: id ?? null,
          selectedCategorySlug: cat,
          searchQuery: '',
        });
        return;
      }
      if (l) {
        applyUrlState({ view: 'landing', selectedLandingSlug: l });
        return;
      }
      if (q) {
        applyUrlState({ view: 'shop', searchQuery: q });
        return;
      }
      if (all) {
        applyUrlState({ view: 'shop', selectedCategoryId: null, searchQuery: '' });
        return;
      }
      applyUrlState({ view: 'home' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [applyUrlState]);

  // Redirect away from admin pages if not logged in
  useEffect(() => {
    if (view.startsWith('admin-') && view !== 'admin-login' && !isAdmin) {
      setView('admin-login');
    }
  }, [view, isAdmin, setView]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const isAdminView = view.startsWith('admin-') && view !== 'admin-login' && isAdmin;

  // Render the correct view
  let content: React.ReactNode;
  if (view === 'home') content = <HomeView />;
  else if (view === 'shop') content = <ShopView />;
  else if (view === 'product') content = <ProductView />;
  else if (view === 'cart') content = <CartView />;
  else if (view === 'checkout') content = <CheckoutView />;
  else if (view === 'order-success') content = <OrderSuccessView />;
  else if (view === 'landing') content = <LandingView />;
  else if (view === 'admin-login') content = <AdminLoginView />;
  else if (view === 'admin-dashboard' && isAdmin) content = <AdminDashboardView />;
  else if (view === 'admin-products' && isAdmin) content = <AdminProductsView />;
  else if (view === 'admin-add-product' && isAdmin) content = <AdminAddProductView />;
  else if (view === 'admin-edit-product' && isAdmin) content = <AdminEditProductView />;
  else if (view === 'admin-inventory' && isAdmin) content = <AdminInventoryView />;
  else if (view === 'admin-orders' && isAdmin) content = <AdminOrdersView />;
  else if (view === 'admin-categories' && isAdmin) content = <AdminCategoriesView />;
  else if (view === 'admin-insights' && isAdmin) content = <AdminInsightsView />;
  else if (view === 'admin-facebook' && isAdmin) content = <AdminFacebookView />;
  else if (view === 'admin-reports' && isAdmin) content = <AdminReportsView />;
  else if (view === 'admin-landing' && isAdmin) content = <AdminLandingView />;
  else if (view === 'admin-seo' && isAdmin) content = <AdminSeoView />;
  else if (view === 'admin-settings' && isAdmin) content = <AdminSettingsView />;
  else content = <HomeView />;

  if (isAdminView) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex flex-1">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <AdminMobileNav />
            <main className="flex-1">{content}</main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <FacebookPixel />
      <Header />
      <main className="flex-1">{content}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
