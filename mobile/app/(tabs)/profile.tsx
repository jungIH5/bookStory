import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, ChevronRight, LogOut, Sparkles, BookOpen, TrendingUp } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { usersApi, tendencyApi, Tendency } from '@/services/api';
import { useUserStore } from '@/store/useUserStore';

const GENDERS = ['남성', '여성', '기타'];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, setUser, loadUser } = useUserStore();

  const [form, setForm] = useState({ name: '', gender: '남성', age: '25', location: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [tendency, setTendency] = useState<Tendency | null>(null);
  const [isFetchingTendency, setIsFetchingTendency] = useState(false);
  const [showTendency, setShowTendency] = useState(false);

  useEffect(() => { loadUser(); }, []);

  const handleRegister = async () => {
    if (!form.name.trim() || !form.location.trim()) {
      Alert.alert('입력 오류', '이름과 지역을 입력해주세요.');
      return;
    }
    const age = parseInt(form.age);
    if (isNaN(age) || age < 1 || age > 120) {
      Alert.alert('입력 오류', '올바른 나이를 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const newUser = await usersApi.create({ ...form, age });
      setUser(newUser);
      Alert.alert('등록 완료', '환영합니다!');
    } catch {
      Alert.alert('오류', '등록 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchTendency = async () => {
    if (!user?.id) return;
    setIsFetchingTendency(true);
    try {
      const data = await tendencyApi.get(user.id);
      setTendency(data);
      setShowTendency(true);
    } catch {
      Alert.alert('오류', '분석 데이터가 부족합니다. 더 많은 책을 분석하고 Q&A를 진행해주세요.');
    } finally {
      setIsFetchingTendency(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '확인', onPress: () => setUser(null), style: 'destructive' },
    ]);
  };

  if (!user) {
    return <RegisterForm form={form} setForm={setForm} isSaving={isSaving} onSubmit={handleRegister} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{user.name[0]}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileMeta}>{user.age}세 · {user.gender} · {user.location}</Text>
          <View style={styles.badge}>
            <BookOpen size={11} color={Colors.primary} />
            <Text style={styles.badgeText}>Active Reader</Text>
          </View>
        </View>
      </View>

      {/* 성향 분석 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>독서 성향 분석</Text>
        <Text style={styles.sectionSub}>Q&A를 통해 쌓인 데이터로 독서 성향을 분석해드려요.</Text>

        {!showTendency ? (
          <TouchableOpacity
            style={[styles.tendencyBtn, isFetchingTendency && { opacity: 0.5 }]}
            onPress={handleFetchTendency}
            disabled={isFetchingTendency}
          >
            {isFetchingTendency
              ? <ActivityIndicator size="small" color="white" />
              : <Sparkles size={16} color="white" />}
            <Text style={styles.tendencyBtnText}>
              {isFetchingTendency ? '분석 중...' : '내 독서 성향 분석하기'}
            </Text>
          </TouchableOpacity>
        ) : tendency ? (
          <TendencyResult tendency={tendency} />
        ) : null}
      </View>

      {/* 책 추천 */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push('/recommendations')}
      >
        <TrendingUp size={20} color={Colors.primary} />
        <Text style={styles.menuText}>나를 위한 책 추천</Text>
        <ChevronRight size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* 로그아웃 */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={16} color={Colors.error} />
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function TendencyResult({ tendency }: { tendency: Tendency }) {
  return (
    <View style={styles.tendencyResult}>
      <Text style={styles.tendencySummary}>{tendency.tendency_summary}</Text>

      {tendency.reading_lenses.length > 0 && (
        <View style={styles.lensWrap}>
          <Text style={styles.lensLabel}>독서 렌즈</Text>
          <View style={styles.chipRow}>
            {tendency.reading_lenses.map((lens, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{lens}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {tendency.strong_areas.length > 0 && (
        <View>
          <Text style={styles.areaLabel}>강점 영역</Text>
          {tendency.strong_areas.map((area, i) => (
            <View key={i} style={styles.areaItem}>
              <View style={[styles.areaDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.areaText}>{area}</Text>
            </View>
          ))}
        </View>
      )}

      {tendency.growth_areas.length > 0 && (
        <View>
          <Text style={styles.areaLabel}>성장 영역</Text>
          {tendency.growth_areas.map((area, i) => (
            <View key={i} style={styles.areaItem}>
              <View style={[styles.areaDot, { backgroundColor: Colors.secondary }]} />
              <Text style={styles.areaText}>{area}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function RegisterForm({ form, setForm, isSaving, onSubmit }: {
  form: { name: string; gender: string; age: string; location: string };
  setForm: (f: any) => void;
  isSaving: boolean;
  onSubmit: () => void;
}) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.registerHeader}>
        <View style={styles.registerIcon}>
          <User size={32} color={Colors.primary} />
        </View>
        <Text style={styles.registerTitle}>프로필 등록</Text>
        <Text style={styles.registerSub}>독서모임 가입과 성향 분석을 위해 간단한 정보를 입력해주세요.</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.fieldLabel}>이름</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="이름을 입력하세요"
          placeholderTextColor={Colors.textMuted}
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
          maxLength={20}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.fieldLabel}>성별</Text>
        <View style={styles.genderRow}>
          {GENDERS.map((g) => (
            <Pressable
              key={g}
              onPress={() => setForm({ ...form, gender: g })}
              style={[styles.genderBtn, form.gender === g && styles.genderBtnActive]}
            >
              <Text style={[styles.genderText, form.gender === g && styles.genderTextActive]}>{g}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.fieldLabel}>나이</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="나이를 입력하세요"
          placeholderTextColor={Colors.textMuted}
          value={form.age}
          onChangeText={(v) => setForm({ ...form, age: v })}
          keyboardType="number-pad"
          maxLength={3}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.fieldLabel}>활동 지역</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="예: 서울 강남구"
          placeholderTextColor={Colors.textMuted}
          value={form.location}
          onChangeText={(v) => setForm({ ...form, location: v })}
          maxLength={50}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, isSaving && { opacity: 0.5 }]}
        onPress={onSubmit}
        disabled={isSaving}
      >
        {isSaving
          ? <ActivityIndicator color="white" />
          : <Text style={styles.submitBtnText}>등록하기</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.md,
  },
  avatarWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: '900', color: 'white' },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text },
  profileMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(140,107,66,0.1)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.2)',
    borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: '900', color: Colors.primary },

  section: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text },
  sectionSub: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },

  tendencyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, ...Shadow.sm,
  },
  tendencyBtnText: { color: 'white', fontWeight: '800', fontSize: FontSize.sm },

  tendencyResult: { gap: Spacing.md },
  tendencySummary: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
  lensWrap: { gap: 8 },
  lensLabel: { fontSize: FontSize.xs, fontWeight: '900', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'rgba(140,107,66,0.1)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.2)',
    borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 4,
  },
  chipText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  areaLabel: { fontSize: FontSize.xs, fontWeight: '900', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  areaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  areaDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  areaText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  menuText: { flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.text },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.error, borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  logoutText: { color: Colors.error, fontWeight: '800', fontSize: FontSize.sm },

  // Register form
  registerHeader: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  registerIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(140,107,66,0.1)', borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  registerTitle: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  registerSub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  formGroup: { gap: 6 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.sm,
    fontSize: FontSize.md, color: Colors.text,
  },

  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: {
    flex: 1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center',
  },
  genderBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  genderText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  genderTextActive: { color: 'white' },

  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', ...Shadow.md, marginTop: Spacing.sm,
  },
  submitBtnText: { color: 'white', fontWeight: '800', fontSize: FontSize.md },
});
