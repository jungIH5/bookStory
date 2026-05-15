import { create } from 'zustand';
import { Club } from '../services/api';

interface ClubsStore {
  clubs: Club[];
  joinedClubs: Set<number>;
  selectedClub: Club | null;
  isLoading: boolean;

  setClubs: (clubs: Club[]) => void;
  setJoinedClubs: (ids: number[]) => void;
  toggleJoined: (clubId: number) => void;
  setSelectedClub: (club: Club | null) => void;
  setIsLoading: (v: boolean) => void;
}

export const useClubsStore = create<ClubsStore>((set) => ({
  clubs: [],
  joinedClubs: new Set(),
  selectedClub: null,
  isLoading: false,

  setClubs: (clubs) => set({ clubs }),
  setJoinedClubs: (ids) => set({ joinedClubs: new Set(ids) }),
  toggleJoined: (clubId) =>
    set((state) => {
      const next = new Set(state.joinedClubs);
      next.has(clubId) ? next.delete(clubId) : next.add(clubId);
      return { joinedClubs: next };
    }),
  setSelectedClub: (club) => set({ selectedClub: club }),
  setIsLoading: (v) => set({ isLoading: v }),
}));
