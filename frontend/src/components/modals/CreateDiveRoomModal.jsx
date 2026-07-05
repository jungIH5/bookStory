import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Waves, BookOpen, Search, Loader2, Calendar, Clock, Users, Lock, MessageSquare, MessageSquareOff } from 'lucide-react';
import { API_URL } from '../../api';

const TIME_OPTIONS = [30, 60, 90];
const fmtMin = m => m < 60 ? `${m}분` : m === 60 ? '1시간' : `1시간 ${m - 60}분`;

function localDatetimeDefault() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateDiveRoomModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    book_title: '',
    book_image: '',
    book_isbn: '',
    scheduled_at: localDatetimeDefault(),
    reading_minutes: 30,
    discussion_minutes: 30,
    max_participants: 8,
    late_join_cutoff_minutes: 10,
    notice: '',
    chat_enabled: true,
  });
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleBookSearch = async () => {
    if (!bookQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/books/search?query=${encodeURIComponent(bookQuery)}`);
      const data = await res.json();
      setBookResults(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch {} finally { setIsSearching(false); }
  };

  const selectBook = (book) => {
    setForm(f => ({ ...f, book_title: book.title?.replace(/<\/?[^>]+>/g, '') || '', book_image: book.image || '', book_isbn: book.isbn || '' }));
    setBookResults([]);
    setBookQuery('');
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.scheduled_at) return;
    setIsSaving(true);
    try {
      const scheduledIso = new Date(form.scheduled_at).toISOString();
      await onCreate({ ...form, scheduled_at: scheduledIso });
    } finally { setIsSaving(false); }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="modal-backdrop overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 32 }}
        onClick={e => e.stopPropagation()}
        className="modal-content relative my-auto"
        style={{ maxWidth: '500px', padding: '1.75rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Waves size={20} style={{ color: '#8C6B42' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 900, color: '#1C140E' }}>독서 모임 개설</h2>
          </div>
          <button onClick={onClose} style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 방 제목 */}
          <div>
            <label className="form-label">방 제목 *</label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="예: 사피엔스 1장 함께 읽기"
              style={{ color: '#1C140E' }}
            />
          </div>

          {/* 책 선택 */}
          <div>
            <label className="form-label">함께 읽을 책 (선택)</label>
            {form.book_title ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: 'rgba(140,107,66,0.06)', border: '1px solid rgba(140,107,66,0.2)', borderRadius: '0.875rem' }}>
                {form.book_image && <img src={form.book_image} alt="" style={{ width: '32px', height: '46px', objectFit: 'cover', borderRadius: '4px' }} />}
                <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 700, color: '#1C140E' }}>{form.book_title}</span>
                <button onClick={() => set('book_title', '')} style={{ width: '1.5rem', height: '1.5rem', borderRadius: '9999px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}>
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={14} />
                    <input
                      className="form-input"
                      value={bookQuery}
                      onChange={e => setBookQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleBookSearch()}
                      placeholder="책 제목으로 검색"
                      style={{ paddingLeft: '2.5rem', color: '#1C140E' }}
                    />
                  </div>
                  <button onClick={handleBookSearch} disabled={isSearching} style={{ padding: '0 1rem', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.2)', borderRadius: '0.875rem', fontSize: '0.8125rem', fontWeight: 800, color: '#8C6B42', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {isSearching ? <Loader2 size={14} className="animate-spin" /> : '검색'}
                  </button>
                </div>
                {bookResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '0.375rem', background: '#FEFCF9', border: '1px solid rgba(139,107,66,0.2)', borderRadius: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                    {bookResults.map((b, i) => (
                      <div key={i} onClick={() => selectBook(b)} style={{ display: 'flex', gap: '0.625rem', padding: '0.625rem 0.875rem', cursor: 'pointer', borderBottom: '1px solid rgba(139,107,66,0.06)', transition: 'background 0.15s' }} className="hover:bg-amber-50\/30">
                        {b.image && <img src={b.image} alt="" style={{ width: '28px', height: '40px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }} />}
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1C140E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title?.replace(/<\/?[^>]+>/g, '')}</p>
                          <p style={{ fontSize: '10px', color: '#9E8D7A', fontWeight: 600 }}>{b.author}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 시작 일시 */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Calendar size={12} />시작 일시 *</label>
            <input
              type="datetime-local"
              className="form-input"
              value={form.scheduled_at}
              onChange={e => set('scheduled_at', e.target.value)}
              style={{ color: '#1C140E' }}
            />
          </div>

          {/* 독서 시간 + 토론 시간 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            {[
              { label: '독서 시간', key: 'reading_minutes' },
              { label: '토론 시간', key: 'discussion_minutes' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Clock size={12} />{label}</label>
                <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem' }}>
                  {TIME_OPTIONS.map(m => (
                    <button key={m} onClick={() => set(key, m)} style={{ flex: 1, padding: '0.4rem 0', borderRadius: '0.625rem', fontSize: '11px', fontWeight: 800, cursor: 'pointer', background: form[key] === m ? 'rgba(140,107,66,0.15)' : 'transparent', border: `1px solid ${form[key] === m ? 'rgba(140,107,66,0.35)' : 'rgba(139,107,66,0.15)'}`, color: form[key] === m ? '#8C6B42' : '#9E8D7A', transition: 'all 0.15s', textAlign: 'center' }}>
                      {fmtMin(m)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <input
                    type="number" min="1" max="300"
                    value={form[key]}
                    onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) set(key, v); }}
                    style={{ flex: 1, padding: '0.35rem 0.5rem', borderRadius: '0.625rem', border: '1px solid rgba(139,107,66,0.2)', background: 'rgba(140,107,66,0.04)', fontSize: '11px', fontWeight: 800, color: '#1C140E', outline: 'none', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700 }}>분</span>
                </div>
              </div>
            ))}
          </div>

          {/* 최대 인원 + 입장 마감 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Users size={12} />최대 인원</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="range" min="2" max="20" value={form.max_participants}
                  onChange={e => set('max_participants', parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: '#8C6B42' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 900, color: '#1C140E', minWidth: '32px', textAlign: 'center' }}>{form.max_participants}명</span>
              </div>
            </div>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Lock size={12} />신규 입장 마감</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number" min="0" max="120"
                  value={form.late_join_cutoff_minutes}
                  onChange={e => { const v = parseInt(e.target.value); set('late_join_cutoff_minutes', isNaN(v) || v < 0 ? 0 : v); }}
                  className="form-input"
                  style={{ color: '#1C140E', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.8125rem', color: '#9E8D7A', fontWeight: 700, whiteSpace: 'nowrap' }}>분 전</span>
              </div>
              <p style={{ fontSize: '10px', color: '#BDB0A0', fontWeight: 600, marginTop: '0.25rem' }}>0 = 제한 없음</p>
            </div>
          </div>

          {/* 채팅 허용 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(140,107,66,0.04)', border: '1px solid rgba(140,107,66,0.12)', borderRadius: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {form.chat_enabled ? <MessageSquare size={14} style={{ color: '#8C6B42' }} /> : <MessageSquareOff size={14} style={{ color: '#BDB0A0' }} />}
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 800, color: form.chat_enabled ? '#1C140E' : '#9E8D7A' }}>토론 채팅</p>
                <p style={{ fontSize: '10px', color: '#BDB0A0', fontWeight: 600 }}>토론 단계에서 참가자간 채팅 허용 여부</p>
              </div>
            </div>
            <button
              onClick={() => set('chat_enabled', !form.chat_enabled)}
              style={{ padding: '0.35rem 1rem', borderRadius: '9999px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', background: form.chat_enabled ? 'rgba(140,107,66,0.12)' : 'rgba(100,100,100,0.07)', border: `1px solid ${form.chat_enabled ? 'rgba(140,107,66,0.3)' : 'rgba(139,107,66,0.12)'}`, color: form.chat_enabled ? '#8C6B42' : '#9E8D7A', flexShrink: 0 }}
            >
              {form.chat_enabled ? '허용' : '비허용'}
            </button>
          </div>

          {/* 공지 */}
          <div>
            <label className="form-label">공지사항 (선택)</label>
            <textarea
              className="form-input"
              value={form.notice}
              onChange={e => set('notice', e.target.value)}
              placeholder="참가자에게 전달할 내용을 입력하세요"
              rows={2}
              style={{ width: '100%', resize: 'none', color: '#1C140E', boxSizing: 'border-box' }}
            />
          </div>

          {/* 하단 버튼 */}
          <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.5rem' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '0.875rem', background: 'rgba(139,107,66,0.06)', border: '1px solid rgba(139,107,66,0.15)', borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 800, color: '#9E8D7A', cursor: 'pointer' }}>
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.title.trim() || isSaving}
              className="premium-button"
              style={{ flex: 2, padding: '0.875rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: !form.title.trim() || isSaving ? 0.6 : 1 }}
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Waves size={16} />}
              방 개설하기
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
