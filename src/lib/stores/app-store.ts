/**
 * App store - view routing, current product, filters, search query, admin auth,
 * and the persistent customer session (حسابي).
 *
 * SEO: every public view keeps the URL in sync (pushState) so each one of the
 * 2,638 products and 38 categories has a unique, crawlable, shareable URL:
 *   /?p=<slug> product · /?cat=<slug> category · /?q=<text> search
 *   /?l=<slug> landing · /?all=1 shop-all · /?account=1 حسابي
 *   /?track=1 تتبع طلب · /?wishlist=1 المفضلة · /?info=<page> صفحات المعلومات
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type View =
  | 'home'
  | 'shop'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'order-success'
  | 'landing'
  | 'account'
  | 'track-order'
  | 'wishlist'
  | 'info'
  | 'guide-ads'
  | 'guide-campaigns'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-products'
  | 'admin-top100'
  | 'admin-inventory'
  | 'admin-orders'
  | 'admin-categories'
  | 'admin-insights'
  | 'admin-facebook'
  | 'admin-reports'
  | 'admin-landing'
  | 'admin-seo'
  | 'admin-slider'
  | 'admin-reviews'
  | 'admin-settings'
  | 'admin-staff'
  | 'admin-add-product'
  | 'admin-edit-product'
  | 'admin-affiliates'
  | 'admin-commissions'
  | 'admin-withdrawals'
  // ===== بوابة المسوقين (affiliate portal) =====
  | 'affiliate-login'
  | 'affiliate-dashboard'
  | 'affiliate-products'
  | 'affiliate-add-order'
  | 'affiliate-orders'
  | 'affiliate-commissions'
  | 'affiliate-profile';

export type InfoPage =
  | 'about'
  | 'contact'
  | 'faq'
  | 'shipping'
  | 'returns'
  | 'privacy'
  | 'terms'
  | 'guide-ads'
  | 'guide-campaigns';

export interface CustomerSession {
  id: string;
  name: string;
  phone: string;
}

interface AppState {
  view: View;
  infoPage: InfoPage;
  selectedProductSlug: string | null;
  selectedCategoryId: string | null;
  selectedCategorySlug: string | null;
  searchQuery: string;
  isAdmin: boolean;
  adminToken: string | null;
  /** logged-in staff identity (role drives all permission gating) */
  adminUser: { id: string; email: string; name: string | null; role: string } | null;
  /** persistent customer session (حسابي) */
  customer: CustomerSession | null;
  customerToken: string | null;
  priceMin: number | null;
  priceMax: number | null;
  filterBestSeller: boolean;
  lastOrderId: string | null;
  selectedLandingSlug: string | null;
  /** slug -> id map, filled whenever categories load (for back-button) */
  categoryMap: Record<string, string>;
  /** edit-product target id (admin) */
  editProductId: string | null;
  /** prefill for the guest tracking form (order + phone from AI agent receipts) */
  trackPrefill: { orderNumber: string; phone: string } | null;
  /** ===== affiliate portal session ===== */
  affiliateToken: string | null;
  affiliateUser: { id: string; name: string; phone: string; code: string; status: string } | null;

  setView: (v: View) => void;
  openInfo: (page: InfoPage) => void;
  openLanding: (slug: string) => void;
  openProduct: (slug: string) => void;
  openCategory: (categoryId: string | null, categorySlug?: string | null) => void;
  setSearch: (q: string) => void;
  setPriceFilter: (min: number | null, max: number | null) => void;
  toggleBestSellerFilter: () => void;
  loginAdmin: (token: string, user: { id: string; email: string; name: string | null; role: string }) => void;
  logoutAdmin: () => void;
  /** re-sync admin identity from server (role changes / deactivation / expiry) */
  refreshAdmin: () => Promise<void>;
  loginCustomer: (customer: CustomerSession, token: string) => void;
  logoutCustomer: () => void;
  resetFilters: () => void;
  setLastOrder: (id: string) => void;
  setCategoryMap: (cats: { id: string; slug: string }[]) => void;
  setEditProduct: (id: string | null) => void;
  setTrackPrefill: (v: { orderNumber: string; phone: string } | null) => void;
  loginAffiliate: (token: string, user: { id: string; name: string; phone: string; code: string; status: string }) => void;
  logoutAffiliate: () => void;
  updateAffiliateStatus: (status: string) => void;
  /** apply a state patch coming from URL parsing — no history push */
  applyUrlState: (patch: Partial<Pick<AppState, 'view' | 'infoPage' | 'selectedProductSlug' | 'selectedCategoryId' | 'selectedCategorySlug' | 'searchQuery' | 'selectedLandingSlug'>>) => void;
}

function pushUrl(url: string) {
  try {
    window.history.pushState({}, '', url);
  } catch {
    /* SSR / test env */
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'home',
      infoPage: 'about',
      selectedProductSlug: null,
      selectedCategoryId: null,
      selectedCategorySlug: null,
      searchQuery: '',
      isAdmin: false,
      adminToken: null,
      adminUser: null,
      customer: null,
      customerToken: null,
      priceMin: null,
      priceMax: null,
      filterBestSeller: false,
      lastOrderId: null,
      selectedLandingSlug: null,
      categoryMap: {},
      editProductId: null,
      trackPrefill: null,
      affiliateToken: null,
      affiliateUser: null,

      setView: (v) => {
        set({ view: v });
        if (v === 'home') pushUrl('/');
        else if (v === 'shop') pushUrl('/?all=1');
        else if (v === 'account') pushUrl('/?account=1');
        else if (v === 'track-order') pushUrl('/?track=1');
        else if (v === 'wishlist') pushUrl('/?wishlist=1');
        else if (v === 'cart') pushUrl('/?cart=1');
        else if (v === 'checkout') pushUrl('/?checkout=1');
        else if (v === 'order-success') pushUrl('/?order=1');
        else if (v.startsWith('admin-')) pushUrl(`/?view=${v}`);
        else if (v.startsWith('affiliate-')) pushUrl(`/?view=${v}`);
        // info pushes its own URL via openInfo
      },
      openInfo: (page) => {
        set({ view: 'info', infoPage: page });
        pushUrl(`/?info=${page}`);
      },
      openLanding: (slug) => {
        set({ view: 'landing', selectedLandingSlug: slug });
        pushUrl(`/?l=${encodeURIComponent(slug)}`);
      },
      openProduct: (slug) => {
        set({ view: 'product', selectedProductSlug: slug });
        pushUrl(`/?p=${encodeURIComponent(slug)}`);
      },
      openCategory: (categoryId, categorySlug) => {
        set({
          selectedCategoryId: categoryId,
          selectedCategorySlug: categorySlug ?? null,
          view: 'shop',
          searchQuery: '',
        });
        if (categoryId && categorySlug) {
          pushUrl(`/?cat=${encodeURIComponent(categorySlug)}`);
        } else if (!categoryId) {
          pushUrl('/?all=1');
        } else {
          // no slug known — best effort: keep a clean all-products URL
          pushUrl('/?all=1');
        }
      },
      setSearch: (q) => {
        set({ searchQuery: q, view: 'shop' });
        pushUrl(`/?q=${encodeURIComponent(q)}`);
      },
      setPriceFilter: (min, max) => set({ priceMin: min, priceMax: max }),
      toggleBestSellerFilter: () =>
        set((s) => ({ filterBestSeller: !s.filterBestSeller })),
      loginAdmin: (token, user) =>
        set({ isAdmin: true, adminToken: token, adminUser: user }),
      logoutAdmin: () => {
        set({ isAdmin: false, adminToken: null, adminUser: null, view: 'home' });
        pushUrl('/');
      },
      refreshAdmin: async () => {
        const { adminToken } = get();
        if (!adminToken) return;
        try {
          const res = await fetch('/api/admin/login', {
            headers: { Authorization: `Bearer ${adminToken}` },
          });
          if (!res.ok) {
            // token expired / revoked / account deactivated
            set({ isAdmin: false, adminToken: null, adminUser: null });
            return;
          }
          const data = await res.json();
          if (data?.user) set({ isAdmin: true, adminUser: data.user });
        } catch {
          /* offline — keep current state */
        }
      },
      loginCustomer: (customer, token) =>
        set({ customer, customerToken: token }),
      logoutCustomer: () => set({ customer: null, customerToken: null }),
      resetFilters: () =>
        set({
          priceMin: null,
          priceMax: null,
          filterBestSeller: false,
          searchQuery: '',
          selectedCategoryId: null,
          selectedCategorySlug: null,
        }),
      setLastOrder: (id) => set({ lastOrderId: id }),
      setCategoryMap: (cats) =>
        set((s) => {
          const map = { ...s.categoryMap };
          for (const c of cats) map[c.slug] = c.id;
          return { categoryMap: map };
        }),
      setEditProduct: (id) => set({ editProductId: id }),
      setTrackPrefill: (v) => set({ trackPrefill: v }),
      loginAffiliate: (token, user) =>
        set({ affiliateToken: token, affiliateUser: user, view: 'affiliate-dashboard' }),
      logoutAffiliate: () => {
        set({ affiliateToken: null, affiliateUser: null, view: 'affiliate-login' });
        pushUrl('/?view=affiliate-login');
      },
      updateAffiliateStatus: (status) =>
        set((s) =>
          s.affiliateUser ? { affiliateUser: { ...s.affiliateUser, status } } : {}
        ),
      applyUrlState: (patch) => set(patch),
    }),
    {
      name: 'ecomerg-app',
      partialize: (s) => ({
        isAdmin: s.isAdmin,
        adminToken: s.adminToken,
        adminUser: s.adminUser,
        customer: s.customer,
        customerToken: s.customerToken,
        affiliateToken: s.affiliateToken,
        affiliateUser: s.affiliateUser,
      }),
    }
  )
);
