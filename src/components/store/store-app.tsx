'use client';

/**
 * StoreApp — client shell of the store (previously the body of page.tsx).
 * Server page.tsx now wraps it and passes the SEO-resolved initial URL state
 * so landing directly on /?p=..., /?cat=..., /?q=... opens the right view.
 */
import { useEffect } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { captureUtm } from '@/lib/utm';
import { captureRef } from '@/lib/ref';
import { Header } from '@/components/store/header';
import { Footer } from '@/components/store/footer';
import { HomeView } from '@/components/store/home-view';
import { ShopView } from '@/components/store/shop-view';
import { ProductView } from '@/components/store/product-view';
import { AccountView } from '@/components/store/account-view';
import { TrackOrderView } from '@/components/store/track-order-view';
import { WishlistView } from '@/components/store/wishlist-view';
import { InfoView } from '@/components/store/info-view';
import { FloatingWidgets } from '@/components/store/floating-widgets';
import { RecentlyViewed } from '@/components/store/recently-viewed';
import { useLangStore } from '@/lib/stores/lang-store';
import { AdminLoginView } from '@/components/admin/admin-login-view';
import { AdminSidebar, AdminMobileNav } from '@/components/admin/admin-sidebar';
import { AdminDashboardView } from '@/components/admin/admin-dashboard-view';
import { AdminProductsView, AdminAddProductView, AdminEditProductView } from '@/components/admin/admin-products-view';
import { AdminTop100View } from '@/components/admin/admin-top100-view';
import { AdminInventoryView } from '@/components/admin/admin-inventory-view';
import { AdminOrdersView } from '@/components/admin/admin-orders-view';
import { AdminCategoriesView } from '@/components/admin/admin-categories-view';
import { AdminInsightsView } from '@/components/admin/admin-insights-view';
import { AdminFacebookView } from '@/components/admin/admin-facebook-view';
import { AdminReportsView } from '@/components/admin/admin-reports-view';
import { AdminLandingView } from '@/components/admin/admin-landing-view';
import { AdminSliderView } from '@/components/admin/admin-slider-view';
import { AdminReviewsView } from '@/components/admin/admin-reviews-view';
import { AdminSeoView } from '@/components/admin/admin-seo-view';
import { AdminSettingsView } from '@/components/admin/admin-settings-view';
import { AdminStaffView } from '@/components/admin/admin-staff-view';
import { AdminAffiliatesView } from '@/components/admin/admin-affiliates-view';
import { AdminCommissionsView } from '@/components/admin/admin-commissions-view';
import { AdminWithdrawalsView } from '@/components/admin/admin-withdrawals-view';
import { canAccessView, firstPermittedAdminView } from '@/lib/permissions';
import { FacebookPixel } from '@/components/store/facebook-pixel';
import { LandingView } from '@/components/store/landing-view';
import { ViewErrorBoundary } from '@/components/store/view-error-boundary';
import { AffiliatePortal } from '@/components/affiliate/affiliate-app';

export interface InitialUrlState {
  /** any view incl. admin-* — admin views render only for authenticated admins */
  view: View;
  infoPage?: string | null;
  productSlug?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  searchQuery?: string;
  landingSlug?: string | null;
}

import type { View, InfoPage } from '@/lib/stores/app-store';

const INFO_PAGES: InfoPage[] = ['about', 'contact', 'faq', 'shipping', 'returns', 'privacy', 'terms', 'affiliate-program', 'guide-ads', 'guide-campaigns'];

export function StoreApp({ initial }: { initial: InitialUrlState }) {
  const view = useAppStore((s) => s.view);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const adminUser = useAppStore((s) => s.adminUser);
  const affiliateToken = useAppStore((s) => s.affiliateToken);
  const refreshAdmin = useAppStore((s) => s.refreshAdmin);
  const setView = useAppStore((s) => s.setView);
  const applyUrlState = useAppStore((s) => s.applyUrlState);

  // Hydrate store from the server-resolved URL state (deep links / SEO)
  useEffect(() => {
    // Capture ad attribution (?utm_*) + marketer referral (?ref=CODE)
    captureUtm();
    captureRef();
    applyUrlState({
      view: initial.view,
      infoPage: (INFO_PAGES.includes(initial.infoPage as InfoPage)
        ? initial.infoPage
        : 'about') as InfoPage,
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
      const account = sp.get('account');
      const track = sp.get('track');
      const wishlist = sp.get('wishlist');
      const info = sp.get('info');
      const viewParam = sp.get('view');

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
      if (account) {
        applyUrlState({ view: 'account' });
        return;
      }
      if (track) {
        applyUrlState({ view: 'track-order' });
        return;
      }
      if (wishlist) {
        applyUrlState({ view: 'wishlist' });
        return;
      }
      // legacy cart/checkout/order URLs → home (منصة افلييت: لا بيع مباشر)
      // admin views survive back/forward too (guard effect enforces auth)
      if (viewParam && viewParam.startsWith('admin-')) {
        applyUrlState({ view: viewParam as View });
        return;
      }
      if (info && INFO_PAGES.includes(info as InfoPage)) {
        applyUrlState({ view: 'info', infoPage: info as InfoPage });
        return;
      }
      applyUrlState({ view: 'home' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [applyUrlState]);

  // Redirect away from admin pages if not logged in (session survives refresh —
  // adminToken is persisted, so a logged-in founder lands straight in the panel)
  useEffect(() => {
    if (view.startsWith('admin-') && view !== 'admin-login' && !isAdmin) {
      setView('admin-login');
    }
  }, [view, isAdmin, setView]);

  // Re-sync admin identity with the server on load: picks up role changes,
  // deactivation, and expired (7-day) tokens — then the guards above/below
  // redirect accordingly.
  useEffect(() => {
    refreshAdmin();
  }, [refreshAdmin]);

  // Role guard: a logged-in staff member who lacks permission for the current
  // view (deep link, stale tab after role change) is sent to their first
  // permitted section instead.
  useEffect(() => {
    if (
      view.startsWith('admin-') &&
      view !== 'admin-login' &&
      isAdmin &&
      adminUser &&
      !canAccessView(adminUser.role, view)
    ) {
      setView(firstPermittedAdminView(adminUser.role) as View);
    }
  }, [view, isAdmin, adminUser, setView]);

  // A logged-in admin landing on the login view goes straight to their
  // permitted home view (dashboard for most roles)
  useEffect(() => {
    if (view === 'admin-login' && isAdmin) {
      setView((adminUser ? firstPermittedAdminView(adminUser.role) : 'admin-dashboard') as View);
    }
  }, [view, isAdmin, adminUser, setView]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  // ===== i18n: keep <html> dir/lang in sync (RTL ⇄ LTR) =====
  const lang = useLangStore((s) => s.lang);
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    html.setAttribute('lang', lang);
    html.classList.toggle('lang-en', lang === 'en');
  }, [lang]);

  const isAdminView = view.startsWith('admin-') && view !== 'admin-login' && isAdmin;

  // Render the correct view
  let content: React.ReactNode;
  if (view === 'home') content = <HomeView />;
  else if (view === 'shop') content = <ShopView />;
  else if (view === 'product') content = <ProductView />;
  else if (view === 'landing') content = <LandingView />;
  else if (view === 'account') content = <AccountView />;
  else if (view === 'track-order') content = <TrackOrderView />;
  else if (view === 'wishlist') content = <WishlistView />;
  else if (view === 'info') content = <InfoView />;
  else if (view === 'admin-login') content = <AdminLoginView />;
  else if (view === 'admin-dashboard' && isAdmin) content = <AdminDashboardView />;
  else if (view === 'admin-products' && isAdmin) content = <AdminProductsView />;
  else if (view === 'admin-top100' && isAdmin) content = <AdminTop100View />;
  else if (view === 'admin-add-product' && isAdmin) content = <AdminAddProductView />;
  else if (view === 'admin-edit-product' && isAdmin) content = <AdminEditProductView />;
  else if (view === 'admin-inventory' && isAdmin) content = <AdminInventoryView />;
  else if (view === 'admin-orders' && isAdmin) content = <AdminOrdersView />;
  else if (view === 'admin-categories' && isAdmin) content = <AdminCategoriesView />;
  else if (view === 'admin-insights' && isAdmin) content = <AdminInsightsView />;
  else if (view === 'admin-facebook' && isAdmin) content = <AdminFacebookView />;
  else if (view === 'admin-reports' && isAdmin) content = <AdminReportsView />;
  else if (view === 'admin-landing' && isAdmin) content = <AdminLandingView />;
  else if (view === 'admin-slider' && isAdmin) content = <AdminSliderView />;
  else if (view === 'admin-reviews' && isAdmin) content = <AdminReviewsView />;
  else if (view === 'admin-seo' && isAdmin) content = <AdminSeoView />;
  else if (view === 'admin-settings' && isAdmin) content = <AdminSettingsView />;
  else if (view === 'admin-staff' && isAdmin) content = <AdminStaffView />;
  else if (view === 'admin-affiliates' && isAdmin) content = <AdminAffiliatesView />;
  else if (view === 'admin-commissions' && isAdmin) content = <AdminCommissionsView />;
  else if (view === 'admin-withdrawals' && isAdmin) content = <AdminWithdrawalsView />;
  else if (view === 'affiliate-login' || (view.startsWith('affiliate-') && affiliateToken))
    content = <AffiliatePortal />;
  else content = <HomeView />;

  // ===== بوابة المسوقين: shell خاص بها (بدون هيدر/فوتر المتجر) =====
  if (view.startsWith('affiliate-')) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AffiliatePortal />
      </div>
    );
  }

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
      <main className="flex-1">
        {/* one crashing view never kills the whole storefront */}
        <ViewErrorBoundary>
          {content}
          {/* recently-viewed rail on every storefront view (not admin/product detail) */}
          {view !== 'product' && <RecentlyViewed />}
        </ViewErrorBoundary>
      </main>
      <Footer />
      <FloatingWidgets />
    </div>
  );
}
