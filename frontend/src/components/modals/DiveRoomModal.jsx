import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Waves, Users, Clock, Calendar, Lock, Loader2, Send, RefreshCw, Trash2, MessageSquare, MessageSquareDashed, Pencil, Check, Camera, Minimize2, Maximize2, BookOpen, Pause, Play, Search, UserX, Sparkles } from 'lucide-react';
import { API_URL } from '../../api';
import { getPersona } from '../../personas';

const AI_CHAT_OPENING_LINE = '책은 다 읽으셨나요? 오늘 토론에서 다뤄볼 만한 주제가 필요하시거나, 생각을 좀 정리해보고 싶은 게 있으면 편하게 이야기해주세요.';

const ALBUM_LIMIT = 5;

function computePhaseInfo(room) {
  const now = Date.now();
  const start = new Date(room.scheduled_at).getTime();
  const readEnd = start + (room.reading_minutes || 0) * 60000;
  const discEnd = readEnd + (room.discussion_minutes || 0) * 60000;
  if (now < start) return { phase: 'waiting', remaining: start - now };
  if (now < readEnd) return { phase: 'reading', remaining: readEnd - now };
  if (now < discEnd) return { phase: 'discussion', remaining: discEnd - now };
  return { phase: 'overtime', remaining: 0 };
}

// 토론 종료 후 자동 종료까지 남은 유예시간(연장 횟수만큼 1시간씩 늘어남)
function computeAutoCloseRemaining(room) {
  const start = new Date(room.scheduled_at).getTime();
  const discEnd = start + ((room.reading_minutes || 0) + (room.discussion_minutes || 0)) * 60000;
  const graceMs = (1 + (room.extension_count || 0)) * 60 * 60000;
  return (discEnd + graceMs) - Date.now();
}

const PHASE_MAP = {
  waiting:    { label: '대기 중',   color: '#9E8D7A', bg: 'rgba(158,141,122,0.08)', border: 'rgba(158,141,122,0.2)' },
  reading:    { label: '독서 중',   color: '#C49456', bg: 'rgba(196,148,86,0.1)',   border: 'rgba(196,148,86,0.3)' },
  discussion: { label: '토론 중',   color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)' },
  overtime:   { label: '시간 종료', color: '#BDB0A0', bg: 'rgba(189,176,160,0.08)', border: 'rgba(189,176,160,0.2)' },
};

const PHASE_TOAST = {
  reading:    { text: '📖 독서 시간이 시작되었습니다!', color: '#C49456' },
  discussion: { text: '💬 토론 시간이 시작되었습니다!', color: '#22c55e' },
};

function fmtRemaining(ms) {
  if (!ms || ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}시간 ${m % 60}분`; }
  if (m > 0) return `${m}분 ${String(s).padStart(2, '0')}초`;
  return `${s}초`;
}

const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = e => resolve(e.target.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function DiveRoomModal({ room: initialRoom, user, onClose, onJoin, onLeave, onDelete, onStatusChange, onOpenUserLibrary, startMinimized }) {
  const [room, setRoom] = useState(initialRoom);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [whisperTarget, setWhisperTarget] = useState(null); // { id, name } | null
  const [msgError, setMsgError] = useState('');
  const [editingNotice, setEditingNotice] = useState(false);
  const [noticeInput, setNoticeInput] = useState('');
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [albumImages, setAlbumImages] = useState([]);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [, setTick] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [chatHeight, setChatHeight] = useState(400);
  const [modalW, setModalW] = useState(() => Math.min(Math.round(window.innerWidth * 0.92), 1100));
  const [modalH, setModalH] = useState(() => Math.round(window.innerHeight * 0.85));
  const [minimized, setMinimized] = useState(!!startMinimized);
  const [toast, setToast] = useState(null);
  const [joinBookQuery, setJoinBookQuery] = useState('');
  const [joinBookResults, setJoinBookResults] = useState([]);
  const [isSearchingJoinBook, setIsSearchingJoinBook] = useState(false);
  const [selectedJoinBook, setSelectedJoinBook] = useState(null); // { title, image, isbn } | null
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState(null); // user_id | null
  const [kickTarget, setKickTarget] = useState(null); // { user_id, name } | null
  const [isKicking, setIsKicking] = useState(false);
  const [showOvertimeNotice, setShowOvertimeNotice] = useState(false);
  const [showExtendNotice, setShowExtendNotice] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const extendWarningShownForRef = useRef(null); // 이 extension_count 값에 대해 이미 경고를 띄웠는지
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAiChatSending, setIsAiChatSending] = useState(false);
  const aiChatAutoOpenedRef = useRef(false);
  const aiChatEndRef = useRef(null);
  const prevPhaseRef = useRef(null);
  const msgEndRef = useRef(null);
  const modalRef = useRef(null);
  const chatColRef = useRef(null);

  // 1초마다 tick → 실시간 카운트다운
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const { phase: computedPhase, remaining: phaseRemaining } = computePhaseInfo(room);
  const badge = PHASE_MAP[computedPhase] || PHASE_MAP.waiting;
  const remainingLabel = fmtRemaining(phaseRemaining);

  // 페이즈 전환 감지 → 토스트 / 종료 팝업
  useEffect(() => {
    if (prevPhaseRef.current !== null && prevPhaseRef.current !== computedPhase) {
      if (computedPhase === 'overtime') {
        setShowOvertimeNotice(true);
      } else {
        const t = PHASE_TOAST[computedPhase];
        if (t) setToast(t);
      }
    }
    prevPhaseRef.current = computedPhase;
  }, [computedPhase]);

  // 토스트 자동 소멸 (4초)
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const autoCloseRemaining = computeAutoCloseRemaining(room);

  // 자동 종료 10분 전 — 연장 여부를 묻는 경고 (연장할 때마다 다시 뜰 수 있도록 extension_count 기준으로 관리)
  useEffect(() => {
    if (computedPhase !== 'overtime') return;
    const key = room.extension_count || 0;
    if (extendWarningShownForRef.current === key) return;
    if (autoCloseRemaining > 0 && autoCloseRemaining <= 10 * 60 * 1000) {
      extendWarningShownForRef.current = key;
      setShowExtendNotice(true);
    }
  }, [computedPhase, autoCloseRemaining, room.extension_count]);

  // 시간 종료(overtime) 상태에선 다른 참가자의 연장 요청이나 서버 자동 종료를 감지하기 위해 주기적으로 재조회
  useEffect(() => {
    if (computedPhase !== 'overtime') return;
    const iv = setInterval(fetchRoom, 60000);
    return () => clearInterval(iv);
  }, [computedPhase]);

  const handleExtendRoom = async () => {
    if (!user?.token || isExtending) return;
    setIsExtending(true);
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/extend`, {
        method: 'POST', headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        await fetchRoom();
        setShowExtendNotice(false);
        setToast({ text: '⏰ 1시간 연장됐어요.', color: '#22c55e' });
      }
    } finally { setIsExtending(false); }
  };

  // 모달 높이가 줄어들면 chatHeight도 자동 클램프
  useEffect(() => {
    if (!chatColRef.current) return;
    const maxH = chatColRef.current.clientHeight - 90;
    if (chatHeight > maxH) setChatHeight(Math.max(160, maxH));
  }, [modalH]);

  const handleResizeDrag = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = chatHeight;
    const onMove = (ev) => {
      const maxH = chatColRef.current ? chatColRef.current.clientHeight - 90 : 600;
      setChatHeight(Math.max(160, Math.min(maxH, startH + ev.clientY - startY)));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleModalResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = modalRef.current?.offsetWidth ?? modalW;
    const startH = modalRef.current?.offsetHeight ?? 600;
    const onMove = (ev) => {
      setModalW(Math.max(520, startW + ev.clientX - startX));
      setModalH(Math.max(400, startH + ev.clientY - startY));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const isHost = user && room.host_id === parseInt(user.id);
  const myParticipant = room.participants?.find(p => p.user_id === parseInt(user?.id));
  const isParticipant = !!myParticipant;
  const isFull = (room.participant_count || 0) >= room.max_participants;
  const isEnded = room.status === 'ended';
  const needsBookChoice = !room.book_title;

  const chatDisabled = room.chat_enabled === false;
  const chatLocked = computedPhase === 'waiting' || (computedPhase === 'reading' && chatDisabled);
  const canSendMsg = isParticipant && !chatLocked && !isEnded;

  // 참가 중인 방은 닫아도(배경 클릭/X) 완전히 없애지 않고 최소화 위젯으로 남긴다
  const handleCloseOrMinimize = () => {
    if (isParticipant && !isEnded) setMinimized(true);
    else onClose();
  };

  const displayImage = room.room_image || room.book_image;

  // 독서 종료 5분 전 경고
  const showReadingWarning = computedPhase === 'reading' && phaseRemaining > 0 && phaseRemaining < 5 * 60 * 1000;
  const readingWarningPct = showReadingWarning ? Math.round((phaseRemaining / (5 * 60 * 1000)) * 100) : 100;

  // 토론 시작 10분 전 — 참가자에게 AI 대화창 자동으로 열기 (세션당 1회)
  useEffect(() => {
    if (aiChatAutoOpenedRef.current || !isParticipant) return;
    if (computedPhase === 'reading' && phaseRemaining > 0 && phaseRemaining <= 10 * 60 * 1000) {
      aiChatAutoOpenedRef.current = true;
      setAiChatOpen(true);
      setAiChatMessages([{ role: 'assistant', content: AI_CHAT_OPENING_LINE }]);
    }
  }, [isParticipant, computedPhase, phaseRemaining]);

  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatMessages]);

  const myPersonaId = user?.ai_persona;
  const myPersona = getPersona(myPersonaId);

  const handleSendAiChat = async () => {
    if (!aiChatInput.trim() || !user?.token || isAiChatSending) return;
    const userMsg = { role: 'user', content: aiChatInput.trim() };
    const historyForApi = aiChatMessages;
    setAiChatMessages(prev => [...prev, userMsg]);
    setAiChatInput('');
    setIsAiChatSending(true);
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/ai-chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, history: historyForApi }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {} finally { setIsAiChatSending(false); }
  };

  const fmtTime = (dt) => {
    const d = new Date(dt);
    const mm = d.getMonth() + 1; const dd = d.getDate();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${mi}`;
  };

  const fetchRoom = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}`);
      if (res.ok) setRoom(await res.json());
    } catch {}
  };

  const fetchMessages = async () => {
    if (!user?.token || !isParticipant) return;
    setIsLoadingMsgs(true);
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/messages`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) setMessages(await res.json());
    } catch {} finally { setIsLoadingMsgs(false); }
  };

  const fetchAlbum = async () => {
    if (!user?.id) return;
    setIsLoadingAlbum(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}/album`);
      if (res.ok) setAlbumImages(await res.json());
    } catch {} finally { setIsLoadingAlbum(false); }
  };

  useEffect(() => {
    fetchRoom();
  }, []);

  // 참가자일 때만 채팅 기록을 불러오고, 웹소켓으로 새 메시지를 실시간으로 수신한다.
  useEffect(() => {
    if (!isParticipant || !user?.token) return;
    fetchMessages();

    let ws;
    let closedByCleanup = false;
    let reconnectTimer;

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const base = API_URL ? API_URL.replace(/^http/, 'ws') : `${proto}://${window.location.host}`;
      ws = new WebSocket(`${base}/api/dive/rooms/${room.id}/ws?token=${encodeURIComponent(user.token)}`);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'room_update') { fetchRoom(); return; }
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
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
      ws?.close();
    };
  }, [isParticipant, room.id]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = async () => {
    if (!user?.token || isJoining) return;
    if (needsBookChoice && !selectedJoinBook) { setJoinError('먼저 읽으실 책을 선택해주세요.'); return; }
    setIsJoining(true);
    setJoinError('');
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(needsBookChoice ? {
          book_title: selectedJoinBook.title, book_image: selectedJoinBook.image, book_isbn: selectedJoinBook.isbn,
        } : {}),
      });
      if (res.ok) {
        await fetchRoom();
        onJoin?.();
        setToast({ text: '🎉 모임에 참가했어요!', color: '#22c55e' });
      } else { const err = await res.json(); setJoinError(err.detail || '참가에 실패했습니다.'); }
    } finally { setIsJoining(false); }
  };

  const handleJoinBookSearch = async () => {
    if (!joinBookQuery.trim()) return;
    setIsSearchingJoinBook(true);
    try {
      const res = await fetch(`${API_URL}/api/books/search?query=${encodeURIComponent(joinBookQuery)}`);
      const data = await res.json();
      setJoinBookResults((data.items || []).slice(0, 5));
    } catch {} finally { setIsSearchingJoinBook(false); }
  };

  const selectJoinBook = (book) => {
    setSelectedJoinBook({ title: (book.title || '').replace(/<\/?[^>]+>/g, ''), image: book.image || '', isbn: book.isbn || '' });
    setJoinBookResults([]);
    setJoinBookQuery('');
    setJoinError('');
  };

  const handleLeave = async () => {
    if (!user?.token) return;
    await fetch(`${API_URL}/api/dive/rooms/${room.id}/leave`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${user.token}` },
    });
    await fetchRoom();
    onLeave?.();
    setToast({ text: '모임에서 나갔어요.', color: '#9E8D7A' });
  };

  const handleToggleMyStatus = async () => {
    if (!user?.token || !myParticipant || isTogglingStatus) return;
    const nextStatus = myParticipant.status === 'paused' ? 'reading' : 'paused';
    setIsTogglingStatus(true);
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/my-status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) await fetchRoom();
    } finally { setIsTogglingStatus(false); }
  };

  const handleKickParticipant = async () => {
    if (!user?.token || !kickTarget || isKicking) return;
    setIsKicking(true);
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/participants/${kickTarget.user_id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) await fetchRoom();
    } finally { setIsKicking(false); setKickTarget(null); }
  };

  const handleSendMsg = async () => {
    if (!msgInput.trim() || !user?.token || isSending || chatLocked) return;
    setIsSending(true);
    setMsgError('');
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msgInput.trim(), to_user_id: whisperTarget?.id || null }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        setMsgInput('');
      } else {
        const err = await res.json().catch(() => ({}));
        setMsgError(err.detail || '메시지 전송에 실패했습니다.');
      }
    } finally { setIsSending(false); }
  };

  const handleToggleChat = async () => {
    if (!user?.token) return;
    const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/chat`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${user.token}` },
    });
    if (res.ok) { const updated = await res.json(); setRoom(prev => ({ ...prev, chat_enabled: updated.chat_enabled })); }
  };

  const handleSaveNotice = async () => {
    if (!user?.token) return;
    setIsSavingNotice(true);
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/notice`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notice: noticeInput }),
      });
      if (res.ok) { setRoom(prev => ({ ...prev, notice: noticeInput })); setEditingNotice(false); }
    } finally { setIsSavingNotice(false); }
  };

  const handleEndSession = async () => {
    if (!user?.token) return;
    const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/status?status=ended`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${user.token}` },
    });
    if (res.ok) { await fetchRoom(); onStatusChange?.(); }
  };

  const handleDelete = async () => {
    if (!user?.token) return;
    await fetch(`${API_URL}/api/dive/rooms/${room.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${user.token}` },
    });
    onDelete?.();
    onClose();
  };

  const handlePickImage = async (imageData) => {
    setShowImagePicker(false);
    if (!user?.token) return;
    const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/image`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_image: imageData || '' }),
    });
    if (res.ok) setRoom(prev => ({ ...prev, room_image: imageData || '' }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.token) return;
    e.target.value = '';
    setIsUploadingImage(true);
    try {
      const imageData = await readFileAsDataURL(file);
      const res = await fetch(`${API_URL}/api/users/${user.id}/album`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imageData }),
      });
      if (res.ok) {
        const newImg = await res.json();
        setAlbumImages(prev => [newImg, ...prev]);
        await handlePickImage(newImg.image_data);
      }
    } finally { setIsUploadingImage(false); }
  };

  const handleDeleteAlbumImage = async (imageId) => {
    if (!user?.token) return;
    await fetch(`${API_URL}/api/users/${user.id}/album/${imageId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${user.token}` },
    });
    setAlbumImages(prev => prev.filter(img => img.id !== imageId));
    const deleted = albumImages.find(img => img.id === imageId);
    if (deleted && room.room_image === deleted.image_data) {
      setRoom(prev => ({ ...prev, room_image: '' }));
    }
  };

  const toggleImagePicker = () => {
    const next = !showImagePicker;
    if (next && albumImages.length === 0) fetchAlbum();
    setShowImagePicker(next);
  };

  const chatLabel =
      computedPhase === 'waiting'  ? '채팅 (독서 시작 전)'
    : computedPhase === 'reading'  ? (chatDisabled ? '채팅 잠금 (독서 중)' : '채팅 (독서 중)')
    : computedPhase === 'overtime' ? '토론 종료 (채팅 유지)'
    : '토론 채팅';

  const chatBg = chatLocked ? 'rgba(120,100,80,0.04)' : 'rgba(140,107,66,0.02)';
  const chatBorder = chatLocked ? 'rgba(139,107,66,0.08)' : 'rgba(139,107,66,0.12)';

  // ── 토스트 (공통) ──────────────────────────────────────────
  const ToastEl = toast && (
    <AnimatePresence>
      <motion.div
        key={toast.text}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        style={{
          position: 'fixed', bottom: '5.5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 2000, background: '#FEFCF9', border: `1px solid ${toast.color}40`,
          borderRadius: '9999px', padding: '0.5rem 1.25rem',
          boxShadow: `0 4px 20px rgba(0,0,0,0.12), 0 0 0 3px ${toast.color}18`,
          fontSize: '13px', fontWeight: 800, color: toast.color,
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}
      >
        {toast.text}
      </motion.div>
    </AnimatePresence>
  );

  // ── 최소화 위젯 ─────────────────────────────────────────────
  if (minimized) {
    return (
      <>
        {ToastEl}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          style={{
            position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1000,
            background: '#FEFCF9', border: '1px solid rgba(139,107,66,0.2)',
            borderRadius: '9999px', boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.875rem 0.5rem 0.625rem',
            cursor: 'pointer', userSelect: 'none',
          }}
          onClick={() => setMinimized(false)}
        >
          {/* 방 이미지 미니 */}
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {displayImage
              ? <img src={displayImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 900, fontSize: '12px' }}>{(room.host_name || '?')[0]}</span>}
          </div>

          {/* 페이즈 배지 */}
          <span style={{ fontSize: '10px', fontWeight: 900, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, padding: '2px 8px', borderRadius: '9999px', flexShrink: 0 }}>
            {badge.label}
          </span>

          {/* 방 제목 */}
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#1C140E', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {room.title}
          </span>

          {/* 남은 시간 */}
          {remainingLabel && (
            <>
              <span style={{ width: '1px', height: '14px', background: 'rgba(139,107,66,0.2)', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: showReadingWarning ? '#ef4444' : '#8C6B42', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-block', minWidth: '52px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {remainingLabel}
              </span>
            </>
          )}

          {/* 열기 버튼 */}
          <button
            onClick={e => { e.stopPropagation(); setMinimized(false); }}
            style={{ width: '24px', height: '24px', borderRadius: '9999px', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8C6B42', flexShrink: 0, marginLeft: '0.125rem' }}
          >
            <Maximize2 size={12} />
          </button>
        </motion.div>
      </>
    );
  }

  // ── 입장 전 안내 화면 (참가자가 아니면 방 정보 + 책 선택만 보여준다) ──
  if (!isParticipant) {
    return (
      <>
        {ToastEl}
        <div className="modal-backdrop overflow-y-auto" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 32 }}
            onClick={e => e.stopPropagation()}
            className="modal-content relative my-auto"
            style={{ width: Math.min(modalW, 520), maxWidth: '95vw', maxHeight: '85vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* 헤더 */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(139,107,66,0.1)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontWeight: 900, fontSize: '1.05rem', color: '#1C140E' }}>{room.title}</h2>
                    <span style={{
                      fontSize: '9px', fontWeight: 900,
                      color: room.book_title ? '#8C6B42' : '#16a34a',
                      background: room.book_title ? 'rgba(140,107,66,0.1)' : 'rgba(34,197,94,0.1)',
                      border: `1px solid ${room.book_title ? 'rgba(140,107,66,0.25)' : 'rgba(34,197,94,0.25)'}`,
                      padding: '2px 8px', borderRadius: '9999px',
                    }}>
                      {room.book_title ? '📌 지정도서' : '📖 자유도서'}
                    </span>
                  </div>
                  {room.book_title && <p style={{ fontSize: '12px', color: '#8C6B42', fontWeight: 700 }}>📚 {room.book_title}</p>}
                  <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700, marginTop: '0.2rem' }}>방장: {room.host_name}</p>
                </div>
                <button onClick={onClose} style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A', flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {/* 방 정보 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {[
                  { icon: <Calendar size={11} />, label: fmtTime(room.scheduled_at) },
                  { icon: <Clock size={11} />, label: `독서 ${room.reading_minutes}분 + 토론 ${room.discussion_minutes}분` },
                  { icon: <Users size={11} />, label: `${room.participant_count || 0}/${room.max_participants}명` },
                  ...(room.late_join_cutoff_minutes > 0 ? [{ icon: <Lock size={11} />, label: `${room.late_join_cutoff_minutes}분 전 마감` }] : []),
                ].map((item, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '10px', fontWeight: 700, color: '#9E8D7A', background: 'rgba(139,107,66,0.04)', border: '1px solid rgba(139,107,66,0.1)', padding: '3px 8px', borderRadius: '9999px' }}>
                    {item.icon}{item.label}
                  </span>
                ))}
              </div>

              {/* 공지 */}
              {room.notice && (
                <div style={{ marginBottom: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(196,148,86,0.06)', border: '1px solid rgba(196,148,86,0.2)', borderRadius: '0.75rem' }}>
                  <p style={{ fontSize: '0.8125rem', color: '#7B6B55', lineHeight: 1.6 }}>📌 {room.notice}</p>
                </div>
              )}

              {/* 참여인원 */}
              <p style={{ fontSize: '11px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                참가자 ({room.participants?.length || 0}명)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.25rem' }}>
                {(room.participants?.length || 0) === 0
                  ? <p style={{ fontSize: '0.8125rem', color: '#BDB0A0', fontWeight: 600 }}>아직 참가자가 없습니다.</p>
                  : room.participants.map(p => {
                    const bookTitle = p.book_title || room.book_title;
                    const bookImage = p.book_image || room.book_image;
                    const statusInfo = p.status === 'paused' ? { label: '일시정지', color: '#9E8D7A' } : p.status === 'ended' ? { label: '종료', color: '#BDB0A0' } : { label: '독서 중', color: '#22c55e' };
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.625rem', background: 'rgba(140,107,66,0.05)', border: '1px solid rgba(140,107,66,0.1)', borderRadius: '0.625rem' }}>
                        <div style={{ width: '18px', height: '25px', borderRadius: '3px', overflow: 'hidden', flexShrink: 0, background: '#EDE8E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {bookImage ? <img src={bookImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <BookOpen size={9} style={{ color: '#BDB0A0' }} />}
                        </div>
                        <div style={{ width: '22px', height: '22px', borderRadius: '9999px', background: 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', fontWeight: 900, flexShrink: 0, overflow: 'hidden' }}>
                          {p.profile_image ? <img src={p.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.name || '?')[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#3D2D1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                            {room.host_id === p.user_id && <span style={{ fontSize: '10px' }}>👑</span>}
                          </div>
                          {bookTitle && <div style={{ fontSize: '9px', color: '#9E8D7A', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookTitle}</div>}
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: statusInfo.color, flexShrink: 0 }}>{statusInfo.label}</span>
                      </div>
                    );
                  })}
              </div>

              {/* 책 선택 (자유도서인 경우 참가 전에 필수) */}
              {user && !isFull && (
                <div>
                  {needsBookChoice && !selectedJoinBook && (
                    <div style={{ marginBottom: '0.625rem', padding: '0.75rem', background: 'rgba(140,107,66,0.06)', border: '1px solid rgba(140,107,66,0.25)', borderRadius: '0.875rem' }}>
                      <p style={{ fontSize: '11px', fontWeight: 800, color: '#8C6B42', marginBottom: '0.25rem' }}>📚 지정된 도서가 없는 모임이에요</p>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#9E8D7A', marginBottom: '0.5rem' }}>아래에서 읽으실 책을 검색해 선택해야 참가할 수 있어요.</p>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <input
                          value={joinBookQuery}
                          onChange={e => setJoinBookQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleJoinBookSearch()}
                          placeholder="책 제목 검색..."
                          className="form-input"
                          style={{ flex: 1, height: '2.25rem', fontSize: '0.8125rem', color: '#1C140E' }}
                        />
                        <button onClick={handleJoinBookSearch} disabled={isSearchingJoinBook} style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'rgba(140,107,66,0.1)', border: '1px solid rgba(140,107,66,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8C6B42', flexShrink: 0 }}>
                          {isSearchingJoinBook ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                        </button>
                      </div>
                      {joinBookResults.length > 0 && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '160px', overflowY: 'auto' }}>
                          {joinBookResults.map((b, i) => (
                            <div key={i} onClick={() => selectJoinBook(b)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(139,107,66,0.1)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                              <div style={{ width: '20px', height: '28px', borderRadius: '3px', overflow: 'hidden', flexShrink: 0, background: '#EDE8E2' }}>
                                {b.image && <img src={b.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#3D2D1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(b.title || '').replace(/<\/?[^>]+>/g, '')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {needsBookChoice && selectedJoinBook && (
                    <div style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(140,107,66,0.06)', border: '1px solid rgba(140,107,66,0.2)', borderRadius: '0.75rem' }}>
                      <div style={{ width: '20px', height: '28px', borderRadius: '3px', overflow: 'hidden', flexShrink: 0, background: '#EDE8E2' }}>
                        {selectedJoinBook.image && <img src={selectedJoinBook.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <span style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: '#3D2D1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedJoinBook.title}</span>
                      <button onClick={() => setSelectedJoinBook(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E8D7A' }}><X size={13} /></button>
                    </div>
                  )}
                  <button onClick={handleJoin} disabled={isJoining || (needsBookChoice && !selectedJoinBook)} className="premium-button" style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (needsBookChoice && !selectedJoinBook) ? 0.5 : 1 }}>
                    {isJoining ? <Loader2 className="animate-spin" size={16} /> : <Waves size={16} />}
                    {needsBookChoice && !selectedJoinBook ? '책을 먼저 선택해주세요' : '모임 참가하기'}
                  </button>
                  {joinError && (
                    <p style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, textAlign: 'center', marginTop: '0.375rem' }}>{joinError}</p>
                  )}
                </div>
              )}
              {isFull && (
                <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#9E8D7A', textAlign: 'center', padding: '0.75rem' }}>인원이 가득 찼습니다</p>
              )}
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // ── 대기 화면 (독서 시작 전엔 정보 + 참가 예정 명단만 간단히 보여준다) ──
  if (computedPhase === 'waiting') {
    return (
      <>
        {ToastEl}
        <div className="modal-backdrop overflow-y-auto" onClick={handleCloseOrMinimize}>
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 32 }}
            onClick={e => e.stopPropagation()}
            className="modal-content relative my-auto"
            style={{ width: Math.min(modalW, 560), maxWidth: '95vw', maxHeight: '85vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* 헤더 */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(139,107,66,0.1)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontWeight: 900, fontSize: '1.05rem', color: '#1C140E' }}>{room.title}</h2>
                    <span style={{ fontSize: '9px', fontWeight: 900, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, padding: '2px 8px', borderRadius: '9999px' }}>
                      {badge.label}{remainingLabel ? ` · ${remainingLabel}` : ''}
                    </span>
                  </div>
                  {room.book_title && <p style={{ fontSize: '12px', color: '#8C6B42', fontWeight: 700 }}>📚 {room.book_title}</p>}
                  <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700, marginTop: '0.2rem' }}>방장: {room.host_name}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                  <button onClick={() => setMinimized(true)} title="최소화" style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A' }}>
                    <Minimize2 size={13} />
                  </button>
                  <button onClick={handleCloseOrMinimize} style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                {[
                  { icon: <Calendar size={11} />, label: fmtTime(room.scheduled_at) },
                  { icon: <Clock size={11} />, label: `독서 ${room.reading_minutes}분 + 토론 ${room.discussion_minutes}분` },
                  { icon: <Users size={11} />, label: `${room.participant_count || 0}/${room.max_participants}명` },
                  ...(room.late_join_cutoff_minutes > 0 ? [{ icon: <Lock size={11} />, label: `${room.late_join_cutoff_minutes}분 전 마감` }] : []),
                ].map((item, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '10px', fontWeight: 700, color: '#9E8D7A', background: 'rgba(139,107,66,0.04)', border: '1px solid rgba(139,107,66,0.1)', padding: '3px 8px', borderRadius: '9999px' }}>
                    {item.icon}{item.label}
                  </span>
                ))}
              </div>

              {/* 공지 */}
              {isHost ? (
                <div style={{ marginTop: '0.625rem', padding: '0.5rem 0.875rem', background: 'rgba(196,148,86,0.06)', border: '1px solid rgba(196,148,86,0.2)', borderRadius: '0.75rem' }}>
                  {editingNotice ? (
                    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-start' }}>
                      <textarea value={noticeInput} onChange={e => setNoticeInput(e.target.value)} rows={2} style={{ flex: 1, fontSize: '0.8125rem', color: '#1C140E', background: 'transparent', border: 'none', outline: 'none', resize: 'none', lineHeight: 1.6 }} autoFocus />
                      <button onClick={handleSaveNotice} disabled={isSavingNotice} style={{ ...ctrlBtnStyle('#22c55e'), flexShrink: 0 }}>
                        {isSavingNotice ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      </button>
                      <button onClick={() => setEditingNotice(false)} style={{ ...ctrlBtnStyle('#9E8D7A'), flexShrink: 0 }}><X size={11} /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <p style={{ flex: 1, fontSize: '0.8125rem', color: '#7B6B55', lineHeight: 1.6 }}>📌 {room.notice || <span style={{ color: '#BDB0A0' }}>공지 없음</span>}</p>
                      <button onClick={() => { setNoticeInput(room.notice || ''); setEditingNotice(true); }} style={{ ...ctrlBtnStyle('#8C6B42'), flexShrink: 0 }}><Pencil size={11} /></button>
                    </div>
                  )}
                </div>
              ) : room.notice ? (
                <div style={{ marginTop: '0.625rem', padding: '0.5rem 0.875rem', background: 'rgba(196,148,86,0.06)', border: '1px solid rgba(196,148,86,0.2)', borderRadius: '0.75rem' }}>
                  <p style={{ fontSize: '0.8125rem', color: '#7B6B55', lineHeight: 1.6 }}>📌 {room.notice}</p>
                </div>
              ) : null}
            </div>

            {/* 본문: 참가 예정 명단 */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <p style={{ fontSize: '11px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                참가 예정 ({room.participants?.length || 0}명)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                {(room.participants?.length || 0) === 0
                  ? <p style={{ fontSize: '0.8125rem', color: '#BDB0A0', fontWeight: 600 }}>아직 참가자가 없습니다.</p>
                  : room.participants.map(p => (
                    <ParticipantRow
                      key={p.id} p={p} room={room} currentUserId={user?.id} isHost={isHost}
                      whisperTarget={whisperTarget}
                      menuOpen={openMenuFor === p.user_id}
                      onToggleMenu={(uid) => setOpenMenuFor(prev => prev === uid ? null : uid)}
                      onWhisper={(target) => { setWhisperTarget(whisperTarget?.id === target.user_id ? null : { id: target.user_id, name: target.name }); setOpenMenuFor(null); }}
                      onOpenProfile={(uid, name) => { onOpenUserLibrary?.(uid, name); setOpenMenuFor(null); }}
                      onKick={(target) => { setKickTarget({ user_id: target.user_id, name: target.name }); setOpenMenuFor(null); }}
                    />
                  ))}
              </div>
            </div>

            {/* 하단 */}
            <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid rgba(139,107,66,0.08)', flexShrink: 0 }}>
              {isHost ? (
                confirmDelete ? (
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <p style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 800, color: '#dc2626' }}>방을 삭제하시겠습니까?</p>
                    <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                      <button onClick={() => setConfirmDelete(false)} style={ctrlBtnStyle('#9E8D7A')}>취소</button>
                      <button onClick={handleDelete} style={{ ...ctrlBtnStyle('#ef4444'), background: 'rgba(239,68,68,0.12)', fontWeight: 900 }}>삭제 확인</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', padding: '0.625rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 800, color: '#dc2626', cursor: 'pointer' }}>
                    방 삭제
                  </button>
                )
              ) : (
                <button onClick={handleLeave} style={{ width: '100%', padding: '0.625rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 800, color: '#dc2626', cursor: 'pointer' }}>
                  모임에서 나가기
                </button>
              )}
            </div>
          </motion.div>
        </div>

        {kickTarget && (
          <div className="modal-backdrop" style={{ zIndex: 300 }} onClick={() => !isKicking && setKickTarget(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              onClick={e => e.stopPropagation()}
              className="modal-content relative my-auto"
              style={{ maxWidth: '360px', padding: '1.5rem' }}
            >
              <p style={{ fontSize: '1rem', fontWeight: 900, color: '#1C140E', marginBottom: '0.5rem' }}>참가자 추방</p>
              <p style={{ fontSize: '0.875rem', color: '#7B6B55', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                <strong style={{ color: '#dc2626' }}>{kickTarget.name}</strong>님을 이 모임에서 추방하시겠습니까?
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setKickTarget(null)} disabled={isKicking} style={{ flex: 1, padding: '0.625rem', background: 'rgba(139,107,66,0.06)', border: '1px solid rgba(139,107,66,0.15)', borderRadius: '0.875rem', fontSize: '0.8125rem', fontWeight: 800, color: '#9E8D7A', cursor: 'pointer' }}>취소</button>
                <button onClick={handleKickParticipant} disabled={isKicking} style={{ flex: 1, padding: '0.625rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.875rem', fontSize: '0.8125rem', fontWeight: 900, color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                  {isKicking ? <Loader2 size={13} className="animate-spin" /> : '추방하기'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </>
    );
  }

  // ── 전체 모달 ────────────────────────────────────────────────
  return (
    <>
      {ToastEl}
      <div className="modal-backdrop overflow-y-auto" onClick={handleCloseOrMinimize}>
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.93, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 32 }}
          onClick={e => e.stopPropagation()}
          className="modal-content relative my-auto"
          style={{ width: modalW, maxWidth: '95vw', ...(modalH != null ? { height: modalH } : {}), padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          {/* 헤더 */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(139,107,66,0.1)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>

              {/* 방 이미지 */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  onClick={isHost ? toggleImagePicker : undefined}
                  style={{ width: '48px', minWidth: '48px', height: '68px', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', background: 'rgba(140,107,66,0.08)', cursor: isHost ? 'pointer' : 'default', position: 'relative' }}
                >
                  {displayImage
                    ? <img src={displayImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#8C6B42,#C49456)', color: 'white', fontSize: '20px', fontWeight: 900 }}>
                        {(room.host_name || '?')[0]}
                      </div>}
                  {isHost && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20px', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={10} style={{ color: 'white' }} />
                    </div>
                  )}
                </div>

                {/* 앨범 픽커 */}
                {showImagePicker && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{ position: 'absolute', top: '100%', left: 0, zIndex: 300, marginTop: '0.375rem', background: '#FEFCF9', border: '1px solid rgba(139,107,66,0.2)', borderRadius: '0.875rem', padding: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', width: '220px' }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#8C6B42', marginBottom: '0.5rem' }}>
                      앨범 ({albumImages.length}/{ALBUM_LIMIT})
                    </div>
                    {isLoadingAlbum
                      ? <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}><Loader2 size={16} className="animate-spin" style={{ color: '#8C6B42' }} /></div>
                      : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.375rem', marginBottom: '0.5rem' }}>
                          <div
                            onClick={() => handlePickImage(null)}
                            title="기본 (아바타)"
                            style={{ aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', background: 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: !room.room_image ? '2px solid #8C6B42' : '2px solid transparent' }}
                          >
                            <span style={{ color: 'white', fontWeight: 900, fontSize: '14px' }}>{(room.host_name || '?')[0]}</span>
                          </div>
                          {room.book_image && (
                            <div
                              onClick={() => handlePickImage(room.book_image)}
                              title="책 표지"
                              style={{ aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: room.room_image === room.book_image ? '2px solid #8C6B42' : '2px solid transparent' }}
                            >
                              <img src={room.book_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}
                          {albumImages.map(img => (
                            <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: room.room_image === img.image_data ? '2px solid #8C6B42' : '2px solid transparent' }}
                              onClick={() => handlePickImage(img.image_data)}
                            >
                              <img src={img.image_data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button
                                onClick={e => { e.stopPropagation(); handleDeleteAlbumImage(img.id); }}
                                style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '9999px', background: 'rgba(239,68,68,0.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              >
                                <X size={9} style={{ color: 'white' }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    {albumImages.length < ALBUM_LIMIT ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', padding: '0.375rem 0.625rem', background: 'rgba(140,107,66,0.06)', border: '1px dashed rgba(140,107,66,0.3)', borderRadius: '0.625rem', fontSize: '11px', fontWeight: 700, color: '#8C6B42' }}>
                        {isUploadingImage ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                        새 이미지 추가
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={isUploadingImage} />
                      </label>
                    ) : (
                      <p style={{ fontSize: '10px', color: '#BDB0A0', fontWeight: 600, lineHeight: 1.5 }}>
                        앨범이 가득 찼습니다 (최대 {ALBUM_LIMIT}장)<br />이후 확장 가능 예정
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <h2 style={{ fontWeight: 900, fontSize: '1rem', color: '#1C140E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{room.title}</h2>
                  {/* 페이즈 배지 + 남은 시간 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '9px', fontWeight: 900, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, padding: '2px 8px', borderRadius: '9999px' }}>
                      {badge.label}
                    </span>
                    {remainingLabel && (
                      <span style={{ fontSize: '9px', fontWeight: 800, color: showReadingWarning ? '#ef4444' : '#9E8D7A', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
                        · <span style={{ display: 'inline-block', minWidth: '42px', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{remainingLabel}</span>
                      </span>
                    )}
                  </div>
                </div>
                {room.book_title && <p style={{ fontSize: '11px', color: '#8C6B42', fontWeight: 700, marginBottom: '0.2rem' }}>📚 {room.book_title}</p>}
                <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700 }}>방장: {room.host_name}</p>
              </div>

              {/* 최소화 + 닫기 버튼 */}
              <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                <button onClick={() => setMinimized(true)} title="최소화" style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A' }}>
                  <Minimize2 size={13} />
                </button>
                <button onClick={handleCloseOrMinimize} style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A' }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
              {[
                { icon: <Calendar size={11} />, label: fmtTime(room.scheduled_at) },
                { icon: <Clock size={11} />, label: `독서 ${room.reading_minutes}분 + 토론 ${room.discussion_minutes}분` },
                { icon: <Users size={11} />, label: `${room.participant_count || 0}/${room.max_participants}명` },
                ...(room.late_join_cutoff_minutes > 0 ? [{ icon: <Lock size={11} />, label: `${room.late_join_cutoff_minutes}분 전 마감` }] : []),
              ].map((item, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '10px', fontWeight: 700, color: '#9E8D7A', background: 'rgba(139,107,66,0.04)', border: '1px solid rgba(139,107,66,0.1)', padding: '3px 8px', borderRadius: '9999px' }}>
                  {item.icon}{item.label}
                </span>
              ))}
            </div>

            {/* 독서 종료 임박 경고 배너 */}
            <AnimatePresence>
              {showReadingWarning && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: '0.625rem' }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '0.5rem 0.875rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#dc2626' }}>⏱ 곧 토론이 시작됩니다</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444' }}>{remainingLabel} 후</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(239,68,68,0.12)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${readingWarningPct}%`, background: 'linear-gradient(90deg,#ef4444,#f97316)', borderRadius: '9999px', transition: 'width 1s linear' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 공지 */}
            {isHost ? (
              <div style={{ marginTop: '0.625rem', padding: '0.5rem 0.875rem', background: 'rgba(196,148,86,0.06)', border: '1px solid rgba(196,148,86,0.2)', borderRadius: '0.75rem' }}>
                {editingNotice ? (
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-start' }}>
                    <textarea value={noticeInput} onChange={e => setNoticeInput(e.target.value)} rows={2} style={{ flex: 1, fontSize: '0.8125rem', color: '#1C140E', background: 'transparent', border: 'none', outline: 'none', resize: 'none', lineHeight: 1.6 }} autoFocus />
                    <button onClick={handleSaveNotice} disabled={isSavingNotice} style={{ ...ctrlBtnStyle('#22c55e'), flexShrink: 0 }}>
                      {isSavingNotice ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    </button>
                    <button onClick={() => setEditingNotice(false)} style={{ ...ctrlBtnStyle('#9E8D7A'), flexShrink: 0 }}><X size={11} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <p style={{ flex: 1, fontSize: '0.8125rem', color: '#7B6B55', lineHeight: 1.6 }}>📌 {room.notice || <span style={{ color: '#BDB0A0' }}>공지 없음</span>}</p>
                    <button onClick={() => { setNoticeInput(room.notice || ''); setEditingNotice(true); }} style={{ ...ctrlBtnStyle('#8C6B42'), flexShrink: 0 }}><Pencil size={11} /></button>
                  </div>
                )}
              </div>
            ) : room.notice ? (
              <div style={{ marginTop: '0.625rem', padding: '0.5rem 0.875rem', background: 'rgba(196,148,86,0.06)', border: '1px solid rgba(196,148,86,0.2)', borderRadius: '0.75rem' }}>
                <p style={{ fontSize: '0.8125rem', color: '#7B6B55', lineHeight: 1.6 }}>📌 {room.notice}</p>
              </div>
            ) : null}
          </div>

          {/* 본문 — 좌: 채팅 / 우: 참가자 (대기 단계는 별도 화면으로 분리됨) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', borderBottom: '1px solid rgba(139,107,66,0.08)', flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {/* 좌: 채팅 */}
            <div ref={chatColRef} style={{ padding: '1rem 1rem 1rem 1.5rem', borderRight: '1px solid rgba(139,107,66,0.08)', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  {chatLocked && <Lock size={11} style={{ color: '#BDB0A0' }} />}
                  <p style={{ fontSize: '11px', fontWeight: 900, color: chatLocked ? '#BDB0A0' : '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{chatLabel}</p>
                </div>
                <button onClick={fetchMessages} style={{ display: 'flex', alignItems: 'center', color: '#BDB0A0', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <RefreshCw size={10} />
                </button>
              </div>

              <div style={{ height: chatHeight, overflowY: 'auto', border: `1px solid ${chatBorder}`, borderRadius: '0.875rem', padding: '0.75rem', background: chatBg, display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: chatLocked ? 0.65 : 1, transition: 'opacity 0.2s' }}>
                {!isParticipant
                  ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.375rem' }}>
                      <Lock size={16} style={{ color: '#BDB0A0' }} />
                      <p style={{ fontSize: '0.8125rem', color: '#BDB0A0', fontWeight: 600 }}>참가 후 채팅을 볼 수 있어요</p>
                    </div>
                  : isLoadingMsgs
                  ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Loader2 className="animate-spin" size={18} style={{ color: '#8C6B42' }} /></div>
                  : messages.length === 0
                    ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.375rem' }}>
                        {chatLocked && <Lock size={16} style={{ color: '#BDB0A0' }} />}
                        <p style={{ fontSize: '0.8125rem', color: '#BDB0A0', fontWeight: 600 }}>
                          {chatDisabled ? '채팅이 비허용 상태입니다' : chatLocked ? '채팅이 잠겨있습니다' : '메시지가 없습니다'}
                        </p>
                      </div>
                    : messages.map(m => (
                      <div key={m.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', opacity: m.to_user_id ? 0.85 : 1 }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '9999px', background: m.is_ai ? 'linear-gradient(135deg,#C49456,#F59E0B)' : 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 900, flexShrink: 0, overflow: 'hidden' }}>
                          {m.is_ai ? 'AI' : m.user_image ? <img src={m.user_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.user_name || '?')[0]}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: m.is_ai ? '#C49456' : '#8C6B42', marginRight: '0.25rem' }}>{m.is_ai ? 'AI' : m.user_name}</span>
                          {m.to_user_id && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#C49456', marginRight: '0.25rem' }}>
                              → {m.to_user_id === parseInt(user?.id) ? '나' : (m.to_user_name || '?')} 귓속말
                            </span>
                          )}
                          <p style={{ fontSize: '0.8125rem', color: m.to_user_id ? '#8C6B42' : '#3D2D1E', lineHeight: 1.5, wordBreak: 'break-word', fontStyle: m.to_user_id ? 'italic' : 'normal' }}>{m.content}</p>
                        </div>
                      </div>
                    ))}
                <div ref={msgEndRef} />
              </div>

              {/* 채팅 크기 조절 핸들 */}
              <div
                onMouseDown={handleResizeDrag}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '12px', cursor: 'ns-resize', flexShrink: 0, userSelect: 'none' }}
              >
                <div style={{ width: '36px', height: '3px', borderRadius: '9999px', background: 'rgba(139,107,66,0.18)' }} />
              </div>

              {whisperTarget && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', background: 'rgba(196,148,86,0.12)', border: '1px solid rgba(196,148,86,0.3)', borderRadius: '0.625rem', fontSize: '11px', fontWeight: 700, color: '#8C6B42' }}>
                  <span style={{ flex: 1 }}>{whisperTarget.name}님에게 귓속말 중</span>
                  <button onClick={() => setWhisperTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C6B42', display: 'flex' }}>
                    <X size={12} />
                  </button>
                </div>
              )}
              {msgError && (
                <p style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>{msgError}</p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="form-input"
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMsg()}
                  placeholder={chatLocked ? '🔒 토론 시작 후 채팅 가능' : whisperTarget ? `${whisperTarget.name}님에게 귓속말...` : '메시지를 입력하세요...'}
                  disabled={!canSendMsg}
                  style={{ flex: 1, color: '#1C140E', opacity: canSendMsg ? 1 : 0.5, cursor: canSendMsg ? 'text' : 'not-allowed' }}
                />
                <button
                  onClick={handleSendMsg}
                  disabled={!canSendMsg || !msgInput.trim() || isSending}
                  style={{ padding: '0 0.875rem', background: 'rgba(140,107,66,0.1)', border: '1px solid rgba(140,107,66,0.25)', borderRadius: '0.875rem', cursor: canSendMsg ? 'pointer' : 'not-allowed', color: '#8C6B42', display: 'flex', alignItems: 'center', opacity: (!canSendMsg || !msgInput.trim() || isSending) ? 0.4 : 1 }}
                >
                  {isSending ? <Loader2 size={14} className="animate-spin" /> : chatLocked ? <Lock size={14} /> : <Send size={14} />}
                </button>
              </div>
            </div>

            {/* 우: 참가자 */}
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'hidden' }}>
              <p style={{ fontSize: '11px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                참가자 ({room.participants?.length || 0}명)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', overflowY: 'auto', flex: 1, minHeight: '160px' }}>
                {(room.participants?.length || 0) === 0
                  ? <p style={{ fontSize: '0.8125rem', color: '#BDB0A0', fontWeight: 600 }}>없음</p>
                  : room.participants.map(p => (
                    <ParticipantRow
                      key={p.id} p={p} room={room} currentUserId={user?.id} isHost={isHost}
                      whisperTarget={whisperTarget}
                      menuOpen={openMenuFor === p.user_id}
                      onToggleMenu={(uid) => setOpenMenuFor(prev => prev === uid ? null : uid)}
                      onWhisper={(target) => { setWhisperTarget(whisperTarget?.id === target.user_id ? null : { id: target.user_id, name: target.name }); setOpenMenuFor(null); }}
                      onOpenProfile={(uid, name) => { onOpenUserLibrary?.(uid, name); setOpenMenuFor(null); }}
                      onKick={(target) => { setKickTarget({ user_id: target.user_id, name: target.name }); setOpenMenuFor(null); }}
                    />
                  ))}
              </div>
            </div>
          </div>

          {/* 하단 */}
          <div style={{ padding: '0.875rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', flexShrink: 0 }}>
            {isHost && !isEnded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.875rem', background: 'rgba(140,107,66,0.04)', border: '1px solid rgba(140,107,66,0.12)', borderRadius: '0.875rem' }}>
                  <p style={{ fontSize: '11px', fontWeight: 900, color: '#8C6B42', whiteSpace: 'nowrap' }}>방장 제어</p>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                    <button onClick={handleEndSession} style={ctrlBtnStyle('#9E8D7A')}>세션 종료</button>
                    <button onClick={handleToggleChat} style={ctrlBtnStyle(chatDisabled ? '#9E8D7A' : '#8C6B42')} title={chatDisabled ? '채팅 켜기' : '채팅 끄기'}>
                      {chatDisabled ? <MessageSquareDashed size={11} /> : <MessageSquare size={11} />}
                      {chatDisabled ? 'OFF' : 'ON'}
                    </button>
                    <button onClick={() => setConfirmDelete(true)} style={ctrlBtnStyle('#ef4444')}><Trash2 size={11} /></button>
                  </div>
                </div>

                {confirmDelete && (() => {
                  const otherCount = (room.participants?.length || 0) - 1;
                  return (
                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#dc2626' }}>방을 삭제하시겠습니까?</p>
                        {otherCount > 0 && (
                          <p style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>
                            현재 {otherCount}명이 참가 중입니다. 모든 참가자가 강제 퇴장됩니다.
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                        <button onClick={() => setConfirmDelete(false)} style={ctrlBtnStyle('#9E8D7A')}>취소</button>
                        <button onClick={handleDelete} style={{ ...ctrlBtnStyle('#ef4444'), background: 'rgba(239,68,68,0.12)', fontWeight: 900 }}>삭제 확인</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {user && !isEnded && isParticipant && myParticipant?.status !== 'ended' && (
              <button onClick={handleToggleMyStatus} disabled={isTogglingStatus}
                style={{ width: '100%', padding: '0.625rem', background: myParticipant?.status === 'paused' ? 'rgba(34,197,94,0.08)' : 'rgba(158,141,122,0.08)', border: `1px solid ${myParticipant?.status === 'paused' ? 'rgba(34,197,94,0.25)' : 'rgba(158,141,122,0.2)'}`, borderRadius: '0.875rem', fontSize: '0.8125rem', fontWeight: 800, color: myParticipant?.status === 'paused' ? '#16a34a' : '#7B6B55', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {isTogglingStatus ? <Loader2 size={14} className="animate-spin" /> : myParticipant?.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
                {myParticipant?.status === 'paused' ? '독서 다시 시작하기' : '일시정지 (자리 비움)'}
              </button>
            )}

            {user && !isEnded && !isHost && (
              <button onClick={handleLeave} style={{ width: '100%', padding: '0.625rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 800, color: '#dc2626', cursor: 'pointer' }}>
                모임에서 나가기
              </button>
            )}
          </div>

          {/* 모달 크기 조절 핸들 (우하단) */}
          <div
            onMouseDown={handleModalResize}
            title="드래그하여 크기 조절"
            style={{ position: 'absolute', bottom: 4, right: 4, width: '18px', height: '18px', cursor: 'nwse-resize', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '2px', padding: '2px', userSelect: 'none' }}
          >
            {[3, 2, 1].map(n => (
              <div key={n} style={{ display: 'flex', gap: '2px' }}>
                {Array.from({ length: n }).map((_, i) => (
                  <div key={i} style={{ width: '3px', height: '3px', borderRadius: '9999px', background: 'rgba(139,107,66,0.28)' }} />
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {kickTarget && (
        <div className="modal-backdrop" style={{ zIndex: 300 }} onClick={() => !isKicking && setKickTarget(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            onClick={e => e.stopPropagation()}
            className="modal-content relative my-auto"
            style={{ maxWidth: '360px', padding: '1.5rem' }}
          >
            <p style={{ fontSize: '1rem', fontWeight: 900, color: '#1C140E', marginBottom: '0.5rem' }}>참가자 추방</p>
            <p style={{ fontSize: '0.875rem', color: '#7B6B55', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              <strong style={{ color: '#dc2626' }}>{kickTarget.name}</strong>님을 이 모임에서 추방하시겠습니까?
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setKickTarget(null)} disabled={isKicking} style={{ flex: 1, padding: '0.625rem', background: 'rgba(139,107,66,0.06)', border: '1px solid rgba(139,107,66,0.15)', borderRadius: '0.875rem', fontSize: '0.8125rem', fontWeight: 800, color: '#9E8D7A', cursor: 'pointer' }}>취소</button>
              <button onClick={handleKickParticipant} disabled={isKicking} style={{ flex: 1, padding: '0.625rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.875rem', fontSize: '0.8125rem', fontWeight: 900, color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                {isKicking ? <Loader2 size={13} className="animate-spin" /> : '추방하기'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showOvertimeNotice && (
        <div className="modal-backdrop" style={{ zIndex: 300 }} onClick={() => setShowOvertimeNotice(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            onClick={e => e.stopPropagation()}
            className="modal-content relative my-auto"
            style={{ maxWidth: '380px', padding: '1.5rem' }}
          >
            <p style={{ fontSize: '1rem', fontWeight: 900, color: '#1C140E', marginBottom: '0.5rem' }}>⏰ 예정된 시간이 종료되었습니다</p>
            <p style={{ fontSize: '0.875rem', color: '#7B6B55', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              독서·토론 시간이 모두 끝났어요. 바로 닫히진 않으니 조금 더 읽거나 이야기를 나누셔도 되고(1시간 후 자동 종료, 필요하면 연장 가능), 준비가 되면 방장이 바로 종료해도 됩니다.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowOvertimeNotice(false)} style={{ flex: 1, padding: '0.625rem', background: 'rgba(139,107,66,0.06)', border: '1px solid rgba(139,107,66,0.15)', borderRadius: '0.875rem', fontSize: '0.8125rem', fontWeight: 800, color: '#9E8D7A', cursor: 'pointer' }}>확인</button>
              {isHost && (
                <button onClick={async () => { setShowOvertimeNotice(false); await handleEndSession(); }} style={{ flex: 1, padding: '0.625rem', background: 'rgba(196,148,86,0.12)', border: '1px solid rgba(196,148,86,0.3)', borderRadius: '0.875rem', fontSize: '0.8125rem', fontWeight: 900, color: '#8C6B42', cursor: 'pointer' }}>지금 종료하기</button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {showExtendNotice && (
        <div className="modal-backdrop" style={{ zIndex: 300 }} onClick={() => setShowExtendNotice(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            onClick={e => e.stopPropagation()}
            className="modal-content relative my-auto"
            style={{ maxWidth: '380px', padding: '1.5rem' }}
          >
            <p style={{ fontSize: '1rem', fontWeight: 900, color: '#1C140E', marginBottom: '0.5rem' }}>⏳ 곧 방이 자동으로 종료됩니다</p>
            <p style={{ fontSize: '0.875rem', color: '#7B6B55', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              10분 후 방이 자동으로 종료돼요. 아직 대화 중이시라면 1시간 더 연장할 수 있습니다.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowExtendNotice(false)} style={{ flex: 1, padding: '0.625rem', background: 'rgba(139,107,66,0.06)', border: '1px solid rgba(139,107,66,0.15)', borderRadius: '0.875rem', fontSize: '0.8125rem', fontWeight: 800, color: '#9E8D7A', cursor: 'pointer' }}>괜찮아요</button>
              <button onClick={handleExtendRoom} disabled={isExtending} style={{ flex: 1, padding: '0.625rem', background: 'rgba(196,148,86,0.12)', border: '1px solid rgba(196,148,86,0.3)', borderRadius: '0.875rem', fontSize: '0.8125rem', fontWeight: 900, color: '#8C6B42', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                {isExtending ? <Loader2 size={13} className="animate-spin" /> : '1시간 연장하기'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {aiChatOpen ? (
          <div style={{ position: 'fixed', bottom: '1.5rem', left: '1.5rem', zIndex: 250, width: '340px', maxWidth: '90vw', height: '480px', maxHeight: '70vh', background: '#FEFCF9', border: '1px solid rgba(139,107,66,0.2)', borderRadius: '1.25rem', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(139,107,66,0.1)', display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9999px', overflow: 'hidden', background: '#EDE8E2', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {myPersona.image ? <img src={myPersona.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : <Sparkles size={14} style={{ color: '#BDB0A0' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '12px', fontWeight: 900, color: '#1C140E' }}>{myPersona.name}</p>
                <p style={{ fontSize: '10px', color: '#9E8D7A', fontWeight: 600 }}>토론 준비 도우미 · 나에게만 보여요</p>
              </div>
              <button onClick={() => setAiChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E8D7A' }}><X size={15} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {aiChatMessages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', padding: '0.5rem 0.75rem', borderRadius: '0.875rem', fontSize: '0.8125rem', lineHeight: 1.55, background: m.role === 'user' ? 'linear-gradient(135deg,#8C6B42,#C49456)' : 'rgba(140,107,66,0.06)', color: m.role === 'user' ? 'white' : '#3D2D1E', border: m.role === 'user' ? 'none' : '1px solid rgba(139,107,66,0.12)' }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isAiChatSending && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', borderRadius: '0.875rem', background: 'rgba(140,107,66,0.06)', border: '1px solid rgba(139,107,66,0.12)', overflow: 'hidden' }}>
                    <span style={{ fontSize: '16px' }}>🤔</span>
                    <motion.span
                      style={{ fontSize: '16px', display: 'inline-block' }}
                      animate={{ x: [-6, 6, -6] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      ☁️
                    </motion.span>
                  </div>
                </div>
              )}
              <div ref={aiChatEndRef} />
            </div>
            <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(139,107,66,0.1)', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <input
                value={aiChatInput}
                onChange={e => setAiChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendAiChat()}
                placeholder="메시지를 입력하세요..."
                className="form-input"
                style={{ flex: 1, height: '2.25rem', fontSize: '0.8125rem', color: '#1C140E' }}
              />
              <button onClick={handleSendAiChat} disabled={!aiChatInput.trim() || isAiChatSending} style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'rgba(140,107,66,0.1)', border: '1px solid rgba(140,107,66,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8C6B42', flexShrink: 0 }}>
                <Send size={13} />
              </button>
            </div>
          </div>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => { setAiChatOpen(true); if (aiChatMessages.length === 0) setAiChatMessages([{ role: 'assistant', content: AI_CHAT_OPENING_LINE }]); }}
            title="AI와 토론 준비 대화하기"
            style={{ position: 'fixed', bottom: '1.5rem', left: '1.5rem', zIndex: 250, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.125rem', borderRadius: '9999px', background: 'linear-gradient(135deg,#8C6B42,#C49456)', border: 'none', boxShadow: '0 4px 16px rgba(140,107,66,0.35)', cursor: 'pointer', color: 'white' }}
          >
            <Sparkles size={18} />
            <span style={{ fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap' }}>AI와 토론 준비 대화하기</span>
          </motion.button>
      )}
    </>
  );
}

const ctrlBtnStyle = (color) => ({
  padding: '0.3rem 0.75rem', background: `${color}15`, border: `1px solid ${color}40`,
  borderRadius: '9999px', fontSize: '11px', fontWeight: 800, color, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '0.25rem',
});

const menuBtnStyle = {
  width: '100%', textAlign: 'left', padding: '0.5rem 0.625rem', background: 'none', border: 'none',
  cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#3D2D1E', borderRadius: '0.5rem',
  display: 'flex', alignItems: 'center', gap: '0.375rem',
};

function ParticipantRow({ p, room, currentUserId, isHost, whisperTarget, menuOpen, onToggleMenu, onWhisper, onOpenProfile, onKick }) {
  const isSelf = p.user_id === parseInt(currentUserId);
  const bookTitle = p.book_title || room.book_title;
  const bookImage = p.book_image || room.book_image;
  const isWhisperTarget = whisperTarget?.id === p.user_id;
  const roomPhase = computePhaseInfo(room).phase;
  // 토론 구간만 "토론 중"으로 표시한다 — 토론이 끝난 뒤(overtime) 계속 읽는 시간은 독서시간으로 집계되므로 "독서 중"으로 유지.
  const isDiscussing = roomPhase === 'discussion';
  const statusInfo =
    p.status === 'paused' ? { label: '일시정지', color: '#9E8D7A', icon: <Pause size={9} /> }
    : p.status === 'ended' ? { label: '종료', color: '#BDB0A0', icon: null }
    : isDiscussing ? { label: '토론 중', color: '#22c55e', icon: <MessageSquare size={9} /> }
    : { label: '독서 중', color: '#22c55e', icon: <BookOpen size={9} /> };

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => onToggleMenu(p.user_id)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.625rem', background: isWhisperTarget ? 'rgba(196,148,86,0.18)' : 'rgba(140,107,66,0.05)', border: `1px solid ${isWhisperTarget ? 'rgba(196,148,86,0.4)' : 'rgba(140,107,66,0.1)'}`, borderRadius: '0.625rem', cursor: 'pointer' }}
      >
        <div style={{ width: '18px', height: '25px', borderRadius: '3px', overflow: 'hidden', flexShrink: 0, background: '#EDE8E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {bookImage ? <img src={bookImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <BookOpen size={9} style={{ color: '#BDB0A0' }} />}
        </div>
        <div style={{ width: '22px', height: '22px', borderRadius: '9999px', background: 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', fontWeight: 900, flexShrink: 0, overflow: 'hidden' }}>
          {p.profile_image ? <img src={p.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.name || '?')[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#3D2D1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            {room.host_id === p.user_id && <span style={{ fontSize: '10px' }}>👑</span>}
          </div>
          {bookTitle && <div style={{ fontSize: '9px', color: '#9E8D7A', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookTitle}</div>}
        </div>
        <span style={{ fontSize: '9px', fontWeight: 800, color: statusInfo.color, display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          {statusInfo.icon}{statusInfo.label}
        </span>
      </div>

      {menuOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, marginTop: '0.25rem', background: '#FEFCF9', border: '1px solid rgba(139,107,66,0.2)', borderRadius: '0.75rem', padding: '0.25rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: '150px' }}
        >
          <button onClick={() => onOpenProfile(p.user_id, p.name)} style={menuBtnStyle}>프로필 보기</button>
          {!isSelf && (
            <button onClick={() => onWhisper(p)} style={menuBtnStyle}>
              {isWhisperTarget ? '귓속말 해제' : '귓속말 보내기'}
            </button>
          )}
          {isHost && !isSelf && (
            <button onClick={() => onKick(p)} style={{ ...menuBtnStyle, color: '#dc2626' }}>
              <UserX size={12} /> 추방하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
