import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, Image, Pressable } from 'react-native';
import { BookOpen, Clock, X } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { useDiveStore } from '@/store/useDiveStore';

const formatReadingTime = (seconds: number) => {
  if (!seconds || seconds < 60) return seconds > 0 ? `${seconds}초` : '-';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
};

export default function PendingTimeConfirmModal() {
  const { pendingTimeConfirmations, confirmPendingTime, dismissPendingConfirmation } = useDiveStore();
  const item = pendingTimeConfirmations[0];
  const [minutes, setMinutes] = useState('0');

  useEffect(() => {
    if (item) setMinutes(String(Math.round((item.estimated_seconds || 0) / 60)));
  }, [item?.room_id]);

  if (!item) return null;

  const handleConfirm = () => {
    const mins = Math.max(0, parseInt(minutes, 10) || 0);
    confirmPendingTime(item.room_id, mins * 60);
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => dismissPendingConfirmation(item.room_id)}>
            <X size={13} color="white" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.coverWrap}>
              {item.book_image
                ? <Image source={{ uri: item.book_image }} style={styles.cover} />
                : <BookOpen size={20} color={Colors.primary} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.eyebrow}>세션이 자동 종료됐어요</Text>
              <Text style={styles.roomTitle} numberOfLines={1}>{item.room_title}</Text>
              {!!item.book_title && <Text style={styles.bookTitle} numberOfLines={1}>{item.book_title}</Text>}
            </View>
          </View>

          <View style={styles.timeRow}>
            <Clock size={14} color={Colors.primary} />
            <Text style={styles.timeLabel}>자동 계산된 예상 시간</Text>
            <Text style={styles.timeValue}>{formatReadingTime(item.estimated_seconds)}</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.question}>독서기록을 켜둔 채로 자리를 비우셨나 봐요</Text>
            <Text style={styles.hint}>
              실제로 읽으신 시간(분)을 확인하고 저장해주세요. 정확히 기억나지 않으면 예상치를 그대로 두셔도 괜찮아요.
            </Text>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
              />
              <Text style={styles.inputUnit}>분</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirm}>
              <Text style={styles.primaryBtnText}>확인 및 저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  card: { width: '100%', maxWidth: 380, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadow.lg },
  closeBtn: {
    position: 'absolute', top: 10, right: 10, zIndex: 1, width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  header: { backgroundColor: '#241A11', padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  coverWrap: {
    width: 56, height: 80, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(140,107,66,0.2)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cover: { width: '100%', height: '100%' },
  eyebrow: { fontSize: 9, fontWeight: '900', color: Colors.secondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  roomTitle: { fontWeight: '900', fontSize: FontSize.md, color: 'white' },
  bookTitle: { fontSize: FontSize.xs, color: '#7B6B55', fontWeight: '700', marginTop: 4 },
  timeRow: {
    padding: Spacing.md, backgroundColor: 'rgba(140,107,66,0.04)', borderBottomWidth: 1, borderBottomColor: 'rgba(139,107,66,0.1)',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  timeLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  timeValue: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginLeft: 'auto' },
  body: { padding: Spacing.lg },
  question: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginBottom: 4 },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', marginBottom: Spacing.md, lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  input: {
    flex: 1, padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(139,107,66,0.25)',
    backgroundColor: 'white', fontSize: FontSize.md, fontWeight: '800', color: Colors.text, textAlign: 'center',
  },
  inputUnit: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  primaryBtn: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C1A0E', borderRadius: BorderRadius.md, padding: 14,
  },
  primaryBtnText: { color: Colors.secondary, fontWeight: '900', fontSize: FontSize.md },
});
