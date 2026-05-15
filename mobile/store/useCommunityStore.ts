import { create } from 'zustand';
import { Post } from '../services/api';

interface CommunityStore {
  posts: Post[];
  isLoading: boolean;
  setPosts: (posts: Post[]) => void;
  setIsLoading: (v: boolean) => void;
  toggleLike: (postId: number) => void;
}

export const useCommunityStore = create<CommunityStore>((set) => ({
  posts: [],
  isLoading: false,
  setPosts: (posts) => set({ posts }),
  setIsLoading: (v) => set({ isLoading: v }),
  toggleLike: (postId) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, liked_by_user: !p.liked_by_user, like_count: p.like_count + (p.liked_by_user ? -1 : 1) }
          : p
      ),
    })),
}));
