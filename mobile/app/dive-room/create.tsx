import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet,
  ActivityIndicator, Alert, Platform, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { X, Waves, BookOpen, Search, Calendar, Clock, Users, Lock, Camera } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Book, booksApi, diveApi, albumApi } from '@/services/api';
import { useUserStore } from '@/store/useUserStore';
import { useDiveStore } from '@/store/useDiveStore';

const TIME_OPTIONS = [30, 60, 90];
const stripHtml = (str?: string) => str?.replace(/<\/?[^>]+(>|$)/g, '') ?? '';
const fmtMin = (m: number) => (m < 60 ? `${m}분` : m === 60 ? '1시간' : `1시간 ${m - 60}분`);

function defaultScheduledAt() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d;
}

export default function CreateDiveRoomScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const { fetchDiveRooms } = useDiveStore();

  const [title, setTitle] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookImage, setBookImage] = useState('');
  const [bookIsbn, setBookIsbn] = useState('');
  const [roomImage, setRoomImage] = useState('');
  const [hostBookTitle, setHostBookTitle] = useState('');
  const [hostBookImage, setHostBookImage] = useState('');
  const [hostBookIsbn, setHostBookIsbn] = useState('');
  const [scheduledAt] = useState(defaultScheduledAt());
  const [readingMinutes, setReadingMinutes] = useState(30);
  const [discussionMinutes, setDiscussionMinutes] = useState(30);
  const [maxParticipants, setMaxParticipants] = useState('8');
  const [lateJoinCutoff, setLateJoinCutoff] = useState('10');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [notice, setNotice] = useState('');

  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState<Book[]>([]);
  const [hostBookQuery, setHostBookQuery] = useState('');
  const [hostBookResults, setHostBookResults] = useState<Book[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const needsHostBook = !bookTitle;
  const canSubmit = title.trim().length > 0 && (!needsHostBook || hostBookTitle.length > 0);

  const searchBooks = async (query: string, setResults: (b: Book[]) => void) => {
    if (!query.trim()) return;
    try {
      const data = await booksApi.search(query);
      setResults((data.items || []).slice(0, 5));
    } catch { setResults([]); }
  };

  const displayImage = roomImage || bookImage;

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진을 선택하려면 갤러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.6 });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    const mime = asset.mimeType || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${asset.base64}`;
    if (!user?.id) { setRoomImage(dataUrl); return; }
    setIsUploadingImage(true);
    try {
      const saved = await albumApi.add(user.id, dataUrl);
      setRoomImage(saved.image_data);
    } catch {
      setRoomImage(dataUrl);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) { setAttemptedSubmit(true); return; }
    setIsSaving(true);
    try {
      await diveApi.createRoom({
        title: title.trim(),
        book_title: bookTitle, book_image: bookImage, book_isbn: bookIsbn,
        room_image: roomImage,
        host_book_title: hostBookTitle, host_book_image: hostBookImage, host_book_isbn: hostBookIsbn,
        scheduled_at: scheduledAt.toISOString(),
        reading_minutes: readingMinutes,
        discussion_minutes: discussionMinutes,
        max_participants: parseInt(maxParticipants, 10) || 8,
        late_join_cutoff_minutes: parseInt(lateJoinCutoff, 10) || 0,
        chat_enabled: chatEnabled,
        notice,
        host_name: user?.name,
      } as any);
      await fetchDiveRooms();
      router.back();
    } catch (e: any) {
      Alert.alert('오류', '방 개설에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Waves size={18} color={Colors.primary} />
          <Text style={styles.headerTitle}>독서 모임 개설</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* 방 이미지 + 제목 */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickPhoto} disabled={isUploadingImage}>
            {isUploadingImage ? (
              <ActivityIndicator color={Colors.primary} />
            ) : displayImage ? (
              <Image source={{ uri: displayImage }} style={styles.imagePickerImg} />
            ) : (
              <View style={styles.imagePickerAvatar}>
                <Text style={styles.imagePickerAvatarText}>{(user?.name || '?')[0]}</Text>
              </View>
            )}
            <View style={styles.imagePickerBadge}><Camera size={9} color="white" /></View>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>방 제목 *</Text>
            <TextInput
              style={[styles.input, attemptedSubmit && !title.trim() && styles.inputError]}
              placeholder="예: 사피엔스 1장 함께 읽기"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
            {attemptedSubmit && !title.trim() && <Text style={styles.errorText}>방 제목을 입력해주세요.</Text>}
          </View>
        </View>

        {/* 책 선택 */}
        <View style={styles.field}>
          <Text style={styles.label}>함께 읽을 책 (선택)</Text>
          {bookTitle ? (
            <View style={styles.selectedBook}>
              {!!bookImage && <Image source={{ uri: bookImage }} style={styles.selectedBookImg} />}
              <Text style={styles.selectedBookTitle} numberOfLines={1}>{bookTitle}</Text>
              <TouchableOpacity onPress={() => { setBookTitle(''); setBookImage(''); setBookIsbn(''); }}>
                <X size={13} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                  <Search size={13} color={Colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="책 제목으로 검색"
                    placeholderTextColor={Colors.textMuted}
                    value={bookQuery}
                    onChangeText={setBookQuery}
                    onSubmitEditing={() => searchBooks(bookQuery, setBookResults)}
                  />
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={() => searchBooks(bookQuery, setBookResults)}>
                  <Text style={styles.searchBtnText}>검색</Text>
                </TouchableOpacity>
              </View>
              {bookResults.map((b, i) => (
                <TouchableOpacity
                  key={i} style={styles.resultRow}
                  onPress={() => { setBookTitle(stripHtml(b.title)); setBookImage(b.image || ''); setBookIsbn(b.isbn || ''); setBookResults([]); setBookQuery(''); }}
                >
                  {!!b.image && <Image source={{ uri: b.image }} style={styles.resultImg} />}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{stripHtml(b.title)}</Text>
                    <Text style={styles.resultAuthor}>{b.author}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>

        {/* 방장 본인이 읽을 책 */}
        {needsHostBook && (
          <View style={styles.field}>
            <Text style={styles.label}>내가 읽을 책 *</Text>
            <Text style={styles.hint}>지정 도서가 없는 모임이라, 방장도 읽으실 책을 선택해야 참가 기록이 남습니다.</Text>
            {attemptedSubmit && !hostBookTitle && <Text style={styles.errorText}>읽으실 책을 선택해주세요.</Text>}
            {hostBookTitle ? (
              <View style={styles.selectedBook}>
                {!!hostBookImage && <Image source={{ uri: hostBookImage }} style={styles.selectedBookImg} />}
                <Text style={styles.selectedBookTitle} numberOfLines={1}>{hostBookTitle}</Text>
                <TouchableOpacity onPress={() => { setHostBookTitle(''); setHostBookImage(''); setHostBookIsbn(''); }}>
                  <X size={13} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.searchRow}>
                  <View style={styles.searchBox}>
                    <Search size={13} color={Colors.textMuted} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="책 제목으로 검색"
                      placeholderTextColor={Colors.textMuted}
                      value={hostBookQuery}
                      onChangeText={setHostBookQuery}
                      onSubmitEditing={() => searchBooks(hostBookQuery, setHostBookResults)}
                    />
                  </View>
                  <TouchableOpacity style={styles.searchBtn} onPress={() => searchBooks(hostBookQuery, setHostBookResults)}>
                    <Text style={styles.searchBtnText}>검색</Text>
                  </TouchableOpacity>
                </View>
                {hostBookResults.map((b, i) => (
                  <TouchableOpacity
                    key={i} style={styles.resultRow}
                    onPress={() => { setHostBookTitle(stripHtml(b.title)); setHostBookImage(b.image || ''); setHostBookIsbn(b.isbn || ''); setHostBookResults([]); setHostBookQuery(''); }}
                  >
                    {!!b.image && <Image source={{ uri: b.image }} style={styles.resultImg} />}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.resultTitle} numberOfLines={1}>{stripHtml(b.title)}</Text>
                      <Text style={styles.resultAuthor}>{b.author}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}

        {/* 시작 일시 안내 */}
        <View style={styles.field}>
          <View style={styles.rowGap}><Calendar size={12} color={Colors.primary} /><Text style={styles.label}>시작 일시</Text></View>
          <Text style={styles.hint}>{scheduledAt.toLocaleString('ko-KR')} (1시간 뒤로 자동 설정됩니다)</Text>
        </View>

        {/* 독서/토론 시간 */}
        <View style={styles.gridRow}>
          {[{ label: '독서 시간', value: readingMinutes, set: setReadingMinutes },
            { label: '토론 시간', value: discussionMinutes, set: setDiscussionMinutes }].map((f) => (
            <View key={f.label} style={{ flex: 1 }}>
              <View style={styles.rowGap}><Clock size={12} color={Colors.primary} /><Text style={styles.label}>{f.label}</Text></View>
              <View style={styles.pillRow}>
                {TIME_OPTIONS.map((m) => (
                  <TouchableOpacity key={m} style={[styles.pill, f.value === m && styles.pillActive]} onPress={() => f.set(m)}>
                    <Text style={[styles.pillText, f.value === m && styles.pillTextActive]}>{fmtMin(m)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* 최대 인원 + 입장 마감 */}
        <View style={styles.gridRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.rowGap}><Users size={12} color={Colors.primary} /><Text style={styles.label}>최대 인원</Text></View>
            <TextInput style={styles.input} keyboardType="number-pad" value={maxParticipants} onChangeText={setMaxParticipants} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.rowGap}><Lock size={12} color={Colors.primary} /><Text style={styles.label}>신규 입장 마감(분 전)</Text></View>
            <TextInput style={styles.input} keyboardType="number-pad" value={lateJoinCutoff} onChangeText={setLateJoinCutoff} />
          </View>
        </View>

        {/* 채팅 허용 */}
        <View style={styles.switchRow}>
          <Text style={styles.label}>독서 중 채팅 허용</Text>
          <Switch value={chatEnabled} onValueChange={setChatEnabled} trackColor={{ true: Colors.primary }} />
        </View>

        {/* 공지 */}
        <View style={styles.field}>
          <Text style={styles.label}>공지사항 (선택)</Text>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            placeholder="참가자에게 전달할 내용을 입력하세요"
            placeholderTextColor={Colors.textMuted}
            value={notice}
            onChangeText={setNotice}
            multiline
          />
        </View>

        {attemptedSubmit && !canSubmit && (
          <Text style={[styles.errorText, { textAlign: 'center' }]}>
            필수 항목({!title.trim() ? '방 제목' : '읽으실 책'})을 확인해주세요.
          </Text>
        )}

        <View style={styles.submitRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.submitBtn, !canSubmit && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>방 개설하기</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingTop: Platform.OS === 'ios' ? 56 : Spacing.md,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(139,107,66,0.08)', alignItems: 'center', justifyContent: 'center' },

  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  field: { gap: 6 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.3 },
  hint: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', lineHeight: 15 },
  errorText: { fontSize: 11, color: Colors.error, fontWeight: '700' },

  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: 10, fontSize: FontSize.sm, color: Colors.text,
  },
  inputError: { borderColor: Colors.error },

  imagePicker: { width: 48, height: 68, borderRadius: 6, overflow: 'hidden', flexShrink: 0 },
  imagePickerImg: { width: '100%', height: '100%' },
  imagePickerAvatar: { width: '100%', height: '100%', backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  imagePickerAvatarText: { color: 'white', fontWeight: '900', fontSize: 20 },
  imagePickerBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 18,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },

  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: 10,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 10 },
  searchBtn: { backgroundColor: 'rgba(140,107,66,0.1)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.25)', borderRadius: BorderRadius.md, paddingHorizontal: 14, justifyContent: 'center' },
  searchBtnText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },

  resultRow: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 8, backgroundColor: Colors.surface, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  resultImg: { width: 28, height: 40, borderRadius: 3 },
  resultTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text },
  resultAuthor: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },

  selectedBook: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: 'rgba(140,107,66,0.06)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.2)', borderRadius: BorderRadius.md },
  selectedBookImg: { width: 32, height: 46, borderRadius: 4 },
  selectedBookTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },

  gridRow: { flexDirection: 'row', gap: Spacing.md },
  pillRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  pill: { flex: 1, paddingVertical: 6, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  pillActive: { backgroundColor: 'rgba(140,107,66,0.15)', borderColor: 'rgba(140,107,66,0.35)' },
  pillText: { fontSize: 10, fontWeight: '800', color: Colors.textMuted },
  pillTextActive: { color: Colors.primary },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: 'rgba(140,107,66,0.04)', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(140,107,66,0.12)' },

  submitRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: BorderRadius.md, backgroundColor: 'rgba(139,107,66,0.06)', borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { fontWeight: '800', color: Colors.textMuted, fontSize: FontSize.sm },
  submitBtn: { flex: 2, padding: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: 'center', ...Shadow.md },
  submitBtnText: { fontWeight: '800', color: 'white', fontSize: FontSize.sm },
});
