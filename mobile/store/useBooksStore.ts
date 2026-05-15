import { create } from 'zustand';
import { Book, ReadBook, BookAnalysis } from '../services/api';

interface BooksStore {
  searchResults: Book[];
  readBooks: ReadBook[];
  selectedBook: Book | null;
  analysis: BookAnalysis | null;
  isSearching: boolean;
  isAnalyzing: boolean;

  setSearchResults: (results: Book[]) => void;
  setReadBooks: (books: ReadBook[]) => void;
  setSelectedBook: (book: Book | null) => void;
  setAnalysis: (analysis: BookAnalysis | null) => void;
  setIsSearching: (v: boolean) => void;
  setIsAnalyzing: (v: boolean) => void;
}

export const useBooksStore = create<BooksStore>((set) => ({
  searchResults: [],
  readBooks: [],
  selectedBook: null,
  analysis: null,
  isSearching: false,
  isAnalyzing: false,

  setSearchResults: (results) => set({ searchResults: results }),
  setReadBooks: (books) => set({ readBooks: books }),
  setSelectedBook: (book) => set({ selectedBook: book }),
  setAnalysis: (analysis) => set({ analysis }),
  setIsSearching: (v) => set({ isSearching: v }),
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
}));
