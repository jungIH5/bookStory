import { create } from 'zustand';
import { Club } from '../services/api';

interface ClubsStore {
  clubs: Club[];
  joinedClubs: Set<number>;
  setClubs: (clubs: Club[]) => void;
  setJoinedClubs: (ids: number[]) => void;
  toggleJoined: (clubId: number) => void;
}

export const useClubsStore = create<ClubsStore>((set) => ({
  clubs: [],
  joinedClubs: new Set(),

  setClubs: (clubs) => set({ clubs }),
  setJoinedClubs: (ids) => set({ joinedClubs: new Set(ids) }),
  toggleJoined: (clubId) =>
    set((state) => {
      const next = new Set(state.joinedClubs);
      next.has(clubId) ? next.delete(clubId) : next.add(clubId);
      return { joinedClubs: next };
    }),
}));
