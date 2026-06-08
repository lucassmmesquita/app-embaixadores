/**
 * ═══════════════════════════════════════════════════════════════
 *  Mission Store — Zustand state management for missions
 *  PRD §4.2: Full state machine AVAILABLE→COMPLETED
 *  BLK-02: Error states propagated to UI instead of silent catch
 * ═══════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';
import api from '../services/api';
import type { Mission, MissionCategory, MissionSubmitResult, UserMission, UserMissionStatus } from '../services/types';

interface MissionState {
  // Available missions (browse)
  missions: Mission[];
  categories: MissionCategory[];
  selectedCategory: string | null;
  isLoadingMissions: boolean;
  missionsError: Error | null;

  // User's missions (tracking)
  myMissions: UserMission[];
  isLoadingMyMissions: boolean;
  myMissionsError: Error | null;

  // Actions
  loadMissions: (page?: number, categoryId?: string) => Promise<void>;
  loadCategories: () => Promise<void>;
  loadMyMissions: () => Promise<void>;
  startMission: (missionId: string) => Promise<UserMission>;
  submitMission: (missionId: string, evidenceUrl?: string, notes?: string) => Promise<MissionSubmitResult>;
  setSelectedCategory: (categoryId: string | null) => void;

  // Derived
  getMissionsByStatus: (status: UserMissionStatus) => UserMission[];
}

export const useMissionStore = create<MissionState>()((set, get) => ({
  missions: [],
  categories: [],
  selectedCategory: null,
  isLoadingMissions: false,
  missionsError: null,
  myMissions: [],
  isLoadingMyMissions: false,
  myMissionsError: null,

  loadMissions: async (page = 1, categoryId?: string) => {
    set({ isLoadingMissions: true, missionsError: null });
    try {
      const data = await api.getMissions(page, categoryId);
      set({ missions: data.items || [], isLoadingMissions: false });
    } catch (e) {
      set({ missionsError: e as Error, isLoadingMissions: false });
    }
  },

  loadCategories: async () => {
    try {
      const cats = await api.getMissionCategories();
      set({ categories: cats || [] });
    } catch {
      // Categories are non-critical, silent fail is OK
    }
  },

  loadMyMissions: async () => {
    set({ isLoadingMyMissions: true, myMissionsError: null });
    try {
      const data = await api.getMyMissions();
      set({ myMissions: data || [], isLoadingMyMissions: false });
    } catch (e) {
      set({ myMissionsError: e as Error, isLoadingMyMissions: false });
    }
  },

  startMission: async (missionId: string) => {
    const result = await api.startMission(missionId);
    // Reload user missions to reflect new state
    get().loadMyMissions();
    return result;
  },

  submitMission: async (missionId: string, evidenceUrl?: string, notes?: string) => {
    const result = await api.submitMission(missionId, evidenceUrl, notes);
    // Reload user missions to reflect new state
    get().loadMyMissions();
    return result;
  },

  setSelectedCategory: (categoryId: string | null) => {
    set({ selectedCategory: categoryId });
  },

  getMissionsByStatus: (status: UserMissionStatus) => {
    return get().myMissions.filter((m) => m.status === status);
  },
}));
