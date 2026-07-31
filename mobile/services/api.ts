import { useUserStore } from '@/store/useUserStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useUserStore.getState().token;
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (response.status === 401) {
    // 토큰 만료 — 로그아웃 처리
    useUserStore.getState().setUser(null);
    throw new Error('unauthorized');
  }
  if (response.status === 429) {
    throw new Error('rate_limited');
  }
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// Books
export const booksApi = {
  search: (query: string) =>
    request<{ items: Book[] }>(`/api/books/search?query=${encodeURIComponent(query)}`),

  analyze: (title: string, author: string) =>
    request<BookAnalysis>(`/api/books/analyze?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`),

  getReadBooks: () =>
    request<ReadBook[]>('/api/books/read'),

  saveReadBook: (book: Partial<ReadBook>) =>
    request<ReadBook>('/api/books/read', { method: 'POST', body: JSON.stringify(book) }),

  updateStatus: (bookId: number, status: 'reading' | 'finished') =>
    request<ReadBook>(`/api/books/read/${bookId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// Users
export const usersApi = {
  create: async (data: UserForm): Promise<User> => {
    const result = await request<{ user: User; token: string }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await useUserStore.getState().setToken(result.token);
    return result.user;
  },

  login: async (name: string, password: string): Promise<User> => {
    const result = await request<{ user: User; token: string }>('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    });
    await useUserStore.getState().setToken(result.token);
    return result.user;
  },

  setInitialPassword: async (name: string, password: string): Promise<User> => {
    const result = await request<{ user: User; token: string }>('/api/users/set-initial-password', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    });
    await useUserStore.getState().setToken(result.token);
    return result.user;
  },

  update: (userId: number, updates: Partial<UserForm> & { ai_persona?: string }) =>
    request<User>(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  uploadVoiceSample: async (userId: number, uri: string) => {
    const token = useUserStore.getState().token;
    const formData = new FormData();
    formData.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' } as any);
    const response = await fetch(`${API_URL}/api/users/${userId}/voice-sample`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },
};

// Clubs
export const clubsApi = {
  getAll: () => request<Club[]>('/api/clubs'),

  create: (data: Partial<Club>) =>
    request<Club>('/api/clubs', { method: 'POST', body: JSON.stringify(data) }),

  getJoined: () =>
    request<Club[]>('/api/clubs/joined'),

  join: (clubId: number) =>
    request(`/api/clubs/${clubId}/join`, { method: 'POST' }),

  leave: (clubId: number) =>
    request(`/api/clubs/${clubId}/leave`, { method: 'DELETE' }),
};

// Community
export const communityApi = {
  getPosts: (userId?: number) => {
    const qs = userId ? `?user_id=${userId}` : '';
    return request<Post[]>(`/api/community/posts${qs}`);
  },

  createPost: (data: Partial<Post>) =>
    request<Post>('/api/community/posts', { method: 'POST', body: JSON.stringify(data) }),

  toggleLike: (postId: number) =>
    request(`/api/community/posts/${postId}/like`, { method: 'POST' }),
};

// Recordings
export const recordingsApi = {
  upload: async (uri: string, userId?: number, clubId?: number) => {
    const token = useUserStore.getState().token;
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'm4a';
    const mimeMap: Record<string, string> = {
      mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/m4a',
      ogg: 'audio/ogg', webm: 'audio/webm',
    };
    const mimeType = mimeMap[ext] ?? 'audio/m4a';

    const formData = new FormData();
    formData.append('file', { uri, name: `recording.${ext}`, type: mimeType } as any);
    if (userId) formData.append('user_id', String(userId));
    if (clubId) formData.append('club_id', String(clubId));

    const response = await fetch(`${API_URL}/api/recordings`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },

  get: (id: number) => request<RecordingResult>(`/api/recordings/${id}`),
};

// Sessions (Q&A)
export const sessionsApi = {
  create: (bookTitle: string, analysis: string) =>
    request<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ book_title: bookTitle, analysis }),
    }),

  answer: (sessionId: number, answer: string) =>
    request<{ question: string }>(`/api/sessions/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    }),

  get: (sessionId: number) =>
    request<Session>(`/api/sessions/${sessionId}`),
};

// Tendency & Recommendations
export const tendencyApi = {
  get: (userId: number) => request<Tendency>(`/api/tendency/${userId}`),
  getRecommendations: (userId: number) =>
    request<{ recommendations: BookRecommendation[] }>(`/api/recommendations/${userId}`),
};

// Album (다이브룸/방 이미지 선택용 사진첩)
export const albumApi = {
  get: (userId: number) => request<AlbumImage[]>(`/api/users/${userId}/album`),
  add: (userId: number, imageData: string) =>
    request<AlbumImage>(`/api/users/${userId}/album`, {
      method: 'POST', body: JSON.stringify({ image_data: imageData }),
    }),
  remove: (userId: number, imageId: number) =>
    request(`/api/users/${userId}/album/${imageId}`, { method: 'DELETE' }),
};

// Reading (개인 독서 기록)
export const readingApi = {
  log: (readBookId: number, durationSeconds: number, startedReadingAt?: string | null) =>
    request(`/api/reading/log`, {
      method: 'POST',
      body: JSON.stringify({ read_book_id: readBookId, duration_seconds: durationSeconds, started_reading_at: startedReadingAt ?? null }),
    }),
  bookReaders: (params: { isbn?: string; title?: string }) => {
    const qs = params.isbn ? `isbn=${encodeURIComponent(params.isbn)}` : `title=${encodeURIComponent(params.title || '')}`;
    return request<BookReader[]>(`/api/reading/book-readers?${qs}`);
  },
  leaderboard: () => request<LeaderboardEntry[]>('/api/reading/leaderboard'),
};

// Dive rooms (독서모임 — 실시간 동기 독서 세션)
export const diveApi = {
  getRooms: () => request<DiveRoom[]>('/api/dive/rooms'),
  getHostedRooms: () => request<DiveRoom[]>('/api/dive/rooms/hosted'),
  getJoinedRooms: () => request<DiveRoom[]>('/api/dive/rooms/joined'),
  getActiveRoom: () => request<DiveRoom | null>('/api/dive/rooms/active'),
  getRoom: (roomId: number) => request<DiveRoom>(`/api/dive/rooms/${roomId}`),
  createRoom: (data: Partial<DiveRoom>) =>
    request<DiveRoom>('/api/dive/rooms', { method: 'POST', body: JSON.stringify(data) }),
  joinRoom: (roomId: number, book?: { book_title: string; book_image?: string; book_isbn?: string }) =>
    request(`/api/dive/rooms/${roomId}/join`, { method: 'POST', body: JSON.stringify(book || {}) }),
  leaveRoom: (roomId: number) => request(`/api/dive/rooms/${roomId}/leave`, { method: 'DELETE' }),
  kickParticipant: (roomId: number, targetUserId: number) =>
    request(`/api/dive/rooms/${roomId}/participants/${targetUserId}`, { method: 'DELETE' }),
  updateMyStatus: (roomId: number, status: 'reading' | 'paused') =>
    request(`/api/dive/rooms/${roomId}/my-status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getMessages: (roomId: number) => request<DiveMessage[]>(`/api/dive/rooms/${roomId}/messages`),
  sendMessage: (roomId: number, content: string, toUserId?: number | null) =>
    request<DiveMessage>(`/api/dive/rooms/${roomId}/messages`, {
      method: 'POST', body: JSON.stringify({ content, to_user_id: toUserId ?? null }),
    }),
  toggleChat: (roomId: number) => request<DiveRoom>(`/api/dive/rooms/${roomId}/chat`, { method: 'PATCH' }),
  updateNotice: (roomId: number, notice: string) =>
    request(`/api/dive/rooms/${roomId}/notice`, { method: 'PATCH', body: JSON.stringify({ notice }) }),
  updateImage: (roomId: number, roomImage: string) =>
    request(`/api/dive/rooms/${roomId}/image`, { method: 'PATCH', body: JSON.stringify({ room_image: roomImage }) }),
  updateStatus: (roomId: number, status: string) =>
    request(`/api/dive/rooms/${roomId}/status?status=${encodeURIComponent(status)}`, { method: 'PATCH' }),
  extendRoom: (roomId: number) => request<DiveRoom>(`/api/dive/rooms/${roomId}/extend`, { method: 'POST' }),
  deleteRoom: (roomId: number) => request(`/api/dive/rooms/${roomId}`, { method: 'DELETE' }),
  aiChat: (roomId: number, message: string, history: { role: string; content: string }[]) =>
    request<{ reply: string }>(`/api/dive/rooms/${roomId}/ai-chat`, {
      method: 'POST', body: JSON.stringify({ message, history }),
    }),
  getPendingConfirmations: () => request<PendingConfirmation[]>('/api/dive/pending-confirmations'),
  confirmTime: (roomId: number, seconds: number) =>
    request(`/api/dive/rooms/${roomId}/confirm-time`, { method: 'POST', body: JSON.stringify({ seconds }) }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Book {
  title: string;
  author: string;
  image: string;
  isbn?: string;
  description?: string;
  pubdate?: string;
}

export interface BookRecommendation extends Book {
  reason?: string;
}

export interface ReadBook extends Book {
  id: number;
  pages?: number;
  saved_at?: string;
  status?: 'reading' | 'finished';
  my_seconds?: number;
}

export interface BookAnalysis {
  analysis: string;
  pages: number;
  questions: {
    thematic: string[];
    perspective_shift: string[];
  };
}

export interface User {
  id: number;
  name: string;
  gender: string;
  age: number;
  location: string;
  lat?: number;
  lng?: number;
  profile_image?: string;
  ai_persona?: string;
}

export interface UserForm {
  name: string;
  password: string;
  gender: string;
  age: number;
  location: string;
  lat?: number;
  lng?: number;
}

export interface Club {
  id: number;
  name: string;
  description: string;
  category: string;
  location: string;
  lat?: number;
  lng?: number;
  image?: string;
  member_count?: number;
  distance?: number;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  book_title?: string;
  author_name?: string;
  author_id?: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  liked_by_user?: boolean;
}

export interface RecordingResult {
  id: number;
  transcript?: string;
  labeled_transcript?: string;
  summary?: string;
  key_topics?: string[];
  followup_questions?: string[];
  user_contributions?: Record<string, string>;
}

export interface Session {
  id: number;
  book_title: string;
  qa_pairs: SessionQA[];
  current_question: string;
}

export interface SessionQA {
  question: string;
  answer?: string;
}

export interface Tendency {
  tendency_summary: string;
  reading_lenses: string[];
  strong_areas: string[];
  growth_areas: string[];
}

export interface AlbumImage {
  id: number;
  image_data: string;
}

export interface BookReader {
  user_id: number;
  name: string;
  profile_image?: string;
  seconds: number;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  books_count: number;
  total_seconds: number;
  rank: number;
}

export interface DiveParticipant {
  id: number;
  user_id: number;
  name: string;
  profile_image?: string;
  book_title?: string;
  book_image?: string;
  book_isbn?: string;
  status: 'reading' | 'paused' | 'ended';
  reading_seconds: number;
}

export interface DiveRoom {
  id: number;
  title: string;
  book_title?: string;
  book_image?: string;
  book_isbn?: string;
  room_image?: string;
  host_id: number;
  host_name?: string;
  host_image?: string;
  scheduled_at: string;
  reading_minutes: number;
  discussion_minutes: number;
  max_participants: number;
  late_join_cutoff_minutes: number;
  notice?: string;
  chat_enabled: boolean;
  status: 'scheduled' | 'reading' | 'discussion' | 'ended';
  extension_count: number;
  participant_count: number;
  participants?: DiveParticipant[];
  host_book_title?: string;
  host_book_image?: string;
  host_book_isbn?: string;
}

export interface DiveMessage {
  id: number;
  room_id: number;
  user_id: number;
  to_user_id?: number | null;
  content: string;
  is_ai: boolean;
  created_at: string;
  user_name?: string;
  user_image?: string;
  to_user_name?: string;
}

export interface PendingConfirmation {
  participant_id: number;
  room_id: number;
  estimated_seconds: number;
  book_title?: string;
  book_image?: string;
  room_title: string;
  scheduled_at: string;
}
