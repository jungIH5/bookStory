import { create } from 'zustand';
import { Post } from '../services/api';

interface CommunityStore {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  toggleLike: (postId: number) => void;
}

export const useCommunityStore = create<CommunityStore>((set) => ({
  posts: [],
  setPosts: (posts) => set({ posts }),
  toggleLike: (postId) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, liked_by_user: !p.liked_by_user, like_count: p.like_count + (p.liked_by_user ? -1 : 1) }
          : p
      ),
    })),
}));
