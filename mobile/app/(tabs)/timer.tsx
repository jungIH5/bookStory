import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image,
  StyleSheet, Pressable, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { MotiView } from 'moti';
import { Timer, Play, Pause, Square, BookOpen, Search, X } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { booksApi, Book } from '@/services/api';
import { useBooksStore } from '@/store/useBooksStore';
import { useUserStore } from '@/store/useUserStore';
import { useTimerStore } from '@/store/useTimerStore';

const stripHtml = (str?: string) => str?.replace(/<\/?[^>]+(>|$)/g, '') ?? '';

const formatTimer = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

export default function TimerScreen() {
  const { user } = useUserStore();
  const { readBooks } = useBooksStore();
  const {
    timerBook, timerSeconds, timerRunning, timerWidgetHidden,
    startTimer, pauseTimer, resumeTimer, stopTimer, toggleWidgetHidden,
  } = useTimerStore();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setSelectedBook(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await booksApi.search(val);
        setSearchResults(data.items || []);
      } catch { setSearchResults([]); }
    }, 380);
  };

  const select = (book: Book) => {
    setSelectedBook(book);
    setQuery(stripHtml(book.title));
    setSearchResults([]);
  };

  const clearSelection = () => {
    setSelectedBook(null);
    setQuery('');
    setSearchResults([]);
  };

  const handleStart = () => {
    if (!selectedBook) return;
    startTimer({ title: stripHtml(selectedBook.title), author: selectedBook.author || '', image: selectedBook.image || '' });
    clearSelection();
  };

  const libraryMatches = query.trim()
    ? readBooks.filter((b) => stripHtml(b.title).toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : readBooks.slice(0, 8);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Timer size={24} color={Colors.primary} />
          <View>
            <Text style={styles.headerTitle}>독서 타이머</Text>
            <Text style={styles.headerSub}>독서 시간을 기록하고 나만의 습관을 만들어보세요.</Text>
          </View>
        </View>

        {timerBook ? (
          <MotiView from={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={styles.activeCard}>
            <View style={styles.activeHeader}>
              <View style={styles.coverWrap}>
                {timerBook.image
                  ? <Image source={{ uri: timerBook.image }} style={styles.cover} />
                  : <BookOpen size={22} color={Colors.primary} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.eyebrow}>읽는 중</Text>
                <Text style={styles.activeTitle} numberOfLines={2}>{timerBook.title}</Text>
                {!!timerBook.author && <Text style={styles.activeAuthor}>{timerBook.author}</Text>}
              </View>
            </View>

            <View style={styles.timeDisplay}>
              <Text style={[styles.timeText, { color: timerRunning ? Colors.secondary : '#7B6B55' }]}>
                {formatTimer(timerSeconds)}
              </Text>
              <Text style={styles.timeStatus}>{timerRunning ? '독서 중...' : '일시 정지됨'}</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.pauseBtn} onPress={timerRunning ? pauseTimer : resumeTimer}>
                {timerRunning ? <Pause size={15} color={Colors.secondary} /> : <Play size={15} color={Colors.secondary} />}
                <Text style={styles.pauseBtnText}>{timerRunning ? '일시정지' : '계속 읽기'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopBtn} onPress={stopTimer}>
                <Square size={13} color="#ef4444" />
                <Text style={styles.stopBtnText}>독서 종료</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.widgetToggle} onPress={toggleWidgetHidden}>
              <Text style={styles.widgetToggleText}>
                {timerWidgetHidden ? '떠있는 위젯 다시 보기' : '떠있는 위젯 숨김 (다른 탭에서 안 보임)'}
              </Text>
            </TouchableOpacity>
          </MotiView>
        ) : (
          <View style={styles.setupCard}>
            <Text style={styles.fieldLabel}>책 선택</Text>
            <View style={{ position: 'relative' }}>
              <View style={styles.searchBox}>
                <Search size={14} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="제목 또는 저자 검색, 또는 서재에서 선택"
                  placeholderTextColor={Colors.textMuted}
                  value={query}
                  onChangeText={handleQueryChange}
                />
                {!!query && (
                  <TouchableOpacity onPress={clearSelection}>
                    <X size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {selectedBook && (
                <View style={styles.selectedRow}>
                  {selectedBook.image
                    ? <Image source={{ uri: selectedBook.image }} style={styles.selectedCover} />
                    : <View style={[styles.selectedCover, styles.selectedCoverPlaceholder]}><BookOpen size={14} color={Colors.primary} /></View>}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.selectedTitle} numberOfLines={1}>{stripHtml(selectedBook.title)}</Text>
                    {!!selectedBook.author && <Text style={styles.selectedAuthor}>{selectedBook.author}</Text>}
                  </View>
                </View>
              )}

              {!selectedBook && (libraryMatches.length > 0 || searchResults.length > 0) && (
                <View style={styles.dropdown}>
                  {libraryMatches.length > 0 && (
                    <>
                      <Text style={styles.dropdownLabel}>내 서재</Text>
                      {libraryMatches.map((book) => (
                        <Pressable
                          key={book.id}
                          style={styles.dropdownRow}
                          onPress={() => select({ title: stripHtml(book.title), author: book.author || '', image: book.image || '' })}
                        >
                          {book.image
                            ? <Image source={{ uri: book.image }} style={styles.dropdownCover} />
                            : <View style={[styles.dropdownCover, styles.selectedCoverPlaceholder]}><BookOpen size={10} color={Colors.primary} /></View>}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.dropdownTitle} numberOfLines={1}>{stripHtml(book.title)}</Text>
                            <Text style={styles.dropdownAuthor}>{book.author}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </>
                  )}
                  {searchResults.length > 0 && (
                    <>
                      <Text style={styles.dropdownLabel}>검색 결과</Text>
                      {searchResults.slice(0, 6).map((book, i) => (
                        <Pressable key={i} style={styles.dropdownRow} onPress={() => select(book)}>
                          {book.image
                            ? <Image source={{ uri: book.image }} style={styles.dropdownCover} />
                            : <View style={[styles.dropdownCover, styles.selectedCoverPlaceholder]}><BookOpen size={10} color={Colors.primary} /></View>}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.dropdownTitle} numberOfLines={1}>{stripHtml(book.title)}</Text>
                            <Text style={styles.dropdownAuthor}>{book.author}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </>
                  )}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.startBtn, !selectedBook && { opacity: 0.4 }]}
              onPress={handleStart}
              disabled={!selectedBook}
            >
              <Play size={16} color="white" />
              <Text style={styles.startBtnText}>읽기 시작</Text>
            </TouchableOpacity>

            {!user && <Text style={styles.loginHint}>로그인 후 독서 시간이 기록됩니다.</Text>}
          </View>
        )}
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.lg },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', marginTop: 2 },

  activeCard: {
    backgroundColor: '#241A11', borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(139,107,66,0.3)', ...Shadow.lg,
  },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  coverWrap: {
    width: 64, height: 92, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(140,107,66,0.15)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cover: { width: '100%', height: '100%' },
  eyebrow: { fontSize: 9, fontWeight: '900', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  activeTitle: { fontWeight: '900', fontSize: FontSize.md, color: 'white', lineHeight: 20 },
  activeAuthor: { fontSize: FontSize.xs, color: '#7B6B55', fontWeight: '700', marginTop: 4 },

  timeDisplay: { alignItems: 'center', marginBottom: Spacing.lg },
  timeText: { fontFamily: 'monospace', fontSize: 48, fontWeight: '900', letterSpacing: 1 },
  timeStatus: { fontSize: FontSize.xs, color: '#5A4A3A', fontWeight: '700', marginTop: 6 },

  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  pauseBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(196,148,86,0.15)', borderRadius: BorderRadius.md, padding: 12,
    borderWidth: 1, borderColor: 'rgba(196,148,86,0.3)',
  },
  pauseBtnText: { color: Colors.secondary, fontWeight: '800', fontSize: FontSize.sm },
  stopBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: BorderRadius.md, padding: 12,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  stopBtnText: { color: '#ef4444', fontWeight: '800', fontSize: FontSize.sm },

  widgetToggle: {
    marginTop: Spacing.sm, padding: 8, borderRadius: BorderRadius.md, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(139,107,66,0.3)', borderStyle: 'dashed',
  },
  widgetToggleText: { color: '#7B6B55', fontWeight: '700', fontSize: FontSize.xs },

  setupCard: {
    backgroundColor: 'rgba(140,107,66,0.04)', borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(140,107,66,0.12)', gap: Spacing.md,
  },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text },

  selectedRow: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: 10, backgroundColor: 'rgba(140,107,66,0.08)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.2)',
    borderRadius: BorderRadius.md,
  },
  selectedCover: { width: 36, height: 50, borderRadius: 4 },
  selectedCoverPlaceholder: { backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  selectedTitle: { fontWeight: '800', fontSize: FontSize.sm, color: Colors.text },
  selectedAuthor: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '700' },

  dropdown: {
    marginTop: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, maxHeight: 320, overflow: 'hidden', ...Shadow.sm,
  },
  dropdownLabel: { fontSize: 9, fontWeight: '900', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1, padding: 10, paddingBottom: 4 },
  dropdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: 'rgba(139,107,66,0.06)' },
  dropdownCover: { width: 28, height: 38, borderRadius: 3 },
  dropdownTitle: { fontWeight: '700', fontSize: FontSize.xs, color: Colors.text },
  dropdownAuthor: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: 14, ...Shadow.md,
  },
  startBtnText: { color: 'white', fontWeight: '800', fontSize: FontSize.md },
  loginHint: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
});
