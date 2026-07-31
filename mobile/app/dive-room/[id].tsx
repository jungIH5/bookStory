import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  ArrowLeft, BookOpen, Users, Clock, Calendar, Send, Sparkles, X,
  Pencil, Check, MoreVertical, LogOut,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import {
  Book, DiveRoom, DiveMessage, booksApi, diveApi,
} from '@/services/api';
import { useUserStore } from '@/store/useUserStore';
import { useDiveStore } from '@/store/useDiveStore';
import { useTimerStore } from '@/store/useTimerStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';
const stripHtml = (str?: string) => str?.replace(/<\/?[^>]+(>|$)/g, '') ?? '';

type Phase = 'waiting' | 'reading' | 'discussion' | 'overtime';

function computePhaseInfo(room: DiveRoom): { phase: Phase; remaining: number } {
  const now = Date.now();
  const start = new Date(room.scheduled_at).getTime();
  const readEnd = start + (room.reading_minutes || 0) * 60000;
  const discEnd = readEnd + (room.discussion_minutes || 0) * 60000;
  if (now < start) return { phase: 'waiting', remaining: start - now };
  if (now < readEnd) return { phase: 'reading', remaining: readEnd - now };
  if (now < discEnd) return { phase: 'discussion', remaining: discEnd - now };
  return { phase: 'overtime', remaining: 0 };
}

function computeAutoCloseRemaining(room: DiveRoom) {
  const start = new Date(room.scheduled_at).getTime();
  const discEnd = start + ((room.reading_minutes || 0) + (room.discussion_minutes || 0)) * 60000;
  const graceMs = (1 + (room.extension_count || 0)) * 60 * 60000;
  return discEnd + graceMs - Date.now();
}

const PHASE_MAP: Record<Phase, { label: string; color: string; bg: string }> = {
  waiting: { label: '대기 중', color: Colors.textMuted, bg: 'rgba(158,141,122,0.08)' },
  reading: { label: '독서 중', color: Colors.secondary, bg: 'rgba(196,148,86,0.1)' },
  discussion: { label: '토론 중', color: Colors.success, bg: 'rgba(34,197,94,0.08)' },
  overtime: { label: '시간 종료', color: Colors.textMuted, bg: 'rgba(189,176,160,0.08)' },
};

function fmtRemaining(ms: number) {
  if (!ms || ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) return `${Math.floor(m / 60)}시간 ${m % 60}분`;
  if (m > 0) return `${m}분 ${String(s).padStart(2, '0')}초`;
  return `${s}초`;
}

const fmtTime = (dt: string) => {
  const d = new Date(dt);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function DiveRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const roomId = parseInt(id as string, 10);
  const router = useRouter();
  const { user, token } = useUserStore();
  const { fetchDiveRooms } = useDiveStore();
  const { startTimer } = useTimerStore();

  const [room, setRoom] = useState<DiveRoom | null>(null);
  const [messages, setMessages] = useState<DiveMessage[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [whisperTarget, setWhisperTarget] = useState<{ id: number; name: string } | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [, setTick] = useState(0);
  const [joinBookQuery, setJoinBookQuery] = useState('');
  const [joinBookResults, setJoinBookResults] = useState<Book[]>([]);
  const [selectedJoinBook, setSelectedJoinBook] = useState<{ title: string; image?: string; isbn?: string } | null>(null);
  const [joinError, setJoinError] = useState('');
  const [editingNotice, setEditingNotice] = useState(false);
  const [noticeInput, setNoticeInput] = useState('');
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiSending, setIsAiSending] = useState(false);
  const soloPromptShown = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const fetchRoom = useCallback(async () => {
    try {
      const data = await diveApi.getRoom(roomId);
      setRoom(data);
    } catch {}
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
    const iv = setInterval(fetchRoom, 30000);
    return () => clearInterval(iv);
  }, [fetchRoom]);

  const isHost = !!(user && room && room.host_id === user.id);
  const myParticipant = room?.participants?.find((p) => p.user_id === user?.id);
  const isParticipant = !!myParticipant;
  const needsBookChoice = !!room && !room.book_title;

  const fetchMessages = useCallback(async () => {
    if (!token || !isParticipant) return;
    try {
      const data = await diveApi.getMessages(roomId);
      setMessages(data);
    } catch {}
  }, [roomId, token, isParticipant]);

  useEffect(() => {
    if (!isParticipant || !token) return;
    fetchMessages();

    let closedByCleanup = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const base = API_URL.replace(/^http/, 'ws');
      const ws = new WebSocket(`${base}/api/dive/rooms/${roomId}/ws?token=${encodeURIComponent(token!)}`);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === 'room_update') { fetchRoom(); return; }
          if (msg.type === 'room_deleted') {
            Alert.alert('알림', '방장이 이 모임을 삭제했어요.');
            fetchDiveRooms();
            router.back();
            return;
          }
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        } catch {}
      };
      ws.onclose = () => {
        if (!closedByCleanup) reconnectTimer = setTimeout(connect, 3000);
      };
    };
    connect();

    return () => {
      closedByCleanup = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [isParticipant, roomId, token]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  // 독서 시작 시점에 방장 혼자뿐이면 개인 독서로 전환 제안 (세션당 1회)
  useEffect(() => {
    if (!room || soloPromptShown.current || !isHost) return;
    const { phase: p } = computePhaseInfo(room);
    if (p === 'reading' && (room.participant_count || 0) <= 1) {
      soloPromptShown.current = true;
      Alert.alert(
        '📖 아직 아무도 참가하지 않았어요',
        '개인 독서 타이머로 전환할까요? (모임은 삭제됩니다)',
        [
          { text: '모임 유지', style: 'cancel' },
          {
            text: '개인 독서로 전환', onPress: async () => {
              const book = { title: myParticipant?.book_title || room.book_title || '', author: '', image: myParticipant?.book_image || room.book_image || '', isbn: myParticipant?.book_isbn || room.book_isbn };
              try { await diveApi.deleteRoom(room.id); } catch {}
              startTimer(book);
              fetchDiveRooms();
              router.back();
            },
          },
        ],
      );
    }
  }, [room, isHost]);

  if (!room) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const { phase, remaining } = computePhaseInfo(room);
  const badge = PHASE_MAP[phase];
  const remainingLabel = fmtRemaining(remaining);
  const autoCloseRemaining = computeAutoCloseRemaining(room);
  const joinCutoffPassed = room.late_join_cutoff_minutes > 0 &&
    Date.now() >= new Date(room.scheduled_at).getTime() - room.late_join_cutoff_minutes * 60000;
  const chatDisabled = room.chat_enabled === false;
  const chatLocked = phase === 'waiting' || (phase === 'reading' && chatDisabled);
  const canSendMsg = isParticipant && !chatLocked && room.status !== 'ended';
  const displayImage = room.room_image || room.book_image;

  const handleJoin = async () => {
    if (!token || isJoining) return;
    if (needsBookChoice && !selectedJoinBook) { setJoinError('먼저 읽으실 책을 선택해주세요.'); return; }
    setIsJoining(true);
    setJoinError('');
    try {
      await diveApi.joinRoom(room.id, needsBookChoice ? {
        book_title: selectedJoinBook!.title, book_image: selectedJoinBook!.image, book_isbn: selectedJoinBook!.isbn,
      } : undefined);
      await fetchRoom();
    } catch (e: any) {
      setJoinError('참가에 실패했습니다.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!token) return;
    await diveApi.leaveRoom(room.id);
    await fetchRoom();
  };

  const handleSend = async () => {
    if (!msgInput.trim() || !token || isSending || chatLocked) return;
    setIsSending(true);
    try {
      const msg = await diveApi.sendMessage(room.id, msgInput.trim(), whisperTarget?.id ?? null);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setMsgInput('');
    } catch {} finally {
      setIsSending(false);
    }
  };

  const handleSaveNotice = async () => {
    try {
      await diveApi.updateNotice(room.id, noticeInput);
      setRoom((prev) => (prev ? { ...prev, notice: noticeInput } : prev));
      setEditingNotice(false);
    } catch {}
  };

  const handleExtend = async () => {
    try {
      await diveApi.extendRoom(room.id);
      await fetchRoom();
    } catch {}
  };

  const handleEndSession = () => {
    Alert.alert('모임 종료', '이 모임을 지금 종료할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '종료', style: 'destructive', onPress: async () => { await diveApi.updateStatus(room.id, 'ended'); await fetchRoom(); } },
    ]);
  };

  const handleDeleteRoom = () => {
    Alert.alert('모임 삭제', '이 모임을 삭제할까요? 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          await diveApi.deleteRoom(room.id);
          await fetchDiveRooms();
          router.back();
        },
      },
    ]);
  };

  const handleParticipantMenu = (p: NonNullable<DiveRoom['participants']>[number]) => {
    const isSelf = p.user_id === user?.id;
    const options: any[] = [];
    if (!isSelf) {
      options.push({
        text: whisperTarget?.id === p.user_id ? '귓속말 해제' : `${p.name}님에게 귓속말`,
        onPress: () => setWhisperTarget(whisperTarget?.id === p.user_id ? null : { id: p.user_id, name: p.name }),
      });
    }
    if (isHost && !isSelf) {
      options.push({
        text: '추방하기', style: 'destructive', onPress: () => {
          Alert.alert('추방하기', `${p.name}님을 이 모임에서 추방할까요?`, [
            { text: '취소', style: 'cancel' },
            { text: '추방', style: 'destructive', onPress: async () => { await diveApi.kickParticipant(room.id, p.user_id); await fetchRoom(); } },
          ]);
        },
      });
    }
    options.push({ text: '닫기', style: 'cancel' });
    Alert.alert(p.name, undefined, options);
  };

  const searchJoinBook = async () => {
    if (!joinBookQuery.trim()) return;
    try {
      const data = await booksApi.search(joinBookQuery);
      setJoinBookResults((data.items || []).slice(0, 5));
    } catch {}
  };

  const handleSendAiChat = async () => {
    if (!aiInput.trim() || !token || isAiSending) return;
    const userMsg = { role: 'user', content: aiInput.trim() };
    const history = aiMessages;
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setIsAiSending(true);
    try {
      const data = await diveApi.aiChat(room.id, userMsg.content, history);
      setAiMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {} finally {
      setIsAiSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}><ArrowLeft size={18} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{room.title}</Text>
        {isHost && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => Alert.alert('방장 관리', undefined, [
              { text: '모임 종료', onPress: handleEndSession },
              { text: '모임 삭제', style: 'destructive', onPress: handleDeleteRoom },
              { text: '닫기', style: 'cancel' },
            ])}
          >
            <MoreVertical size={18} color={Colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={canSendMsg || messages.length > 0 ? messages : []}
        keyExtractor={(m) => String(m.id)}
        style={{ flex: 1 }}
        contentContainerStyle={styles.chatContent}
        ListHeaderComponent={
          <View style={styles.infoCard}>
            <View style={styles.infoTopRow}>
              <View style={styles.cover}>
                {displayImage
                  ? <Image source={{ uri: displayImage }} style={styles.coverImg} />
                  : <BookOpen size={20} color={Colors.primary} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                {!!room.book_title && <Text style={styles.bookTitle} numberOfLines={1}>{room.book_title}</Text>}
                <Text style={styles.hostName}>방장: {room.host_name || '알 수 없음'}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>
                    {badge.label}{remainingLabel ? ` · ${remainingLabel}` : ''}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.rowGap}><Calendar size={11} color={Colors.textMuted} /><Text style={styles.metaText}>{fmtTime(room.scheduled_at)}</Text></View>
              <View style={styles.rowGap}><Clock size={11} color={Colors.textMuted} /><Text style={styles.metaText}>독서 {room.reading_minutes}분 + 토론 {room.discussion_minutes}분</Text></View>
              <View style={styles.rowGap}><Users size={11} color={Colors.textMuted} /><Text style={styles.metaText}>{room.participant_count}/{room.max_participants}명</Text></View>
            </View>

            {phase === 'overtime' && autoCloseRemaining > 0 && (
              <View style={styles.overtimeNotice}>
                <Text style={styles.overtimeText}>⏳ {fmtRemaining(autoCloseRemaining)} 후 자동 종료돼요.</Text>
                {isParticipant && (
                  <TouchableOpacity onPress={handleExtend}><Text style={styles.overtimeExtend}>1시간 연장</Text></TouchableOpacity>
                )}
              </View>
            )}

            {/* 공지 */}
            <View style={styles.noticeBox}>
              {editingNotice ? (
                <View style={styles.rowGap}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={noticeInput}
                    onChangeText={setNoticeInput}
                    placeholder="공지사항을 입력하세요"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TouchableOpacity onPress={handleSaveNotice}><Check size={16} color={Colors.success} /></TouchableOpacity>
                </View>
              ) : (
                <View style={styles.rowGap}>
                  <Text style={styles.noticeText} numberOfLines={2}>{room.notice ? `📌 ${room.notice}` : (isHost ? '공지사항을 등록해보세요.' : '등록된 공지가 없습니다.')}</Text>
                  {isHost && (
                    <TouchableOpacity onPress={() => { setNoticeInput(room.notice || ''); setEditingNotice(true); }}>
                      <Pencil size={13} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* 참가자 목록 */}
            <Text style={styles.sectionLabel}>참가자 ({room.participant_count})</Text>
            <View style={styles.participantWrap}>
              {(room.participants || []).map((p) => (
                <TouchableOpacity
                  key={p.user_id}
                  style={[styles.participantChip, whisperTarget?.id === p.user_id && styles.participantChipActive]}
                  onPress={() => handleParticipantMenu(p)}
                >
                  <Text style={styles.participantName} numberOfLines={1}>
                    {room.host_id === p.user_id ? '👑 ' : ''}{p.name}
                  </Text>
                  <Text style={styles.participantStatus}>{p.status === 'paused' ? '일시정지' : p.status === 'ended' ? '종료' : '독서 중'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 참가/탈퇴 */}
            {!isParticipant ? (
              <View style={styles.joinBox}>
                {needsBookChoice && (
                  selectedJoinBook ? (
                    <View style={styles.selectedBook}>
                      {!!selectedJoinBook.image && <Image source={{ uri: selectedJoinBook.image }} style={styles.selectedBookImg} />}
                      <Text style={styles.selectedBookTitle} numberOfLines={1}>{selectedJoinBook.title}</Text>
                      <TouchableOpacity onPress={() => setSelectedJoinBook(null)}><X size={13} color={Colors.error} /></TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={styles.searchRow}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="읽으실 책을 검색하세요"
                          placeholderTextColor={Colors.textMuted}
                          value={joinBookQuery}
                          onChangeText={setJoinBookQuery}
                          onSubmitEditing={searchJoinBook}
                        />
                        <TouchableOpacity style={styles.searchBtn} onPress={searchJoinBook}><Text style={styles.searchBtnText}>검색</Text></TouchableOpacity>
                      </View>
                      {joinBookResults.map((b, i) => (
                        <TouchableOpacity
                          key={i} style={styles.resultRow}
                          onPress={() => { setSelectedJoinBook({ title: stripHtml(b.title), image: b.image, isbn: b.isbn }); setJoinBookResults([]); setJoinBookQuery(''); setJoinError(''); }}
                        >
                          <Text style={styles.resultTitle} numberOfLines={1}>{stripHtml(b.title)}</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )
                )}
                {!!joinError && <Text style={styles.errorText}>{joinError}</Text>}
                {joinCutoffPassed ? (
                  <View style={styles.cutoffPill}><Text style={styles.cutoffPillText}>참가 신청이 마감됐습니다</Text></View>
                ) : (
                  <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} disabled={isJoining || !user}>
                    {isJoining ? <ActivityIndicator color="white" /> : <Text style={styles.joinBtnText}>{user ? '참가하기' : '로그인이 필요합니다'}</Text>}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.participantActions}>
                <TouchableOpacity style={styles.aiChatBtn} onPress={() => setAiChatOpen(true)}>
                  <Sparkles size={13} color={Colors.primary} />
                  <Text style={styles.aiChatBtnText}>AI와 토론 준비 대화하기</Text>
                </TouchableOpacity>
                {!isHost && (
                  <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
                    <LogOut size={13} color={Colors.error} />
                    <Text style={styles.leaveBtnText}>나가기</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.sectionLabel}>
              {chatLocked ? '채팅 (잠김)' : '채팅'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.to_user_id ? { opacity: 0.85 } : null]}>
            <Text style={styles.msgSender}>
              {item.is_ai ? 'AI' : item.user_name}
              {item.to_user_id ? ` → ${item.to_user_id === user?.id ? '나' : item.to_user_name || '?'} (귓속말)` : ''}
            </Text>
            <Text style={[styles.msgContent, item.to_user_id && { fontStyle: 'italic', color: Colors.primary }]}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={canSendMsg ? <Text style={styles.emptyChat}>아직 대화가 없습니다.</Text> : null}
      />

      {canSendMsg && (
        <View style={styles.inputBar}>
          {whisperTarget && (
            <View style={styles.whisperBar}>
              <Text style={styles.whisperText}>{whisperTarget.name}님에게 귓속말 중</Text>
              <TouchableOpacity onPress={() => setWhisperTarget(null)}><X size={12} color={Colors.textMuted} /></TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.msgInput}
              placeholder={whisperTarget ? `${whisperTarget.name}님에게...` : '메시지를 입력하세요'}
              placeholderTextColor={Colors.textMuted}
              value={msgInput}
              onChangeText={setMsgInput}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={isSending}>
              <Send size={15} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* AI 대화 모달 */}
      <Modal visible={aiChatOpen} animationType="slide" onRequestClose={() => setAiChatOpen(false)}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setAiChatOpen(false)} style={styles.headerBtn}><ArrowLeft size={18} color={Colors.text} /></TouchableOpacity>
            <Text style={styles.headerTitle}>AI와 토론 준비 대화</Text>
            <View style={{ width: 32 }} />
          </View>
          <FlatList
            data={aiMessages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.chatContent}
            renderItem={({ item }) => (
              <View style={[styles.msgRow, item.role === 'user' && styles.aiUserRow]}>
                <Text style={styles.msgContent}>{item.content}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyChat}>책은 다 읽으셨나요? 토론에서 다뤄볼 주제가 필요하시면 편하게 물어보세요.</Text>}
          />
          {isAiSending && <Text style={styles.aiThinking}>🤔 생각 중...</Text>}
          <View style={styles.inputBar}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.msgInput}
                placeholder="AI에게 물어보기"
                placeholderTextColor={Colors.textMuted}
                value={aiInput}
                onChangeText={setAiInput}
                onSubmitEditing={handleSendAiChat}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendAiChat} disabled={isAiSending}>
                <Send size={15} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingTop: Platform.OS === 'ios' ? 56 : Spacing.md,
  },
  headerBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(139,107,66,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '900', color: Colors.text },

  chatContent: { padding: Spacing.md, gap: 10, paddingBottom: Spacing.xl },

  infoCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md, ...Shadow.sm,
  },
  infoTopRow: { flexDirection: 'row', gap: Spacing.md },
  cover: { width: 48, height: 68, borderRadius: 6, backgroundColor: 'rgba(140,107,66,0.08)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  coverImg: { width: '100%', height: '100%' },
  bookTitle: { fontWeight: '900', fontSize: FontSize.sm, color: Colors.text },
  hostName: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', marginTop: 2, marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 10, fontWeight: '900' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },

  overtimeNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, backgroundColor: 'rgba(196,148,86,0.08)', borderRadius: BorderRadius.sm },
  overtimeText: { fontSize: 11, fontWeight: '700', color: Colors.secondary },
  overtimeExtend: { fontSize: 11, fontWeight: '900', color: Colors.primary },

  noticeBox: { paddingVertical: 6 },
  noticeText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },

  sectionLabel: { fontSize: 10, fontWeight: '900', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  participantWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  participantChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md, backgroundColor: 'rgba(140,107,66,0.05)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.1)', maxWidth: 160 },
  participantChipActive: { backgroundColor: 'rgba(196,148,86,0.18)', borderColor: 'rgba(196,148,86,0.4)' },
  participantName: { fontSize: 11, fontWeight: '700', color: Colors.text },
  participantStatus: { fontSize: 9, fontWeight: '800', color: Colors.success, marginTop: 1 },

  joinBox: { gap: 8, marginTop: 4 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBtn: { backgroundColor: 'rgba(140,107,66,0.1)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.25)', borderRadius: BorderRadius.md, paddingHorizontal: 14, justifyContent: 'center' },
  searchBtnText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  resultRow: { padding: 8, backgroundColor: Colors.surface, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  resultTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text },
  selectedBook: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: 'rgba(140,107,66,0.06)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.2)', borderRadius: BorderRadius.md },
  selectedBookImg: { width: 28, height: 40, borderRadius: 3 },
  selectedBookTitle: { flex: 1, fontSize: FontSize.xs, fontWeight: '700', color: Colors.text },
  errorText: { fontSize: 11, color: Colors.error, fontWeight: '700' },
  cutoffPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: 'rgba(220,53,69,0.08)', borderWidth: 1, borderColor: 'rgba(220,53,69,0.25)' },
  cutoffPillText: { fontSize: 11, fontWeight: '900', color: Colors.error },
  joinBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: 12, alignItems: 'center', ...Shadow.sm },
  joinBtnText: { color: 'white', fontWeight: '800', fontSize: FontSize.sm },

  participantActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  aiChatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: BorderRadius.md, backgroundColor: 'rgba(140,107,66,0.08)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.2)' },
  aiChatBtnText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: BorderRadius.md, backgroundColor: 'rgba(220,53,69,0.06)', borderWidth: 1, borderColor: 'rgba(220,53,69,0.2)' },
  leaveBtnText: { fontSize: 11, fontWeight: '800', color: Colors.error },

  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: 10, fontSize: FontSize.sm, color: Colors.text,
  },

  msgRow: { paddingVertical: 2 },
  aiUserRow: { alignItems: 'flex-end' },
  msgSender: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, marginBottom: 1 },
  msgContent: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  emptyChat: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textMuted, padding: Spacing.lg },

  inputBar: { padding: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  whisperBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4 },
  whisperText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  msgInput: { flex: 1, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 10, fontSize: FontSize.sm, color: Colors.text },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },

  aiThinking: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textMuted, padding: 6 },
});
