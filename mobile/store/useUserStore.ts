import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../services/api';

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  loadUser: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,

  setUser: async (user) => {
    set({ user });
    if (user) {
      await AsyncStorage.setItem('bookstory_user', JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem('bookstory_user');
    }
  },

  loadUser: async () => {
    const raw = await AsyncStorage.getItem('bookstory_user');
    if (raw) set({ user: JSON.parse(raw) });
  },
}));
