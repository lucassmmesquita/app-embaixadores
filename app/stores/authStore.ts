/**
 * ═══════════════════════════════════════════════════════════════
 *  Auth Store — Zustand state management for authentication
 * ═══════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../services/api';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  total_points: number;
  current_level?: {
    id: string;
    name: string;
    slug: string;
    color: string;
    order_index: number;
  };
  role: string;
  referral_code?: string;
  onboarding_completed: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    referral_code?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const result = await api.login(email, password);
          api.setToken(result.access_token);

          const profile = await api.getMyProfile();

          set({
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
            user: profile,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const result = await api.register(data);
          api.setToken(result.access_token);

          const profile = await api.getMyProfile();

          set({
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
            user: profile,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        api.setToken(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refreshProfile: async () => {
        try {
          const profile = await api.getMyProfile();
          set({ user: profile });
        } catch {
          // silent fail
        }
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        api.setToken(accessToken);
        set({ accessToken, refreshToken, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
