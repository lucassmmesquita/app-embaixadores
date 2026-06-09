/**
 * ═══════════════════════════════════════════════════════════════
 *  Referral Store — Stores referral code captured from deep links
 *  Used to pre-fill the referral code field on registration
 * ═══════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ReferralState {
  /** Referral code captured from deep link, waiting to be used on registration */
  pendingReferralCode: string | null;
  setPendingReferralCode: (code: string | null) => void;
  clearPendingReferralCode: () => void;
}

export const useReferralStore = create<ReferralState>()(
  persist(
    (set) => ({
      pendingReferralCode: null,

      setPendingReferralCode: (code: string | null) =>
        set({ pendingReferralCode: code }),

      clearPendingReferralCode: () =>
        set({ pendingReferralCode: null }),
    }),
    {
      name: 'referral-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
