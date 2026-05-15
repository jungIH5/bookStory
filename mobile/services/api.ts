const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
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
};

// Users
export const usersApi = {
  create: (data: UserForm) =>
    request<User>('/api/users', { method: 'POST', body: JSON.stringify(data) }),

  uploadVoiceSample: async (userId: number, uri: string) => {
    const formData = new FormData();
    formData.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' } as any);
    const response = await fetch(`${API_URL}/api/users/${userId}/voice-sample`, {
      method: 'POST',
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

  getJoined: (userId: number) =>
    request<Club[]>(`/api/clubs/joined?user_id=${userId}`),

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
    const formData = new FormData();
    formData.append('file', { uri, name: 'recording.m4a', type: 'audio/m4a' } as any);
    if (userId) formData.append('user_id', String(userId));
    if (clubId) formData.append('club_id', String(clubId));
    const response = await fetch(`${API_URL}/api/recordings`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },

  get: (id: number) => request<RecordingResult>(`/api/recordings/${id}`),
};

// Sessions (Q&A)
export const sessionsApi = {
  create: (bookTitle: string, analysis: string) =>
    request<Session>('/api/sessions', { method: 'POST', body: JSON.stringify({ book_title: bookTitle, analysis }) }),

  answer: (sessionId: number, answer: string) =>
    request<SessionQA>(`/api/sessions/${sessionId}/answer`, { method: 'POST', body: JSON.stringify({ answer }) }),

  get: (sessionId: number) =>
    request<Session>(`/api/sessions/${sessionId}`),
};

// Tendency & Recommendations
export const tendencyApi = {
  get: (userId: number) => request<Tendency>(`/api/tendency/${userId}`),
  getRecommendations: (userId: number) => request<{ recommendations: Book[] }>(`/api/recommendations/${userId}`),
};

// Types
export interface Book {
  title: string;
  author: string;
  image: string;
  isbn?: string;
  description?: string;
  pubdate?: string;
}

export interface ReadBook extends Book {
  id: number;
  pages?: number;
  saved_at?: string;
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
}

export interface UserForm {
  name: string;
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
