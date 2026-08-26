/**
 * App store - view routing, current product, filters, search query, admin auth.
 *
 * SEO: every public view keeps the URL in sync (pushState) so each one of the
 * 2,638 products and 38 categories has a unique, crawlable, shareable URL:
 *   /?p=<slug> product · /?cat=<slug> category · /?q=<text> search
 *   /?l=<slug> landing · /?all=1 shop-all
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
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-products'
  | 'admin-inventory'
  | 'admin-orders'
  | 'admin-categories'
  | 'admin-insights'
  | 'admin-facebook'
  | 'admin-reports'
  | 'admin-landing'
  | 'admin-seo'
  | 'admin-settings'
  | 'admin-add-product'
  | 'admin-edit-product';

interface AppState {
  view: View;
  selectedProductSlug: string | null;
  selectedCategoryId: string | null;
  selectedCategorySlug: string | null;
  searchQuery: string;
  isAdmin: boolean;
  adminToken: string | null;
  priceMin: number | null;
  priceMax: number | null;
  filterBestSeller: boolean;
  lastOrderId: string | null;
  selectedLandingSlug: string | null;
  /** slug -> id map, filled whenever categories load (for back-button) */
  categoryMap: Record<string, string>;

  setView: (v: View) => void;
  openLanding: (slug: string) => void;
  openProduct: (slug: string) => void;
  openCategory: (categoryId: string | null, categorySlug?: string | null) => void;
  setSearch: (q: string) => void;
  setPriceFilter: (min: number | null, max: number | null) => void;
  toggleBestSellerFilter: () => void;
  loginAdmin: (token: string) => void;
  logoutAdmin: () => void;
  resetFilters: () => void;
  setLastOrder: (id: string) => void;
  setCategoryMap: (cats: { id: string; slug: string }[]) => void;
  /** apply a state patch coming from URL parsing — no history push */
  applyUrlState: (patch: Partial<Pick<AppState, 'view' | 'selectedProductSlug' | 'selectedCategoryId' | 'selectedCategorySlug' | 'searchQuery' | 'selectedLandingSlug'>>) => void;
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
    (set) => ({
      view: 'home',
      selectedProductSlug: null,
      selectedCategoryId: null,
      selectedCategorySlug: null,
      searchQuery: '',
      isAdmin: false,
      adminToken: null,
      priceMin: null,
      priceMax: null,
      filterBestSeller: false,
      lastOrderId: null,
      selectedLandingSlug: null,
      categoryMap: {},

      setView: (v) => {
        set({ view: v });
        if (v === 'home') pushUrl('/');
        else if (v === 'shop') pushUrl('/?all=1');
        // cart/checkout/admin are ephemeral client states — keep URL as-is
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
      loginAdmin: (token) => set({ isAdmin: true, adminToken: token }),
      logoutAdmin: () => set({ isAdmin: false, adminToken: null, view: 'home' }),
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
      applyUrlState: (patch) => set(patch),
    }),
    {
      name: 'ecomerg-app',
      partialize: (s) => ({ isAdmin: s.isAdmin, adminToken: s.adminToken }),
    }
  )
);
