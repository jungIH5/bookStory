import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  Modal, ScrollView, Pressable, Alert, TextInput, ActivityIndicator,
  RefreshControl, Platform,
} from 'react-native';
import { MotiView } from 'moti';
import MapView, { Marker } from 'react-native-maps';
import { Users, MapPin, Plus, X, ChevronRight, WifiOff, RefreshCw } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { clubsApi, Club } from '@/services/api';
import { useClubsStore } from '@/store/useClubsStore';
import { useUserStore } from '@/store/useUserStore';

const CATEGORIES = ['독서/기록', '인문학', '소설', '자기계발', '과학', '역사', '철학', '기타'];

export default function ClubsScreen() {
  const { user } = useUserStore();
  const { clubs, joinedClubs, setClubs, setJoinedClubs, toggleJoined } = useClubsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetchData();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
      if (!offline && fetchError) fetchData();
    });
    return unsubscribe;
  }, [user]);

  const fetchData = useCallback(async () => {
    setFetchError(false);
    try {
      const data = await clubsApi.getAll();
      setClubs(data);
      if (user?.id) {
        const joined = await clubsApi.getJoined(user.id);
        setJoinedClubs(joined.map((c) => c.id));
      }
    } catch {
      setFetchError(true);
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleJoin = async (club: Club) => {
    const isJoined = joinedClubs.has(club.id);
    try {
      if (isJoined) {
        await clubsApi.leave(club.id);
      } else {
        await clubsApi.join(club.id);
      }
      toggleJoined(club.id);
    } catch {
      Alert.alert('오류', '처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={clubs}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ClubCard
            club={item}
            isJoined={joinedClubs.has(item.id)}
            onPress={() => setSelectedClub(item)}
            onJoin={() => handleJoin(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Users size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>아직 독서모임이 없어요</Text>
            <Text style={styles.emptySub}>첫 번째 독서모임을 만들어보세요</Text>
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
                <Text style={styles.errorBannerText}>모임 목록을 불러오지 못했습니다.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
                  <RefreshCw size={13} color={Colors.primary} />
                  <Text style={styles.retryText}>다시 시도</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.createBtn} onPress={() => setIsCreating(true)}>
              <Plus size={16} color={Colors.primary} />
              <Text style={styles.createBtnText}>새 독서모임 만들기</Text>
            </TouchableOpacity>
          </>
        }
      />

      {/* 클럽 상세 모달 */}
      <Modal
        visible={!!selectedClub}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedClub(null)}
      >
        {selectedClub && (
          <ClubDetailModal
            club={selectedClub}
            isJoined={joinedClubs.has(selectedClub.id)}
            onClose={() => setSelectedClub(null)}
            onJoin={() => handleJoin(selectedClub)}
          />
        )}
      </Modal>

      {/* 클럽 생성 모달 */}
      <Modal
        visible={isCreating}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsCreating(false)}
      >
        <CreateClubModal
          onClose={() => setIsCreating(false)}
          onCreated={async () => { setIsCreating(false); await fetchData(); }}
        />
      </Modal>
    </View>
  );
}

function ClubCard({ club, isJoined, onPress, onJoin }: {
  club: Club; isJoined: boolean;
  onPress: () => void; onJoin: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardContent}>
        <View style={styles.clubImageWrap}>
          {club.image ? (
            <Image source={{ uri: club.image }} style={styles.clubImage} />
          ) : (
            <View style={[styles.clubImage, styles.clubImagePlaceholder]}>
              <Users size={22} color={Colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.clubInfo}>
          <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
          <View style={styles.clubMeta}>
            <MapPin size={11} color={Colors.textMuted} />
            <Text style={styles.clubLocation} numberOfLines={1}>{club.location}</Text>
            {club.distance != null && (
              <Text style={styles.clubDistance}>{club.distance}km</Text>
            )}
          </View>
          <View style={styles.clubFooter}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{club.category}</Text>
            </View>
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onJoin(); }}
              style={[styles.cardJoinBtn, isJoined && styles.cardJoinBtnJoined]}
            >
              <Text style={[styles.cardJoinText, isJoined && styles.cardJoinTextJoined]}>
                {isJoined ? '탈퇴' : '가입'}
              </Text>
            </Pressable>
          </View>
        </View>
        <ChevronRight size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function ClubDetailModal({ club, isJoined, onClose, onJoin }: {
  club: Club; isJoined: boolean; onClose: () => void; onJoin: () => void;
}) {
  return (
    <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.modalTitle}>독서모임 정보</Text>
      </View>

      {club.image ? (
        <Image source={{ uri: club.image }} style={styles.detailImage} />
      ) : (
        <View style={[styles.detailImage, styles.detailImagePlaceholder]}>
          <Users size={40} color={Colors.textMuted} />
        </View>
      )}

      <View style={styles.detailBody}>
        <Text style={styles.detailName}>{club.name}</Text>
        <View style={styles.detailMeta}>
          <MapPin size={14} color={Colors.textMuted} />
          <Text style={styles.detailLocation}>{club.location}</Text>
        </View>
        <Text style={styles.detailDescription}>{club.description}</Text>

        {club.lat && club.lng && (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: parseFloat(String(club.lat)),
              longitude: parseFloat(String(club.lng)),
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: parseFloat(String(club.lat)),
                longitude: parseFloat(String(club.lng)),
              }}
              title={club.name}
            />
          </MapView>
        )}

        <View style={styles.detailStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{club.member_count ?? 0}</Text>
            <Text style={styles.statLabel}>멤버</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{club.category}</Text>
            <Text style={styles.statLabel}>카테고리</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.joinBtn, isJoined && styles.leaveBtn]}
          onPress={onJoin}
        >
          <Text style={[styles.joinBtnText, isJoined && styles.leaveBtnText]}>
            {isJoined ? '모임 탈퇴' : '모임 가입하기'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function CreateClubModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', category: '독서/기록', location: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.location.trim()) {
      Alert.alert('입력 오류', '모임 이름과 위치를 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      await clubsApi.create(form);
      onCreated();
    } catch {
      Alert.alert('오류', '모임 생성에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.modal, { flex: 1 }]}>
      <View style={styles.modalHeader}>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.modalTitle}>새 독서모임 만들기</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.modalContent, { gap: Spacing.md }]}>
        <FormField label="모임 이름" placeholder="모임 이름을 입력하세요" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <FormField label="위치" placeholder="활동 지역 (예: 서울 강남구)" value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} />
        <FormField label="소개" placeholder="모임 소개를 입력하세요" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} multiline />

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>카테고리</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setForm({ ...form, category: cat })}
                  style={[styles.catChip, form.category === cat && styles.catChipActive]}
                >
                  <Text style={[styles.catChipText, form.category === cat && styles.catChipTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <TouchableOpacity style={[styles.joinBtn, isSaving && { opacity: 0.5 }]} onPress={handleCreate} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.joinBtnText}>모임 만들기</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function FormField({ label, placeholder, value, onChangeText, multiline }: {
  label: string; placeholder: string; value: string;
  onChangeText: (v: string) => void; multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { height: 80, textAlignVertical: 'top' }]}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#374151', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10, marginBottom: Spacing.sm,
  },
  offlineText: { flex: 1, fontSize: FontSize.xs, color: 'white', fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(220,74,60,0.06)', borderWidth: 1, borderColor: 'rgba(220,74,60,0.2)',
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, marginBottom: Spacing.sm,
  },
  errorBannerText: { fontSize: FontSize.xs, color: '#dc4a3c', fontWeight: '700' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  retryText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '800' },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: BorderRadius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, justifyContent: 'center',
  },
  createBtnText: { color: Colors.primary, fontWeight: '800', fontSize: FontSize.sm },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textSecondary },
  emptySub: { fontSize: FontSize.sm, color: Colors.textMuted },

  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  clubImageWrap: { flexShrink: 0 },
  clubImage: { width: 52, height: 52, borderRadius: BorderRadius.md },
  clubImagePlaceholder: { backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  clubInfo: { flex: 1, gap: 4 },
  clubName: { fontSize: FontSize.sm, fontWeight: '900', color: Colors.text },
  clubMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clubLocation: { fontSize: FontSize.xs, color: Colors.textMuted, flex: 1 },
  clubDistance: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '900' },
  clubFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryTag: {
    backgroundColor: 'rgba(140,107,66,0.1)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.2)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
  },
  categoryText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  memberCount: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '700' },
  map: { width: '100%', height: 160, borderRadius: BorderRadius.md, overflow: 'hidden' },
  cardJoinBtn: {
    borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.sm,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  cardJoinBtnJoined: { borderColor: Colors.error },
  cardJoinText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  cardJoinTextJoined: { color: Colors.error },

  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingTop: Platform.OS === 'ios' ? 16 : Spacing.sm,
  },
  closeBtn: { padding: 8 },
  modalTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  modalContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  detailImage: { width: '100%', height: 200 },
  detailImagePlaceholder: { backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  detailBody: { padding: Spacing.md, gap: Spacing.md },
  detailName: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLocation: { fontSize: FontSize.sm, color: Colors.textMuted },
  detailDescription: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
  detailStats: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.border },

  joinBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', ...Shadow.md,
  },
  joinBtnText: { color: 'white', fontWeight: '800', fontSize: FontSize.md },
  leaveBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.error },
  leaveBtnText: { color: Colors.error },

  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.sm,
    fontSize: FontSize.sm, color: Colors.text,
  },
  catChip: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  catChipTextActive: { color: 'white' },
});
