import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image, Pressable } from 'react-native';
import { BookOpen, CheckCircle2, Clock, X } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { useTimerStore } from '@/store/useTimerStore';

const formatReadingTime = (seconds: number) => {
  if (!seconds || seconds < 60) return seconds > 0 ? `${seconds}초` : '-';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
};

export default function TimerCompleteModal() {
  const { timerBook, timerSeconds, showTimerComplete, completeTimer, cancelTimerComplete } = useTimerStore();
  if (!timerBook) return null;

  return (
    <Modal visible={showTimerComplete} transparent animationType="fade" onRequestClose={cancelTimerComplete}>
      <Pressable style={styles.backdrop} onPress={cancelTimerComplete}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={cancelTimerComplete}>
              <X size={13} color="white" />
            </TouchableOpacity>
            <View style={styles.coverWrap}>
              {timerBook.image
                ? <Image source={{ uri: timerBook.image }} style={styles.cover} />
                : <BookOpen size={20} color={Colors.primary} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.eyebrow}>독서 종료</Text>
              <Text style={styles.bookTitle} numberOfLines={1}>{timerBook.title}</Text>
              {!!timerBook.author && <Text style={styles.bookAuthor}>{timerBook.author}</Text>}
            </View>
          </View>

          <View style={styles.timeRow}>
            <Clock size={14} color={Colors.primary} />
            <Text style={styles.timeLabel}>이번 세션</Text>
            <Text style={styles.timeValue}>{formatReadingTime(timerSeconds)}</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.question}>이 책을 완독하셨나요?</Text>
            <Text style={styles.hint}>완독하셨다면 서재에서 완독 표시가 됩니다.</Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => completeTimer(true)}>
              <CheckCircle2 size={17} color={Colors.secondary} />
              <Text style={styles.primaryBtnText}>완독했어요</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => completeTimer(false)}>
              <Text style={styles.secondaryBtnText}>아직 읽는 중이에요</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  card: { width: '100%', maxWidth: 380, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadow.lg },
  header: { backgroundColor: '#241A11', padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  closeBtn: {
    position: 'absolute', top: 10, right: 10, zIndex: 1, width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  coverWrap: {
    width: 56, height: 80, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(140,107,66,0.2)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cover: { width: '100%', height: '100%' },
  eyebrow: { fontSize: 9, fontWeight: '900', color: Colors.secondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  bookTitle: { fontWeight: '900', fontSize: FontSize.md, color: 'white' },
  bookAuthor: { fontSize: FontSize.xs, color: '#7B6B55', fontWeight: '700', marginTop: 4 },
  timeRow: {
    padding: Spacing.md, backgroundColor: 'rgba(140,107,66,0.04)', borderBottomWidth: 1, borderBottomColor: 'rgba(139,107,66,0.1)',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  timeLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  timeValue: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginLeft: 'auto' },
  body: { padding: Spacing.lg },
  question: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginBottom: 4 },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', marginBottom: Spacing.md, lineHeight: 18 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2C1A0E', borderRadius: BorderRadius.md, padding: 14, marginBottom: 10,
  },
  primaryBtnText: { color: Colors.secondary, fontWeight: '900', fontSize: FontSize.md },
  secondaryBtn: {
    alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, padding: 14,
    borderWidth: 1, borderColor: 'rgba(139,107,66,0.18)',
  },
  secondaryBtnText: { color: Colors.textMuted, fontWeight: '800', fontSize: FontSize.md },
});
