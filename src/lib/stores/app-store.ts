/**
 * App store - view routing, current product, filters, search query, admin auth
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
  | 'admin-settings'
  | 'admin-add-product'
  | 'admin-edit-product';

interface AppState {
  view: View;
  selectedProductSlug: string | null;
  selectedCategoryId: string | null;
  searchQuery: string;
  isAdmin: boolean;
  adminToken: string | null;
  priceMin: number | null;
  priceMax: number | null;
  filterBestSeller: boolean;
  lastOrderId: string | null;
  selectedLandingSlug: string | null;

  setView: (v: View) => void;
  openLanding: (slug: string) => void;
  openProduct: (slug: string) => void;
  openCategory: (categoryId: string | null) => void;
  setSearch: (q: string) => void;
  setPriceFilter: (min: number | null, max: number | null) => void;
  toggleBestSellerFilter: () => void;
  loginAdmin: (token: string) => void;
  logoutAdmin: () => void;
  resetFilters: () => void;
  setLastOrder: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: 'home',
      selectedProductSlug: null,
      selectedCategoryId: null,
      searchQuery: '',
      isAdmin: false,
      adminToken: null,
      priceMin: null,
      priceMax: null,
      filterBestSeller: false,
      lastOrderId: null,
      selectedLandingSlug: null,

      setView: (v) => set({ view: v }),
      openLanding: (slug) => set({ view: 'landing', selectedLandingSlug: slug }),
      openProduct: (slug) => set({ view: 'product', selectedProductSlug: slug }),
      openCategory: (categoryId) =>
        set({ selectedCategoryId: categoryId, view: 'shop', searchQuery: '' }),
      setSearch: (q) => set({ searchQuery: q, view: 'shop' }),
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
        }),
      setLastOrder: (id) => set({ lastOrderId: id }),
    }),
    {
      name: 'ecomerg-app',
      partialize: (s) => ({ isAdmin: s.isAdmin, adminToken: s.adminToken }),
    }
  )
);
