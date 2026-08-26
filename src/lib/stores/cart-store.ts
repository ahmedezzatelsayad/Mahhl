/**
 * Cart store - persisted to localStorage
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trackEvent } from '@/lib/behavior-tracker';

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  image: string;
  quantity: number;
  variations?: string; // JSON string of selected variations
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (productId: string, variations?: string) => void;
  updateQuantity: (productId: string, qty: number, variations?: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

const itemKey = (item: { productId: string; variations?: string }) =>
  `${item.productId}::${item.variations || ''}`;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (item, qty = 1) =>
        set((state) => {
          const key = itemKey(item);
          const existing = state.items.find((i) => itemKey(i) === key);
          // Track add-to-cart (fire-and-forget)
          if (typeof window !== 'undefined') {
            trackEvent('add_to_cart', {
              productId: item.productId,
              metadata: { qty, name: item.name, price: item.price, variations: item.variations },
            });
          }
          if (existing) {
            return {
              items: state.items.map((i) =>
                itemKey(i) === key ? { ...i, quantity: i.quantity + qty } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: qty }] };
        }),
      removeItem: (productId, variations = '') =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && (i.variations || '') === variations)
          ),
        })),
      updateQuantity: (productId, qty, variations = '') =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId && (i.variations || '') === variations
                ? { ...i, quantity: Math.max(0, qty) }
                : i
            )
            .filter((i) => i.quantity > 0),
        })),
      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getSubtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'ecomerg-cart' }
  )
);
