'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  notes: string;
}

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  tableNumber: number | null;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  customerPhone: string;
  customerName: string;
  addItem: (item: Omit<CartItem, 'quantity' | 'notes'>) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;
  setContext: (restaurantId: string, tableNumber: number) => void;
  setOrderType: (orderType: 'dine-in' | 'takeaway' | 'delivery') => void;
  setCustomerInfo: (phone: string, name: string) => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      tableNumber: null,
      orderType: 'dine-in',
      customerPhone: '',
      customerName: '',

      addItem: (item) => {
        const items = get().items;
        const existing = items.find((i) => i.menuItemId === item.menuItemId);
        if (existing) {
          set({ items: items.map((i) => i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i) });
        } else {
          set({ items: [...items, { ...item, quantity: 1, notes: '' }] });
        }
      },

      removeItem: (menuItemId) => {
        set({ items: get().items.filter((i) => i.menuItemId !== menuItemId) });
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set({ items: get().items.map((i) => i.menuItemId === menuItemId ? { ...i, quantity } : i) });
      },

      updateNotes: (menuItemId, notes) => {
        set({ items: get().items.map((i) => i.menuItemId === menuItemId ? { ...i, notes } : i) });
      },

      clearCart: () => set({ items: [], customerPhone: '', customerName: '', orderType: 'dine-in' }),

      setContext: (restaurantId, tableNumber) => set({ restaurantId, tableNumber }),

      setOrderType: (orderType) => set({ orderType }),

      setCustomerInfo: (phone, name) => set({ customerPhone: phone, customerName: name }),

      total: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      itemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),
    }),
    { name: 'restro-cart' }
  )
);
