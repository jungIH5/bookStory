import { create } from 'zustand';
import { Book, ReadBook, booksApi, readingApi } from '../services/api';
import { useBooksStore } from './useBooksStore';
import { useUserStore } from './useUserStore';

export type TimerBook = Book & { startedAt: string };

interface TimerStore {
  timerBook: TimerBook | null;
  timerSeconds: number;
  timerRunning: boolean;
  timerWidgetHidden: boolean;
  showTimerComplete: boolean;
  lastResult: { finished: boolean; title: string } | null;

  startTimer: (book: Book) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  cancelTimerComplete: () => void;
  completeTimer: (finished: boolean) => Promise<void>;
  toggleWidgetHidden: () => void;
  setWidgetHidden: (hidden: boolean) => void;
}

let intervalId: ReturnType<typeof setInterval> | null = null;

const clearTick = () => {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
};

export const useTimerStore = create<TimerStore>((set, get) => ({
  timerBook: null,
  timerSeconds: 0,
  timerRunning: false,
  timerWidgetHidden: false,
  showTimerComplete: false,
  lastResult: null,

  startTimer: (book) => {
    clearTick();
    set({
      timerBook: { ...book, startedAt: new Date().toISOString().split('T')[0] },
      timerSeconds: 0,
      timerRunning: true,
      timerWidgetHidden: false,
    });
    intervalId = setInterval(() => set((s) => ({ timerSeconds: s.timerSeconds + 1 })), 1000);
  },

  pauseTimer: () => {
    clearTick();
    set({ timerRunning: false });
  },

  resumeTimer: () => {
    clearTick();
    set({ timerRunning: true });
    intervalId = setInterval(() => set((s) => ({ timerSeconds: s.timerSeconds + 1 })), 1000);
  },

  // 바로 종료 처리하지 않고 일시정지만 한다 — 완독/읽는중 팝업을 닫거나 취소해도
  // 시간이 사라지지 않고 그대로 이어서 읽을 수 있도록.
  stopTimer: () => {
    clearTick();
    const { timerSeconds } = get();
    set({ timerRunning: false, showTimerComplete: timerSeconds >= 10 });
  },

  cancelTimerComplete: () => {
    // 팝업만 닫고, 타이머는 일시정지 상태 그대로 유지 (시간 보존, 재개 가능)
    set({ showTimerComplete: false });
  },

  completeTimer: async (finished) => {
    const { timerBook, timerSeconds } = get();
    const book = timerBook;
    const seconds = timerSeconds;
    set({ showTimerComplete: false, timerBook: null, timerSeconds: 0, timerRunning: false });
    const { user } = useUserStore.getState();
    if (!user?.id || !book) return;
    const { readBooks, setReadBooks } = useBooksStore.getState();
    try {
      const existingBook = readBooks.find((b) => b.title === book.title);
      let readBookId: number | undefined;
      if (existingBook) {
        readBookId = existingBook.id;
        const updated = await booksApi.updateStatus(existingBook.id, finished ? 'finished' : 'reading');
        setReadBooks(readBooks.map((b) => (b.id === existingBook.id ? { ...b, status: updated.status } : b)));
      } else {
        const newBook = await booksApi.saveReadBook({
          title: book.title, author: book.author || '', image: book.image || '',
          isbn: book.isbn || '', status: finished ? 'finished' : 'reading',
        } as Partial<ReadBook>);
        readBookId = newBook.id;
        setReadBooks([newBook, ...readBooks]);
      }
      if (readBookId) {
        await readingApi.log(readBookId, seconds, book.startedAt || null);
      }
      set({ lastResult: { finished, title: book.title } });
    } catch (e) {
      console.error('Timer complete error:', e);
    }
  },

  toggleWidgetHidden: () => set((s) => ({ timerWidgetHidden: !s.timerWidgetHidden })),
  setWidgetHidden: (hidden) => set({ timerWidgetHidden: hidden }),
}));
