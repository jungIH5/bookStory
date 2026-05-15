import { create } from 'zustand';
import { ReadBook } from '../services/api';

interface BooksStore {
  readBooks: ReadBook[];
  setReadBooks: (books: ReadBook[]) => void;
}

export const useBooksStore = create<BooksStore>((set) => ({
  readBooks: [],
  setReadBooks: (books) => set({ readBooks: books }),
}));
