'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'kitchen' | 'waiter';
  restaurantId: string | null;
  onboardingStep: number;
}

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    fontFamily: string;
  };
  tableCount: number;
}

interface AuthState {
  user: User | null;
  restaurant: Restaurant | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setUser: (user: User) => void;
  setRestaurant: (restaurant: Restaurant) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      restaurant: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          localStorage.setItem('token', data.token);
          set({ user: data.user, restaurant: data.restaurant, token: data.token, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (formData) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', formData);
          localStorage.setItem('token', data.token);
          set({ user: data.user, restaurant: data.restaurant || null, token: data.token, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, restaurant: null, token: null });
      },

      loadUser: async () => {
        set({ isLoading: true });
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user, restaurant: data.restaurant, isLoading: false });
        } catch (error: unknown) {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 401) {
            // Definitively unauthorized — clear everything
            set({ user: null, restaurant: null, token: null, isLoading: false });
            localStorage.removeItem('token');
          } else {
            // Network/server error — keep token so user isn't logged out on server restart
            set({ isLoading: false });
          }
        }
      },

      setUser: (user) => set({ user }),
      setRestaurant: (restaurant) => set({ restaurant }),
    }),
    {
      name: 'restro-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
