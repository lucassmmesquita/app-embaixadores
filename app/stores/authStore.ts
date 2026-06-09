/**
 * ═══════════════════════════════════════════════════════════════
 *  Auth Store — Zustand state management for authentication
 *  With LGPD consent management and account deletion
 * ═══════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../services/api';
import type { Consent, ConsentType, User } from '../services/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  consents: Consent[];

  login: (email: string, password: string) => Promise<void>;
  socialLogin: (provider: 'google' | 'apple', idToken: string, referralCode?: string) => Promise<void>;
  socialSessionLogin: (accessToken: string, refreshToken: string, referralCode?: string) => Promise<void>;
  register: (data: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    referral_code?: string;
    consents?: { consent_type: ConsentType; accepted: boolean }[];
  }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  loadConsents: () => Promise<void>;
  toggleConsent: (consentType: ConsentType, accepted: boolean) => Promise<void>;
  deleteAccount: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      consents: [],

      setUser: (user) => set({ user }),

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

      socialLogin: async (provider: 'google' | 'apple', idToken: string, referralCode?: string) => {
        set({ isLoading: true });
        try {
          const result = await api.socialLogin(provider, idToken, referralCode);
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

      socialSessionLogin: async (accessToken: string, refreshToken: string, referralCode?: string) => {
        set({ isLoading: true });
        try {
          const result = await api.socialSession(accessToken, refreshToken, referralCode);
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
          await api.register(data);
          // Don't auto-login — user needs to confirm email first
          // The UI will redirect to the login screen
          set({ isLoading: false });
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
          consents: [],
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

      loadConsents: async () => {
        try {
          const consents = await api.getMyConsents();
          set({ consents });
        } catch {
          // silent fail
        }
      },

      toggleConsent: async (consentType: ConsentType, accepted: boolean) => {
        try {
          if (accepted) {
            await api.grantConsent(consentType, true);
          } else {
            await api.revokeConsent(consentType);
          }
          // Reload consents to get fresh state
          const consents = await api.getMyConsents();
          set({ consents });
        } catch (error) {
          throw error;
        }
      },

      deleteAccount: async () => {
        try {
          await api.deleteAccount();
          // Clear local state after deletion
          api.setToken(null);
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            consents: [],
          });
        } catch (error) {
          throw error;
        }
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
      onRehydrateStorage: () => (state) => {
        // When Zustand restores persisted state on app startup,
        // re-attach the saved token to the ApiService instance
        if (state?.accessToken) {
          api.setToken(state.accessToken);
        }
      },
    }
  )
);
