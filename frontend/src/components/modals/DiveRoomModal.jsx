import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Waves, BookOpen, Users, Clock, Calendar, Lock, Loader2, Send, RefreshCw, Trash2, MessageSquare, MessageSquareOff, Pencil, Check } from 'lucide-react';
import { API_URL } from '../../api';

export default function DiveRoomModal({ room: initialRoom, user, onClose, onJoin, onLeave, onDelete, onStatusChange }) {
  const [room, setRoom] = useState(initialRoom);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [editingNotice, setEditingNotice] = useState(false);
  const [noticeInput, setNoticeInput] = useState('');
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const msgEndRef = useRef(null);

  const isHost = user && room.host_id === parseInt(user.id);
  const isParticipant = room.participants?.some(p => p.user_id === parseInt(user?.id));
  const isFull = (room.participant_count || 0) >= room.max_participants;
  const isEnded = room.status === 'ended';
  const chatDisabled = room.chat_enabled === false;
  const chatLocked = room.status !== 'discussion' || chatDisabled;
  const canSendMsg = isParticipant && !chatLocked;

  const fmtTime = (dt) => {
    const d = new Date(dt);
    const mm = d.getMonth() + 1; const dd = d.getDate();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${mi}`;
  };

  const statusMap = {
    scheduled: { label: '예정', color: '#9E8D7A', bg: 'rgba(158,141,122,0.08)', border: 'rgba(158,141,122,0.2)' },
    reading:   { label: '독서 중', color: '#C49456', bg: 'rgba(196,148,86,0.1)', border: 'rgba(196,148,86,0.3)' },
    discussion:{ label: '토론 중', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
    ended:     { label: '종료', color: '#BDB0A0', bg: 'rgba(189,176,160,0.08)', border: 'rgba(189,176,160,0.2)' },
  };
  const badge = statusMap[room.status] || statusMap.scheduled;

  const fetchRoom = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}`);
      if (res.ok) setRoom(await res.json());
    } catch {}
  };

  const fetchMessages = async () => {
    setIsLoadingMsgs(true);
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/messages`);
      if (res.ok) setMessages(await res.json());
    } catch {} finally { setIsLoadingMsgs(false); }
  };

  // 마운트 시 참가자 포함 방 상세 + 메시지 fetch
  useEffect(() => {
    fetchRoom();
    fetchMessages();
  }, []);

  // 새 메시지 오면 스크롤 하단
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = async () => {
    if (!user?.token || isJoining) return;
    setIsJoining(true);
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/join`, {
        method: 'POST', headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) { await fetchRoom(); onJoin?.(); }
    } finally { setIsJoining(false); }
  };

  const handleLeave = async () => {
    if (!user?.token) return;
    await fetch(`${API_URL}/api/dive/rooms/${room.id}/leave`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${user.token}` },
    });
    await fetchRoom();
    onLeave?.();
  };

  const handleSendMsg = async () => {
    if (!msgInput.trim() || !user?.token || isSending || chatLocked) return;
    setIsSending(true);
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msgInput.trim() }),
      });
      if (res.ok) { const msg = await res.json(); setMessages(prev => [...prev, msg]); setMsgInput(''); }
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

  const handleStatusChange = async (status) => {
    if (!user?.token) return;
    const res = await fetch(`${API_URL}/api/dive/rooms/${room.id}/status?status=${status}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${user.token}` },
    });
    if (res.ok) { await fetchRoom(); await fetchMessages(); onStatusChange?.(); }
  };

  const handleDelete = async () => {
    if (!user?.token) return;
    await fetch(`${API_URL}/api/dive/rooms/${room.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${user.token}` },
    });
    onDelete?.();
    onClose();
  };

  const chatBg = chatLocked ? 'rgba(120,100,80,0.04)' : 'rgba(140,107,66,0.02)';
  const chatBorder = chatLocked ? 'rgba(139,107,66,0.08)' : 'rgba(139,107,66,0.12)';

  return (
    <div className="modal-backdrop overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 32 }}
        onClick={e => e.stopPropagation()}
        className="modal-content relative my-auto"
        style={{ maxWidth: '760px', width: '95vw', padding: 0, overflow: 'hidden' }}
      >
        {/* 헤더 */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(139,107,66,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: '48px', minWidth: '48px', height: '68px', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', flexShrink: 0, background: 'rgba(140,107,66,0.08)' }}>
              {room.book_image
                ? <img src={room.book_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={18} style={{ color: '#8C6B42' }} /></div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <h2 style={{ fontWeight: 900, fontSize: '1rem', color: '#1C140E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{room.title}</h2>
                <span style={{ fontSize: '9px', fontWeight: 900, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, padding: '2px 8px', borderRadius: '9999px', flexShrink: 0 }}>{badge.label}</span>
              </div>
              {room.book_title && <p style={{ fontSize: '11px', color: '#8C6B42', fontWeight: 700, marginBottom: '0.2rem' }}>📚 {room.book_title}</p>}
              <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700 }}>방장: {room.host_name}</p>
            </div>
            <button onClick={onClose} style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A', flexShrink: 0 }}>
              <X size={14} />
            </button>
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

          {/* 공지 — 방장은 인라인 편집 가능 */}
          {isHost ? (
            <div style={{ marginTop: '0.625rem', padding: '0.5rem 0.875rem', background: 'rgba(196,148,86,0.06)', border: '1px solid rgba(196,148,86,0.2)', borderRadius: '0.75rem' }}>
              {editingNotice ? (
                <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-start' }}>
                  <textarea
                    value={noticeInput}
                    onChange={e => setNoticeInput(e.target.value)}
                    rows={2}
                    style={{ flex: 1, fontSize: '0.8125rem', color: '#1C140E', background: 'transparent', border: 'none', outline: 'none', resize: 'none', lineHeight: 1.6 }}
                    autoFocus
                  />
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

        {/* 본문 — 좌: 채팅 / 우: 참가자 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 0, borderBottom: '1px solid rgba(139,107,66,0.08)' }}>

          {/* 좌: 채팅 */}
          <div style={{ padding: '1rem 1rem 1rem 1.5rem', borderRight: '1px solid rgba(139,107,66,0.08)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                {chatLocked && <Lock size={11} style={{ color: '#BDB0A0' }} />}
                <p style={{ fontSize: '11px', fontWeight: 900, color: chatLocked ? '#BDB0A0' : '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {chatDisabled ? '채팅 비허용' : room.status === 'scheduled' ? '채팅 (토론 시작 후 활성화)' : room.status === 'reading' ? '채팅 (독서 종료 후 활성화)' : room.status === 'ended' ? '채팅 종료' : '토론 채팅'}
                </p>
              </div>
              <button onClick={fetchMessages} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '10px', color: '#BDB0A0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                <RefreshCw size={10} />
              </button>
            </div>

            <div style={{ height: '220px', overflowY: 'auto', border: `1px solid ${chatBorder}`, borderRadius: '0.875rem', padding: '0.75rem', background: chatBg, display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: chatLocked ? 0.65 : 1, transition: 'all 0.2s' }}>
              {isLoadingMsgs
                ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Loader2 className="animate-spin" size={18} style={{ color: '#8C6B42' }} /></div>
                : messages.length === 0
                  ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.375rem' }}>
                      {chatLocked && <Lock size={16} style={{ color: '#BDB0A0' }} />}
                      <p style={{ fontSize: '0.8125rem', color: '#BDB0A0', fontWeight: 600 }}>{chatDisabled ? '채팅이 비허용 상태입니다' : chatLocked ? '채팅이 잠겨있습니다' : '메시지가 없습니다'}</p>
                    </div>
                  : messages.map(m => (
                    <div key={m.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '9999px', background: m.is_ai ? 'linear-gradient(135deg,#C49456,#F59E0B)' : 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 900, flexShrink: 0 }}>
                        {m.is_ai ? 'AI' : (m.user_name || '?')[0]}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: m.is_ai ? '#C49456' : '#8C6B42', marginRight: '0.25rem' }}>{m.is_ai ? 'AI' : m.user_name}</span>
                        <p style={{ fontSize: '0.8125rem', color: '#3D2D1E', lineHeight: 1.5, wordBreak: 'break-word' }}>{m.content}</p>
                      </div>
                    </div>
                  ))}
              <div ref={msgEndRef} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="form-input"
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMsg()}
                placeholder={chatLocked ? '🔒 토론 시작 후 채팅 가능' : '메시지를 입력하세요...'}
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
          <div style={{ padding: '1rem 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ fontSize: '11px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              참가자 ({room.participants?.length || 0}명)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', overflowY: 'auto', maxHeight: '280px' }}>
              {(room.participants?.length || 0) === 0
                ? <p style={{ fontSize: '0.8125rem', color: '#BDB0A0', fontWeight: 600 }}>없음</p>
                : room.participants.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.625rem', background: 'rgba(140,107,66,0.05)', border: '1px solid rgba(140,107,66,0.1)', borderRadius: '0.625rem' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '9999px', background: 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', fontWeight: 900, flexShrink: 0 }}>
                      {(p.name || '?')[0]}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#3D2D1E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    {room.host_id === p.user_id && <span style={{ fontSize: '10px' }}>👑</span>}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* 하단 — 방장 제어 + 참가/나가기 */}
        <div style={{ padding: '0.875rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {isHost && !isEnded && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.875rem', background: 'rgba(140,107,66,0.04)', border: '1px solid rgba(140,107,66,0.12)', borderRadius: '0.875rem' }}>
              <p style={{ fontSize: '11px', fontWeight: 900, color: '#8C6B42', whiteSpace: 'nowrap' }}>방장 제어</p>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                {room.status === 'scheduled'  && <button onClick={() => handleStatusChange('reading')}    style={ctrlBtnStyle('#C49456')}>독서 시작</button>}
                {room.status === 'reading'    && <button onClick={() => handleStatusChange('discussion')} style={ctrlBtnStyle('#22c55e')}>토론으로 전환</button>}
                {(room.status === 'reading' || room.status === 'discussion') && <button onClick={() => handleStatusChange('ended')} style={ctrlBtnStyle('#9E8D7A')}>세션 종료</button>}
                <button onClick={handleToggleChat} style={ctrlBtnStyle(chatDisabled ? '#9E8D7A' : '#8C6B42')} title={chatDisabled ? '채팅 켜기' : '채팅 끄기'}>
                  {chatDisabled ? <MessageSquareOff size={11} /> : <MessageSquare size={11} />}
                  {chatDisabled ? 'OFF' : 'ON'}
                </button>
                <button onClick={handleDelete} style={ctrlBtnStyle('#ef4444')}><Trash2 size={11} /></button>
              </div>
            </div>
          )}

          {user && !isEnded && (
            isParticipant
              ? (!isHost && (
                <button onClick={handleLeave} style={{ width: '100%', padding: '0.625rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 800, color: '#dc2626', cursor: 'pointer' }}>
                  모임에서 나가기
                </button>
              ))
              : (
                <button onClick={handleJoin} disabled={isFull || isJoining} className="premium-button" style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: isFull ? 0.5 : 1 }}>
                  {isJoining ? <Loader2 className="animate-spin" size={16} /> : <Waves size={16} />}
                  {isFull ? '인원이 가득 찼습니다' : '모임 참가하기'}
                </button>
              )
          )}
        </div>
      </motion.div>
    </div>
  );
}

const ctrlBtnStyle = (color) => ({
  padding: '0.3rem 0.75rem', background: `${color}15`, border: `1px solid ${color}40`,
  borderRadius: '9999px', fontSize: '11px', fontWeight: 800, color, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '0.25rem',
});
