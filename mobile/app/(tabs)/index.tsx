import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  Dimensions, Pressable, RefreshControl,
} from 'react-native';
import { MotiView } from 'moti';
import { BookOpen, List, Layers, WifiOff, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { booksApi, ReadBook } from '@/services/api';
import { useBooksStore } from '@/store/useBooksStore';
import { useUserStore } from '@/store/useUserStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOOK_CONTAINER_WIDTH = Math.min(SCREEN_WIDTH - Spacing.md * 2, 420);

const stripHtml = (str?: string) => str?.replace(/<\/?[^>]+(>|$)/g, '') ?? '';

export default function HomeScreen() {
  const router = useRouter();
  const { readBooks, setReadBooks } = useBooksStore();
  const { user, loadUser } = useUserStore();
  const [viewMode, setViewMode] = useState<'tower' | 'list'>('tower');
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const fetchErrorRef = useRef(false);

  const fetchBooks = useCallback(async () => {
    fetchErrorRef.current = false;
    setFetchError(false);
    try {
      const data = await booksApi.getReadBooks();
      setReadBooks(data);
    } catch {
      fetchErrorRef.current = true;
      setFetchError(true);
    }
  }, []);

  useEffect(() => {
    loadUser();
    fetchBooks();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
      if (!offline && fetchErrorRef.current) fetchBooks();
    });
    return unsubscribe;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBooks();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* 오프라인 배너 */}
      {isOffline && (
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.offlineBanner}
        >
          <WifiOff size={14} color="white" />
          <Text style={styles.offlineText}>인터넷 연결이 없습니다. 일부 기능이 제한될 수 있어요.</Text>
        </MotiView>
      )}

      {/* 헤더 — 아바타 + 인사말 + 뷰 토글 */}
      <View style={styles.greetingRow}>
        <Pressable style={styles.avatarArea} onPress={() => router.push('/(tabs)/profile')}>
          {user ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name[0]}</Text>
            </View>
          ) : (
            <View style={[styles.avatar, styles.avatarGuest]}>
              <BookOpen size={18} color={Colors.textMuted} />
            </View>
          )}
          <View>
            <Text style={styles.greetingTitle}>
              {user ? `${user.name}님의 서재` : '나의 서재'}
            </Text>
            <Text style={styles.greetingSubtitle}>
              {readBooks.length > 0 ? `총 ${readBooks.length}권의 책을 읽었어요` : '첫 책을 추가해보세요'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.viewToggle}>
          <Pressable
            onPress={() => setViewMode('tower')}
            style={[styles.toggleBtn, viewMode === 'tower' && styles.toggleBtnActive]}
          >
            <Layers size={14} color={viewMode === 'tower' ? Colors.text : Colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => setViewMode('list')}
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          >
            <List size={14} color={viewMode === 'list' ? Colors.text : Colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* 에러 상태 */}
      {fetchError && !isOffline && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>책 목록을 불러오지 못했습니다.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBooks}>
            <RefreshCw size={13} color={Colors.primary} />
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      {viewMode === 'tower' ? (
        <BookTower books={readBooks} />
      ) : (
        <BookList books={readBooks} />
      )}

      {readBooks.length === 0 && !fetchError && (
        <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/(tabs)/search')}>
          <Text style={styles.ctaText}>책 검색하러 가기</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function BookTower({ books }: { books: ReadBook[] }) {
  return (
    <View style={styles.towerContainer}>
      <ScrollView
        style={styles.towerScroll}
        contentContainerStyle={styles.towerContent}
        showsVerticalScrollIndicator={false}
      >
        {books.length === 0 ? (
          <View style={styles.emptyTower}>
            <BookOpen size={32} color={Colors.textMuted} />
            <Text style={styles.emptyTowerTitle}>당신만의 지식 타워를 세우세요</Text>
            <Text style={styles.emptyTowerSub}>검색으로 책을 찾아 서재에 추가해보세요</Text>
          </View>
        ) : (
          [...books].reverse().map((book, idx) => (
            <BookSpine key={book.id ?? idx} book={book} idx={idx} total={books.length} />
          ))
        )}
      </ScrollView>
      <View style={styles.towerShelf} />
    </View>
  );
}

function BookSpine({ book, idx }: { book: ReadBook; idx: number; total: number }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const color = Colors.bookColors[idx % Colors.bookColors.length];
  const pages = book.pages ?? 250;
  const height = Math.max(36, Math.min(64, pages / 6));
  const widthPct = Math.min(96, 82 + (idx % 4) * 4);

  return (
    <MotiView
      from={{ opacity: 0, scaleX: 0.7 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ type: 'spring', delay: idx * 60, damping: 18 }}
      style={[styles.spineWrapper, { width: `${widthPct}%` }]}
    >
      {showTooltip && (
        <View style={styles.tooltip}>
          <View style={[styles.tooltipDot, { backgroundColor: color }]} />
          <Text style={styles.tooltipText}>{book.author}</Text>
        </View>
      )}
      <Pressable
        onPress={() => setShowTooltip((v) => !v)}
        style={[styles.spine, { backgroundColor: color, height }]}
      >
        <Text style={styles.spineTitle} numberOfLines={1}>
          {stripHtml(book.title).toUpperCase()}
        </Text>
      </Pressable>
    </MotiView>
  );
}

function BookList({ books }: { books: ReadBook[] }) {
  if (books.length === 0) {
    return (
      <View style={styles.emptyList}>
        <BookOpen size={36} color={Colors.textMuted} />
        <Text style={styles.emptyListText}>아직 기록된 책이 없습니다.</Text>
      </View>
    );
  }
  return (
    <View style={styles.list}>
      {books.map((book) => (
        <BookListItem key={book.id} book={book} />
      ))}
    </View>
  );
}

function BookListItem({ book }: { book: ReadBook }) {
  return (
    <View style={styles.listItem}>
      {book.image ? (
        <Image source={{ uri: book.image }} style={styles.listCover} />
      ) : (
        <View style={[styles.listCover, styles.listCoverPlaceholder]}>
          <BookOpen size={20} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.listInfo}>
        <Text style={styles.listTitle} numberOfLines={1}>{stripHtml(book.title)}</Text>
        <Text style={styles.listAuthor}>{book.author}</Text>
        {book.saved_at && (
          <Text style={styles.listDate}>{new Date(book.saved_at).toLocaleDateString('ko-KR')}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#374151',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  offlineText: { flex: 1, fontSize: FontSize.xs, color: 'white', fontWeight: '600', lineHeight: 16 },

  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarArea: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  avatarGuest: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  avatarText: { fontSize: FontSize.md, fontWeight: '900', color: 'white' },
  greetingTitle: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  greetingSubtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', marginTop: 1 },

  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139,107,66,0.08)',
    borderRadius: BorderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: { padding: 8, borderRadius: BorderRadius.sm },
  toggleBtnActive: { backgroundColor: Colors.surface, ...Shadow.sm },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(220,74,60,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(220,74,60,0.2)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  errorBannerText: { fontSize: FontSize.xs, color: '#dc4a3c', fontWeight: '700' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  retryText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '800' },

  towerContainer: {
    width: BOOK_CONTAINER_WIDTH,
    alignSelf: 'center',
    height: 520,
    backgroundColor: '#2C1A10',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(139,107,66,0.15)',
    overflow: 'hidden',
    ...Shadow.lg,
    marginBottom: Spacing.xl,
  },
  towerScroll: { flex: 1 },
  towerContent: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 60,
    paddingBottom: 4,
  },
  towerShelf: {
    width: '100%',
    height: 22,
    backgroundColor: '#3d1a00',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,107,66,0.15)',
  },

  spineWrapper: { alignItems: 'center', marginBottom: 2 },
  spine: {
    width: '100%',
    borderRadius: 3,
    borderLeftWidth: 5,
    borderLeftColor: 'rgba(0,0,0,0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  spineTitle: { fontSize: 11, fontWeight: '900', color: 'white', fontStyle: 'italic', letterSpacing: -0.2 },

  tooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(139,107,66,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 4,
  },
  tooltipDot: { width: 8, height: 8, borderRadius: 4 },
  tooltipText: { fontSize: 11, fontWeight: '900', color: 'white' },

  emptyTower: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTowerTitle: { fontSize: FontSize.md, fontWeight: '900', color: Colors.textSecondary },
  emptyTowerSub: { fontSize: FontSize.sm, color: Colors.textMuted },

  emptyList: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyListText: { color: Colors.textSecondary, fontWeight: '700' },

  list: { gap: Spacing.sm },
  listItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  listCover: { width: 48, height: 68, borderRadius: 6 },
  listCoverPlaceholder: { backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  listInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  listTitle: { fontSize: FontSize.sm, fontWeight: '900', color: Colors.text },
  listAuthor: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '700' },
  listDate: { fontSize: FontSize.xs, color: Colors.textMuted },

  ctaButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadow.md,
  },
  ctaText: { color: 'white', fontWeight: '800', fontSize: FontSize.md },
});
