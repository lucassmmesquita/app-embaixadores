/**
 * ═══════════════════════════════════════════════════════════════
 *  Gamification Store — Controls reward overlay state
 *  Fase 3: RF-HOME-08 — Feedback visual de gamificação
 * ═══════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';

interface RewardEvent {
  id: string;
  type: 'points' | 'level_up' | 'badge';
  points?: number;
  levelName?: string;
  badgeName?: string;
  badgeIcon?: string;
}

interface GamificationState {
  pendingRewards: RewardEvent[];
  currentReward: RewardEvent | null;

  showReward: (reward: Omit<RewardEvent, 'id'>) => void;
  dismissReward: () => void;
  clearAll: () => void;
}

let rewardId = 0;

export const useGamificationStore = create<GamificationState>()((set, get) => ({
  pendingRewards: [],
  currentReward: null,

  showReward: (reward) => {
    const event: RewardEvent = { ...reward, id: `reward_${++rewardId}` };
    const { currentReward } = get();
    if (!currentReward) {
      set({ currentReward: event });
    } else {
      set((s) => ({ pendingRewards: [...s.pendingRewards, event] }));
    }
  },

  dismissReward: () => {
    const { pendingRewards } = get();
    if (pendingRewards.length > 0) {
      const [next, ...rest] = pendingRewards;
      set({ currentReward: next, pendingRewards: rest });
    } else {
      set({ currentReward: null });
    }
  },

  clearAll: () => set({ pendingRewards: [], currentReward: null }),
}));
