/**
 * ═══════════════════════════════════════════════════════════════
 *  Invitation Store — Zustand state for invitations
 *  PRD §6.1.8: Convidar — rastreável + acompanhamento
 * ═══════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';
import api from '../services/api';
import type { InviteCreate, InviteTracking, Invitation } from '../services/types';

interface InvitationState {
  tracking: InviteTracking | null;
  isLoading: boolean;

  loadInvitations: () => Promise<void>;
  createInvitation: (data: InviteCreate) => Promise<Invitation>;
  recordShare: () => Promise<Invitation>;
}

export const useInvitationStore = create<InvitationState>()((set) => ({
  tracking: null,
  isLoading: false,

  loadInvitations: async () => {
    set({ isLoading: true });
    try {
      const data = await api.getMyInvitations();
      set({ tracking: data });
    } catch {
      // silent
    }
    set({ isLoading: false });
  },

  createInvitation: async (data: InviteCreate) => {
    const result = await api.createInvitation(data);
    // Reload tracking data
    const tracking = await api.getMyInvitations();
    set({ tracking });
    return result;
  },

  recordShare: async () => {
    const result = await api.recordShare();
    // Reload tracking data
    const tracking = await api.getMyInvitations();
    set({ tracking });
    return result;
  },
}));
