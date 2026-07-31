import { create } from 'zustand';
import { DiveRoom, PendingConfirmation, diveApi } from '../services/api';
import { useUserStore } from './useUserStore';

interface DiveStore {
  diveRooms: DiveRoom[];
  isFetchingRooms: boolean;
  activeDiveRoom: DiveRoom | null;
  pendingTimeConfirmations: PendingConfirmation[];

  fetchDiveRooms: () => Promise<void>;
  fetchActiveDiveRoom: () => Promise<void>;
  fetchPendingTimeConfirmations: () => Promise<void>;
  confirmPendingTime: (roomId: number, seconds: number) => Promise<void>;
  dismissPendingConfirmation: (roomId: number) => void;
}

export const useDiveStore = create<DiveStore>((set, get) => ({
  diveRooms: [],
  isFetchingRooms: false,
  activeDiveRoom: null,
  pendingTimeConfirmations: [],

  fetchDiveRooms: async () => {
    set({ isFetchingRooms: true });
    try {
      const rooms = await diveApi.getRooms();
      set({ diveRooms: rooms });
    } catch {} finally {
      set({ isFetchingRooms: false });
    }
  },

  fetchActiveDiveRoom: async () => {
    if (!useUserStore.getState().token) { set({ activeDiveRoom: null }); return; }
    try {
      const room = await diveApi.getActiveRoom();
      set({ activeDiveRoom: room });
    } catch {}
  },

  fetchPendingTimeConfirmations: async () => {
    if (!useUserStore.getState().token) { set({ pendingTimeConfirmations: [] }); return; }
    try {
      const list = await diveApi.getPendingConfirmations();
      set({ pendingTimeConfirmations: list });
    } catch {}
  },

  confirmPendingTime: async (roomId, seconds) => {
    try {
      await diveApi.confirmTime(roomId, seconds);
    } finally {
      set({ pendingTimeConfirmations: get().pendingTimeConfirmations.filter((p) => p.room_id !== roomId) });
    }
  },

  dismissPendingConfirmation: (roomId) => {
    set({ pendingTimeConfirmations: get().pendingTimeConfirmations.filter((p) => p.room_id !== roomId) });
  },
}));
