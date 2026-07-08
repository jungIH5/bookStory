import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Pressable, Alert, TextInput,
  ActivityIndicator, RefreshControl, Platform, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { MotiView } from 'moti';
import { MessageSquare, Heart, MessageCircle, Plus, X, WifiOff, RefreshCw } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { communityApi, Post } from '@/services/api';
import { useCommunityStore } from '@/store/useCommunityStore';
import { useUserStore } from '@/store/useUserStore';

export default function CommunityScreen() {
  const { user } = useUserStore();
  const { posts, setPosts, toggleLike } = useCommunityStore();
  const [refreshing, setRefreshing] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const fetchErrorRef = useRef(false);

  const fetchPosts = useCallback(async () => {
    fetchErrorRef.current = false;
    setFetchError(false);
    try {
      const data = await communityApi.getPosts(user?.id);
      setPosts(data);
    } catch {
      fetchErrorRef.current = true;
      setFetchError(true);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
      if (!offline && fetchErrorRef.current) fetchPosts();
    });
    return unsubscribe;
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handleLike = async (postId: number) => {
    toggleLike(postId);
    try {
      await communityApi.toggleLike(postId);
    } catch {
      toggleLike(postId);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PostCard post={item} onLike={() => handleLike(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MessageSquare size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>아직 게시글이 없어요</Text>
            <Text style={styles.emptySub}>첫 번째 글을 작성해보세요</Text>
          </View>
        }
        ListHeaderComponent={
          <>
            {isOffline && (
              <MotiView
                from={{ opacity: 0, translateY: -8 }}
                animate={{ opacity: 1, translateY: 0 }}
                style={styles.offlineBanner}
              >
                <WifiOff size={14} color="white" />
                <Text style={styles.offlineText}>인터넷 연결이 없습니다.</Text>
              </MotiView>
            )}
            {fetchError && !isOffline && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>게시글을 불러오지 못했습니다.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchPosts}>
                  <RefreshCw size={13} color={Colors.primary} />
                  <Text style={styles.retryText}>다시 시도</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>지식 나눔 광장</Text>
                <Text style={styles.headerSub}>책을 통해 더 넓은 세상을 만나는 곳</Text>
              </View>
              <TouchableOpacity style={styles.writeBtn} onPress={() => setIsWriting(true)}>
                <Plus size={16} color={Colors.primary} />
                <Text style={styles.writeBtnText}>글쓰기</Text>
              </TouchableOpacity>
            </View>
          </>
        }
      />

      <Modal
        visible={isWriting}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsWriting(false)}
      >
        <WritePostModal
          onClose={() => setIsWriting(false)}
          onPosted={async () => { setIsWriting(false); await fetchPosts(); }}
          userId={user?.id}
        />
      </Modal>
    </View>
  );
}

function PostCard({ post, onLike }: { post: Post; onLike: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardAccent} />
      <View style={styles.cardBody}>
        <View style={styles.tagRow}>
          <View style={styles.generalTag}>
            <Text style={styles.generalTagText}>General</Text>
          </View>
          {post.book_title && (
            <Text style={styles.bookTagText} numberOfLines={1}>『{post.book_title}』</Text>
          )}
        </View>

        <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
        <Text style={styles.postContent} numberOfLines={3}>{post.content}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.cardActions}>
            <Pressable onPress={onLike} style={styles.actionBtn}>
              <Heart
                size={14}
                color={post.liked_by_user ? '#fb7185' : Colors.textMuted}
                fill={post.liked_by_user ? '#fb7185' : 'none'}
              />
              <Text style={[styles.actionCount, post.liked_by_user && styles.likedCount]}>
                {post.like_count}
              </Text>
            </Pressable>
            <Pressable style={styles.actionBtn}>
              <MessageCircle size={14} color={Colors.textMuted} />
              <Text style={styles.actionCount}>{post.comment_count}</Text>
            </Pressable>
          </View>

          <View style={styles.authorRow}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorInitial}>{(post.author_name || '?')[0]}</Text>
            </View>
            <Text style={styles.authorName}>{post.author_name || '익명'}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.postDate}>
              {new Date(post.created_at).toLocaleDateString('ko-KR')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function WritePostModal({ onClose, onPosted, userId }: {
  onClose: () => void; onPosted: () => void; userId?: number;
}) {
  const [form, setForm] = useState({ title: '', content: '', book_title: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('입력 오류', '제목과 내용을 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      await communityApi.createPost({ ...form, author_id: userId });
      onPosted();
    } catch {
      Alert.alert('오류', '게시글 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={styles.modal}>
      <View style={styles.modalHeader}>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.modalTitle}>새 글 작성</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.submitBtn, isSubmitting && { opacity: 0.5 }]}
        >
          {isSubmitting
            ? <ActivityIndicator size="small" color="white" />
            : <Text style={styles.submitBtnText}>게시</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.modalContent, { gap: Spacing.md }]} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.titleInput}
          placeholder="제목을 입력하세요"
          placeholderTextColor={Colors.textMuted}
          value={form.title}
          onChangeText={(v) => setForm({ ...form, title: v })}
          maxLength={100}
        />
        <TextInput
          style={styles.contentInput}
          placeholder="내용을 입력하세요"
          placeholderTextColor={Colors.textMuted}
          value={form.content}
          onChangeText={(v) => setForm({ ...form, content: v })}
          multiline
          textAlignVertical="top"
        />
        <TextInput
          style={styles.bookTitleInput}
          placeholder="관련 도서 (선택)"
          placeholderTextColor={Colors.textMuted}
          value={form.book_title}
          onChangeText={(v) => setForm({ ...form, book_title: v })}
        />
      </ScrollView>
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingBottom: Spacing.xxl },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#374151', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
  },
  offlineText: { flex: 1, fontSize: FontSize.xs, color: 'white', fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(220,74,60,0.06)', borderWidth: 1, borderColor: 'rgba(220,74,60,0.2)',
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10,
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
  },
  errorBannerText: { fontSize: FontSize.xs, color: '#dc4a3c', fontWeight: '700' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  retryText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '800' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', marginTop: 2 },
  writeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: 8,
  },
  writeBtnText: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textSecondary },
  emptySub: { fontSize: FontSize.sm, color: Colors.textMuted },

  card: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cardAccent: { width: 3, backgroundColor: Colors.primary, opacity: 0 },
  cardBody: { flex: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg, gap: 8 },

  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  generalTag: {
    backgroundColor: 'rgba(140,107,66,0.1)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.2)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
  },
  generalTagText: { fontSize: 9, fontWeight: '900', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  bookTagText: { fontSize: FontSize.xs, color: Colors.textMuted, flex: 1 },

  postTitle: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, lineHeight: 22 },
  postContent: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  likedCount: { color: '#fb7185' },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  authorInitial: { fontSize: 9, fontWeight: '900', color: 'white' },
  authorName: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  dot: { color: Colors.textMuted, fontSize: FontSize.xs },
  postDate: { fontSize: 11, color: Colors.textMuted },

  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingTop: Platform.OS === 'ios' ? 16 : Spacing.sm,
  },
  closeBtn: { padding: 8 },
  modalTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  submitBtnText: { color: 'white', fontWeight: '800', fontSize: FontSize.sm },
  modalContent: { padding: Spacing.md },

  titleInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.sm,
    fontSize: FontSize.lg, fontWeight: '700', color: Colors.text,
  },
  contentInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.sm,
    fontSize: FontSize.sm, color: Colors.text, height: 200,
  },
  bookTitleInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.sm,
    fontSize: FontSize.sm, color: Colors.text,
  },
});
