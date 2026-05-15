import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { User } from '../services/api';

const USER_KEY = 'bookstory_user';
const TOKEN_KEY = 'bookstory_token';

const secureGet = (key: string) =>
  Platform.OS === 'web' ? Promise.resolve(localStorage.getItem(key)) : SecureStore.getItemAsync(key);
const secureSet = (key: string, value: string) =>
  Platform.OS === 'web' ? Promise.resolve(localStorage.setItem(key, value)) : SecureStore.setItemAsync(key, value);
const secureDelete = (key: string) =>
  Platform.OS === 'web' ? Promise.resolve(localStorage.removeItem(key)) : SecureStore.deleteItemAsync(key);

interface UserStore {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  token: null,

  setUser: async (user) => {
    set({ user });
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_KEY);
      await secureDelete(TOKEN_KEY);
      set({ token: null });
    }
  },

  setToken: async (token) => {
    set({ token });
    if (token) {
      await secureSet(TOKEN_KEY, token);
    } else {
      await secureDelete(TOKEN_KEY);
    }
  },

  loadUser: async () => {
    const [raw, token] = await Promise.all([
      AsyncStorage.getItem(USER_KEY),
      secureGet(TOKEN_KEY),
    ]);
    if (raw) set({ user: JSON.parse(raw), token: token ?? null });
  },
}));
