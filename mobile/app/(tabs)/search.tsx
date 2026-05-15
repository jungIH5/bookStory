import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView,
  Platform, Pressable, Alert,
} from 'react-native';
import { MotiView } from 'moti';
import { Search, X, BookOpen, Sparkles, Send, Plus, WifiOff } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { booksApi, sessionsApi, Book, BookAnalysis, SessionQA } from '@/services/api';
import { useBooksStore } from '@/store/useBooksStore';
import { useUserStore } from '@/store/useUserStore';

const stripHtml = (str?: string) => str?.replace(/<\/?[^>]+(>|$)/g, '') ?? '';

export default function SearchScreen() {
  const { user } = useUserStore();
  const { readBooks, setReadBooks } = useBooksStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [analysis, setAnalysis] = useState<BookAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Q&A session
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionQA, setSessionQA] = useState<SessionQA[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [conversationInput, setConversationInput] = useState('');
  const [isConversing, setIsConversing] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return unsubscribe;
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    if (isOffline) {
      Alert.alert('오프라인', '인터넷 연결을 확인해주세요.');
      return;
    }
    setIsSearching(true);
    setResults([]);
    try {
      const data = await booksApi.search(query);
      setResults(data.items || []);
    } catch {
      Alert.alert('오류', '검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookPress = async (book: Book) => {
    setSelectedBook(book);
    setAnalysis(null);
    setIsAnalyzing(true);
    setShowAnalysis(true);
    setSessionId(null);
    setSessionQA([]);
    setCurrentQuestion('');
    setIsConversing(false);
    try {
      const data = await booksApi.analyze(stripHtml(book.title), book.author);
      setAnalysis(data);
    } catch {
      Alert.alert('오류', '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveBook = async () => {
    if (!selectedBook || !analysis) return;
    setIsSaving(true);
    try {
      const saved = await booksApi.saveReadBook({
        title: stripHtml(selectedBook.title),
        author: selectedBook.author,
        image: selectedBook.image,
        pages: analysis.pages,
      });
      setReadBooks([...readBooks, saved]);
      Alert.alert('저장 완료', '서재에 추가되었습니다!');
    } catch {
      Alert.alert('오류', '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartConversation = async () => {
    if (!selectedBook || !analysis) return;
    setIsConversing(true);
    try {
      const session = await sessionsApi.create(stripHtml(selectedBook.title), analysis.analysis);
      setSessionId(session.id);
      setCurrentQuestion(session.current_question);
      setSessionQA(session.qa_pairs || []);
    } catch {
      Alert.alert('오류', 'Q&A 세션 시작에 실패했습니다.');
      setIsConversing(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!sessionId || !conversationInput.trim()) return;
    const answer = conversationInput.trim();
    setConversationInput('');
    setIsSubmittingAnswer(true);
    try {
      const result = await sessionsApi.answer(sessionId, answer);
      setSessionQA((prev) => [...prev, { question: currentQuestion, answer }]);
      setCurrentQuestion(result.question || '');
    } catch {
      Alert.alert('오류', '답변 제출에 실패했습니다.');
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 오프라인 배너 */}
      {isOffline && (
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.offlineBanner}
        >
          <WifiOff size={14} color="white" />
          <Text style={styles.offlineText}>인터넷 연결이 없습니다. 검색이 제한됩니다.</Text>
        </MotiView>
      )}

      {/* 검색창 */}
      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="책 제목, 저자를 검색하세요"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(''); setResults([]); }}>
            <X size={16} color={Colors.textMuted} />
          </Pressable>
        )}
        {isSearching && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />}
      </View>

      {/* 결과 */}
      {results.length === 0 && !isSearching && (
        <View style={styles.emptyState}>
          <BookOpen size={48} color={Colors.border} />
          <Text style={styles.emptyTitle}>책을 검색해보세요</Text>
          <Text style={styles.emptySub}>제목이나 저자 이름으로 검색할 수 있어요</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item, i) => item.isbn ?? String(i)}
        renderItem={({ item }) => (
          <BookCard book={item} onPress={() => handleBookPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* 분석 모달 */}
      <Modal
        visible={showAnalysis}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAnalysis(false)}
      >
        <BookAnalysisModal
          book={selectedBook}
          analysis={analysis}
          isAnalyzing={isAnalyzing}
          isSaving={isSaving}
          isConversing={isConversing}
          sessionQA={sessionQA}
          currentQuestion={currentQuestion}
          conversationInput={conversationInput}
          isSubmittingAnswer={isSubmittingAnswer}
          onClose={() => { setShowAnalysis(false); setIsConversing(false); }}
          onSave={handleSaveBook}
          onStartConversation={handleStartConversation}
          onChangeInput={setConversationInput}
          onSubmitAnswer={handleSubmitAnswer}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
}

function BookCard({ book, onPress }: { book: Book; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.bookCard} onPress={onPress} activeOpacity={0.75}>
      {book.image ? (
        <Image source={{ uri: book.image }} style={styles.bookCover} />
      ) : (
        <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
          <BookOpen size={20} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{stripHtml(book.title)}</Text>
        <Text style={styles.bookAuthor}>{book.author}</Text>
        {book.pubdate && <Text style={styles.bookDate}>{book.pubdate.slice(0, 4)}년</Text>}
        <Text style={styles.analyzeHint}>탭하여 AI 분석 →</Text>
      </View>
    </TouchableOpacity>
  );
}

interface AnalysisModalProps {
  book: Book | null;
  analysis: BookAnalysis | null;
  isAnalyzing: boolean;
  isSaving: boolean;
  isConversing: boolean;
  sessionQA: SessionQA[];
  currentQuestion: string;
  conversationInput: string;
  isSubmittingAnswer: boolean;
  onClose: () => void;
  onSave: () => void;
  onStartConversation: () => void;
  onChangeInput: (v: string) => void;
  onSubmitAnswer: () => void;
}

function BookAnalysisModal(props: AnalysisModalProps) {
  const {
    book, analysis, isAnalyzing, isSaving, isConversing,
    sessionQA, currentQuestion, conversationInput, isSubmittingAnswer,
    onClose, onSave, onStartConversation, onChangeInput, onSubmitAnswer,
  } = props;

  if (!book) return null;

  return (
    <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* 헤더 */}
      <View style={styles.modalHeader}>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.modalHeaderTitle} numberOfLines={1}>{stripHtml(book.title)}</Text>
      </View>

      <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        {/* 책 정보 */}
        <View style={styles.bookHeader}>
          {book.image ? (
            <Image source={{ uri: book.image }} style={styles.modalCover} />
          ) : (
            <View style={[styles.modalCover, styles.bookCoverPlaceholder]}>
              <BookOpen size={28} color={Colors.textMuted} />
            </View>
          )}
          <View style={styles.modalBookInfo}>
            <Text style={styles.modalBookTitle} numberOfLines={2}>{stripHtml(book.title)}</Text>
            <Text style={styles.modalBookAuthor}>{book.author}</Text>
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={onSave}
              disabled={isSaving}
            >
              <Plus size={14} color="white" />
              <Text style={styles.saveBtnText}>{isSaving ? '저장 중...' : '서재에 추가'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isAnalyzing ? (
          <View style={styles.analyzingState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.analyzingText}>AI가 분석 중입니다...</Text>
          </View>
        ) : analysis ? (
          <>
            {/* 분석 텍스트 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Sparkles size={16} color={Colors.primary} />
                <Text style={styles.sectionTitle}>AI 분석</Text>
              </View>
              <Text style={styles.analysisText}>{analysis.analysis}</Text>
            </View>

            {/* 주제 질문 */}
            {analysis.questions.thematic.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>주제별 토론 질문</Text>
                {analysis.questions.thematic.map((q, i) => (
                  <View key={i} style={styles.questionItem}>
                    <Text style={styles.questionNum}>{i + 1}</Text>
                    <Text style={styles.questionText}>{q}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 관점 전환 질문 */}
            {analysis.questions.perspective_shift.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>관점 전환 질문</Text>
                {analysis.questions.perspective_shift.map((q, i) => (
                  <View key={i} style={styles.questionItem}>
                    <Text style={styles.questionNum}>{i + 1}</Text>
                    <Text style={styles.questionText}>{q}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Q&A 세션 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI와 독서 토론하기</Text>
              {!isConversing ? (
                <TouchableOpacity style={styles.startConvBtn} onPress={onStartConversation}>
                  <Sparkles size={16} color="white" />
                  <Text style={styles.startConvText}>토론 시작하기</Text>
                </TouchableOpacity>
              ) : (
                <>
                  {sessionQA.map((pair, i) => (
                    <View key={i}>
                      <View style={styles.qaBubbleQ}>
                        <Text style={styles.qaBubbleLabel}>AI</Text>
                        <Text style={styles.qaBubbleText}>{pair.question}</Text>
                      </View>
                      {pair.answer && (
                        <View style={styles.qaBubbleA}>
                          <Text style={styles.qaBubbleLabel}>나</Text>
                          <Text style={styles.qaBubbleText}>{pair.answer}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                  {currentQuestion && (
                    <View style={styles.qaBubbleQ}>
                      <Text style={styles.qaBubbleLabel}>AI</Text>
                      <Text style={styles.qaBubbleText}>{currentQuestion}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* 답변 입력창 */}
      {isConversing && currentQuestion && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.answerInput}
            placeholder="생각을 입력하세요..."
            placeholderTextColor={Colors.textMuted}
            value={conversationInput}
            onChangeText={onChangeInput}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={onSubmitAnswer}
            disabled={isSubmittingAnswer || !conversationInput.trim()}
            style={[styles.sendBtn, (!conversationInput.trim() || isSubmittingAnswer) && styles.sendBtnDisabled]}
          >
            {isSubmittingAnswer
              ? <ActivityIndicator size="small" color="white" />
              : <Send size={18} color="white" />}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#374151', paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  offlineText: { flex: 1, fontSize: FontSize.xs, color: 'white', fontWeight: '600' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },

  listContent: { padding: Spacing.md, gap: Spacing.sm },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textSecondary },
  emptySub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },

  bookCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  bookCover: { width: 56, height: 80, borderRadius: 6 },
  bookCoverPlaceholder: { backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  bookInfo: { flex: 1, justifyContent: 'space-between' },
  bookTitle: { fontSize: FontSize.sm, fontWeight: '900', color: Colors.text },
  bookAuthor: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '700' },
  bookDate: { fontSize: FontSize.xs, color: Colors.textMuted },
  analyzeHint: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' },

  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
    paddingTop: Platform.OS === 'ios' ? 16 : Spacing.sm,
  },
  closeBtn: { padding: 8 },
  modalHeaderTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  modalScroll: { flex: 1 },
  modalContent: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xxl },

  bookHeader: { flexDirection: 'row', gap: Spacing.md },
  modalCover: { width: 72, height: 104, borderRadius: 8, ...Shadow.md },
  modalBookInfo: { flex: 1, justifyContent: 'space-between' },
  modalBookTitle: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.text },
  modalBookAuthor: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '700' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    ...Shadow.sm,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: FontSize.xs },

  analyzingState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  analyzingText: { color: Colors.textSecondary, fontWeight: '700' },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '900', color: Colors.text, letterSpacing: 0.5 },
  analysisText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },

  questionItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  questionNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary, color: 'white',
    textAlign: 'center', lineHeight: 22, fontSize: 11, fontWeight: '900',
  },
  questionText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  startConvBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    padding: Spacing.md, justifyContent: 'center', ...Shadow.md,
  },
  startConvText: { color: 'white', fontWeight: '800', fontSize: FontSize.md },

  qaBubbleQ: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qaBubbleA: {
    backgroundColor: Colors.primary + '18',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  qaBubbleLabel: { fontSize: FontSize.xs, fontWeight: '900', color: Colors.primary, marginBottom: 4 },
  qaBubbleText: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  answerInput: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
