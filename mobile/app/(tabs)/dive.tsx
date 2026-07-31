import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { Waves, BookOpen, Plus, Clock, Trophy, Calendar, Users } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { DiveRoom, LeaderboardEntry, readingApi } from '@/services/api';
import { useDiveStore } from '@/store/useDiveStore';
import { useUserStore } from '@/store/useUserStore';

const formatReadingTime = (seconds: number) => {
  if (!seconds || seconds < 60) return seconds > 0 ? `${seconds}초` : '-';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
};

const fmtTime = (dt: string) => {
  const d = new Date(dt);
  const mm = d.getMonth() + 1; const dd = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: '예정', color: Colors.textMuted, bg: 'rgba(158,141,122,0.08)' },
  reading: { label: '독서 중', color: Colors.secondary, bg: 'rgba(196,148,86,0.1)' },
  discussion: { label: '토론 중', color: Colors.success, bg: 'rgba(34,197,94,0.08)' },
};

export default function DiveScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const { diveRooms, isFetchingRooms, fetchDiveRooms } = useDiveStore();
  const [view, setView] = useState<'rooms' | 'ranking'>('rooms');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rankingView, setRankingView] = useState<'books' | 'time'>('books');
  const [isFetchingBoard, setIsFetchingBoard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchDiveRooms();
    }, [])
  );

  useEffect(() => {
    if (view === 'ranking' && leaderboard.length === 0) {
      setIsFetchingBoard(true);
      readingApi.leaderboard().then(setLeaderboard).catch(() => {}).finally(() => setIsFetchingBoard(false));
    }
  }, [view]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDiveRooms();
    setRefreshing(false);
  };

  const sortedBoard = [...leaderboard].sort((a, b) =>
    rankingView === 'books'
      ? b.books_count - a.books_count || b.total_seconds - a.total_seconds
      : b.total_seconds - a.total_seconds || b.books_count - a.books_count
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Waves size={22} color={Colors.primary} />
            <Text style={styles.title}>독서모임</Text>
          </View>
          <Text style={styles.sub}>함께 읽고 이야기 나누는 실시간 독서 공간입니다.</Text>
        </View>
        {view === 'rooms' && user && (
          <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/dive-room/create' as any)}>
            <Plus size={15} color={Colors.primary} />
            <Text style={styles.createBtnText}>방 개설</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabRow}>
        {[{ id: 'rooms', label: '모임 목록', icon: Waves }, { id: 'ranking', label: '독서 순위', icon: Trophy }].map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.id;
          return (
            <TouchableOpacity key={tab.id} style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={() => setView(tab.id as any)}>
              <Icon size={13} color={active ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {view === 'rooms' ? (
        isFetchingRooms && diveRooms.length === 0 ? (
          <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : (
          <FlatList
            data={diveRooms}
            keyExtractor={(r) => String(r.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            renderItem={({ item, index }) => (
              <RoomCard room={item} idx={index} onOpen={() => router.push(`/dive-room/${item.id}` as any)} />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Waves size={32} color={Colors.border} />
                <Text style={styles.emptyText}>개설된 방이 없습니다.</Text>
                {user && <Text style={styles.emptySub}>첫 번째 독서 모임을 만들어보세요!</Text>}
              </View>
            }
          />
        )
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.subTabRow}>
            {[{ id: 'books', label: '책 수 순위' }, { id: 'time', label: '독서 시간 순위' }].map((sub) => (
              <TouchableOpacity
                key={sub.id}
                style={[styles.subTabBtn, rankingView === sub.id && styles.subTabBtnActive]}
                onPress={() => setRankingView(sub.id as any)}
              >
                <Text style={[styles.subTabText, rankingView === sub.id && styles.subTabTextActive]}>{sub.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {isFetchingBoard ? (
            <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
          ) : (
            <FlatList
              data={sortedBoard}
              keyExtractor={(e) => String(e.id)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item, index }) => <RankRow entry={item} rank={index + 1} isMe={user?.id === item.id} rankingView={rankingView} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Trophy size={32} color={Colors.border} />
                  <Text style={styles.emptyText}>아직 순위 데이터가 없습니다.</Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

function RoomCard({ room, idx, onOpen }: { room: DiveRoom; idx: number; onOpen: () => void }) {
  const scheduled = new Date(room.scheduled_at);
  const diffMin = Math.floor((scheduled.getTime() - Date.now()) / 60000);
  const isSoon = diffMin > 0 && diffMin < 60;
  const badge = STATUS_MAP[room.status] || STATUS_MAP.scheduled;
  const isFull = (room.participant_count || 0) >= room.max_participants;

  return (
    <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: idx * 40 }}>
      <TouchableOpacity style={styles.roomCard} onPress={onOpen} activeOpacity={0.8}>
        <View style={styles.roomCover}>
          {room.book_image
            ? <Image source={{ uri: room.book_image }} style={styles.roomCoverImg} />
            : <BookOpen size={18} color={Colors.primary} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.roomTitleRow}>
            <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
          {!!room.book_title && (
            <View style={styles.rowGap}>
              <BookOpen size={10} color={Colors.primary} />
              <Text style={styles.roomBook} numberOfLines={1}>{room.book_title}</Text>
            </View>
          )}
          <Text style={styles.roomHost}>방장: {room.host_name || '알 수 없음'}</Text>
          <View style={styles.metaRow}>
            <View style={styles.rowGap}>
              <Calendar size={10} color={isSoon ? Colors.secondary : Colors.textMuted} />
              <Text style={[styles.metaText, isSoon && { color: Colors.secondary, fontWeight: '900' }]}>
                {fmtTime(room.scheduled_at)}{isSoon ? ' · 곧 시작!' : ''}
              </Text>
            </View>
            <View style={styles.rowGap}>
              <Clock size={10} color={Colors.textMuted} />
              <Text style={styles.metaText}>독서 {room.reading_minutes}분 + 토론 {room.discussion_minutes}분</Text>
            </View>
            <View style={styles.rowGap}>
              <Users size={10} color={isFull ? Colors.error : Colors.textMuted} />
              <Text style={[styles.metaText, isFull && { color: Colors.error }]}>{room.participant_count || 0}/{room.max_participants}명</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

function RankRow({ entry, rank, isMe, rankingView }: { entry: LeaderboardEntry; rank: number; isMe: boolean; rankingView: 'books' | 'time' }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
  return (
    <View style={[styles.rankRow, rank <= 3 && styles.rankRowTop]}>
      <View style={styles.rankBadge}><Text style={styles.rankBadgeText}>{medal}</Text></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rowGap}>
          <Text style={styles.rankName} numberOfLines={1}>{entry.name}</Text>
          {isMe && <View style={styles.meBadge}><Text style={styles.meBadgeText}>나</Text></View>}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.rankSubLabel}>{rankingView === 'books' ? '읽은 책' : '독서 시간'}</Text>
        <Text style={styles.rankValue}>
          {rankingView === 'books' ? `${entry.books_count}권` : formatReadingTime(entry.total_seconds)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  sub: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', marginTop: 4 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(140,107,66,0.12)',
    borderWidth: 1, borderColor: 'rgba(140,107,66,0.25)', borderRadius: BorderRadius.md,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  createBtnText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
  },
  tabBtnActive: { backgroundColor: 'rgba(140,107,66,0.12)', borderColor: 'rgba(140,107,66,0.3)' },
  tabBtnText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted },
  tabBtnTextActive: { color: Colors.primary },

  subTabRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  subTabBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  subTabBtnActive: { backgroundColor: 'rgba(140,107,66,0.14)', borderColor: 'rgba(140,107,66,0.35)' },
  subTabText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted },
  subTabTextActive: { color: Colors.primary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  listContent: { gap: Spacing.sm, paddingBottom: Spacing.xxl },

  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: FontSize.xs, color: Colors.textMuted },

  roomCard: {
    flexDirection: 'row', gap: Spacing.md, padding: Spacing.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, ...Shadow.sm,
  },
  roomCover: {
    width: 48, height: 68, borderRadius: 6, backgroundColor: 'rgba(140,107,66,0.08)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
  },
  roomCoverImg: { width: '100%', height: '100%' },
  roomTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  roomTitle: { flex: 1, fontWeight: '900', fontSize: FontSize.sm, color: Colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 9, fontWeight: '900' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roomBook: { fontSize: 11, color: Colors.primary, fontWeight: '700', flexShrink: 1 },
  roomHost: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', marginTop: 2, marginBottom: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },

  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md,
    backgroundColor: 'rgba(139,107,66,0.03)', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg,
  },
  rankRowTop: { backgroundColor: 'rgba(196,148,86,0.06)', borderColor: 'rgba(196,148,86,0.2)' },
  rankBadge: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(139,107,66,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  rankBadgeText: { fontSize: 13, fontWeight: '900', color: Colors.textMuted },
  rankName: { fontWeight: '900', fontSize: FontSize.sm, color: Colors.text },
  meBadge: { backgroundColor: 'rgba(140,107,66,0.1)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.2)', borderRadius: BorderRadius.full, paddingHorizontal: 6, paddingVertical: 1 },
  meBadgeText: { fontSize: 9, fontWeight: '900', color: Colors.primary },
  rankSubLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700' },
  rankValue: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text },
});
