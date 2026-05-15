import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet,
  ActivityIndicator, TouchableOpacity, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp, BookOpen, ArrowLeft } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { tendencyApi, Book } from '@/services/api';
import { useUserStore } from '@/store/useUserStore';

const stripHtml = (str?: string) => str?.replace(/<\/?[^>]+(>|$)/g, '') ?? '';

export default function RecommendationsScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const [recommendations, setRecommendations] = useState<(Book & { reason?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) { setIsLoading(false); setError('로그인이 필요합니다.'); return; }
    tendencyApi.getRecommendations(user.id)
      .then((data) => setRecommendations(data.recommendations as any || []))
      .catch(() => setError('추천 데이터가 부족합니다. 더 많은 책을 읽고 Q&A를 진행해주세요.'))
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>나를 위한 책 추천</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>AI가 추천 목록을 준비 중입니다...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <TrendingUp size={48} color={Colors.border} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={recommendations}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => <RecommendCard book={item} rank={index + 1} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              읽은 책과 Q&A 기록을 바탕으로 선정된 {recommendations.length}권이에요.
            </Text>
          }
        />
      )}
    </View>
  );
}

function RecommendCard({ book, rank }: { book: Book & { reason?: string }; rank: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      {book.image ? (
        <Image source={{ uri: book.image }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <BookOpen size={24} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{stripHtml(book.title)}</Text>
        <Text style={styles.author}>{book.author}</Text>
        {book.reason && (
          <Text style={styles.reason} numberOfLines={3}>{book.reason}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingTop: Platform.OS === 'ios' ? 16 : Spacing.sm,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  loadingText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  errorText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  listHeader: {
    fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600',
    marginBottom: Spacing.sm, lineHeight: 20,
  },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rankText: { fontSize: FontSize.sm, fontWeight: '900', color: 'white' },
  cover: { width: 56, height: 80, borderRadius: 6, flexShrink: 0 },
  coverPlaceholder: { backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 4 },
  title: { fontSize: FontSize.sm, fontWeight: '900', color: Colors.text },
  author: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '700' },
  reason: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18, marginTop: 4 },
});

