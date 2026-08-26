/**
 * Wishlist store — persisted to localStorage (works for guests too).
 * Stores the full product payload so the wishlist page renders instantly
 * without extra requests.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  addedAt: number;
}

interface WishlistState {
  items: WishItem[];
  toggle: (item: Omit<WishItem, 'addedAt'>) => boolean;
  remove: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
  count: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => {
        const exists = get().items.some((i) => i.productId === item.productId);
        if (exists) {
          set({ items: get().items.filter((i) => i.productId !== item.productId) });
          return false;
        }
        set({ items: [{ ...item, addedAt: Date.now() }, ...get().items].slice(0, 100) });
        return true;
      },
      remove: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      has: (productId) => get().items.some((i) => i.productId === productId),
      clear: () => set({ items: [] }),
      count: () => get().items.length,
    }),
    { name: 'mahal-wishlist' }
  )
);
