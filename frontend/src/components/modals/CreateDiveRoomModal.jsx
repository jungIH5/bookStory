import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Waves, Search, Loader2, Calendar, Clock, Users, Lock, MessageSquare, MessageSquareDashed, Camera } from 'lucide-react';
import { API_URL } from '../../api';

const TIME_OPTIONS = [30, 60, 90];
const ALBUM_LIMIT = 5;
const fmtMin = m => m < 60 ? `${m}분` : m === 60 ? '1시간' : `1시간 ${m - 60}분`;

function localDatetimeDefault() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = e => resolve(e.target.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function CreateDiveRoomModal({ user, onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    book_title: '',
    book_image: '',
    book_isbn: '',
    room_image: '',
    scheduled_at: localDatetimeDefault(),
    reading_minutes: 30,
    discussion_minutes: 30,
    max_participants: 8,
    late_join_cutoff_minutes: 10,
    notice: '',
    chat_enabled: true,
    host_book_title: '',
    host_book_image: '',
    host_book_isbn: '',
  });
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hostBookQuery, setHostBookQuery] = useState('');
  const [hostBookResults, setHostBookResults] = useState([]);
  const [isSearchingHostBook, setIsSearchingHostBook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [albumImages, setAlbumImages] = useState([]);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const handleBookSearch = async () => {
    if (!bookQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/books/search?query=${encodeURIComponent(bookQuery)}`);
      const data = await res.json();
      setBookResults((data.items || []).slice(0, 5));
    } catch {} finally { setIsSearching(false); }
  };

  const selectBook = (book) => {
    setForm(f => ({ ...f, book_title: book.title?.replace(/<\/?[^>]+>/g, '') || '', book_image: book.image || '', book_isbn: book.isbn || '' }));
    setBookResults([]);
    setBookQuery('');
  };

  const handleHostBookSearch = async () => {
    if (!hostBookQuery.trim()) return;
    setIsSearchingHostBook(true);
    try {
      const res = await fetch(`${API_URL}/api/books/search?query=${encodeURIComponent(hostBookQuery)}`);
      const data = await res.json();
      setHostBookResults((data.items || []).slice(0, 5));
    } catch {} finally { setIsSearchingHostBook(false); }
  };

  const selectHostBook = (book) => {
    setForm(f => ({ ...f, host_book_title: book.title?.replace(/<\/?[^>]+>/g, '') || '', host_book_image: book.image || '', host_book_isbn: book.isbn || '' }));
    setHostBookResults([]);
    setHostBookQuery('');
  };

  const needsHostBook = !form.book_title;
  const canSubmit = form.title.trim() && form.scheduled_at && (!needsHostBook || form.host_book_title);

  const handleSubmit = async () => {
    if (!canSubmit) { setAttemptedSubmit(true); return; }
    setIsSaving(true);
    try {
      const scheduledIso = new Date(form.scheduled_at).toISOString();
      await onCreate({ ...form, scheduled_at: scheduledIso });
    } finally { setIsSaving(false); }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const fetchAlbum = async () => {
    if (!user?.id) return;
    setIsLoadingAlbum(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}/album`);
      if (res.ok) setAlbumImages(await res.json());
    } catch {} finally { setIsLoadingAlbum(false); }
  };

  const toggleImagePicker = () => {
    const next = !showImagePicker;
    if (next && albumImages.length === 0) fetchAlbum();
    setShowImagePicker(next);
  };

  const handlePickImage = (imageData) => {
    setShowImagePicker(false);
    set('room_image', imageData || '');
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
        handlePickImage(newImg.image_data);
      }
    } finally { setIsUploadingImage(false); }
  };

  const handleDeleteAlbumImage = async (imageId) => {
    if (!user?.token) return;
    await fetch(`${API_URL}/api/users/${user.id}/album/${imageId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${user.token}` },
    });
    const deleted = albumImages.find(img => img.id === imageId);
    setAlbumImages(prev => prev.filter(img => img.id !== imageId));
    if (deleted && form.room_image === deleted.image_data) set('room_image', '');
  };

  const displayImage = form.room_image || form.book_image;

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
            <span className="cute-float" style={{ fontSize: '1.375rem', display: 'inline-block' }}>🌊</span>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 900, color: '#241B45' }}>독서 모임 개설</h2>
          </div>
          <button onClick={onClose} style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(108, 92, 231,0.08)', border: '1px solid rgba(108, 92, 231,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8F87B8' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* 방 이미지 + 제목 */}
          <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
            {/* 이미지 썸네일 */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                onClick={toggleImagePicker}
                style={{ width: '48px', height: '68px', borderRadius: '0.9rem', overflow: 'hidden', boxShadow: '2px 3px 0 rgba(108, 92, 231,0.2)', border: '2px solid rgba(108, 92, 231,0.18)', background: 'rgba(108, 92, 231,0.08)', cursor: 'pointer', position: 'relative' }}
              >
                {displayImage
                  ? <img src={displayImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#6C5CE7,#A78BFA)', color: 'white', fontSize: '20px', fontWeight: 900 }}>
                      {(user?.name || '?')[0]}
                    </div>}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20px', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={10} style={{ color: 'white' }} />
                </div>
              </div>

              {/* 앨범 픽커 */}
              {showImagePicker && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{ position: 'absolute', top: '100%', left: 0, zIndex: 300, marginTop: '0.375rem', background: '#FDFCFF', border: '1px solid rgba(108, 92, 231,0.2)', borderRadius: '0.875rem', padding: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', width: '220px' }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 900, color: '#6C5CE7', marginBottom: '0.5rem' }}>
                    앨범 ({albumImages.length}/{ALBUM_LIMIT})
                  </div>
                  {isLoadingAlbum
                    ? <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}><Loader2 size={16} className="animate-spin" style={{ color: '#6C5CE7' }} /></div>
                    : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.375rem', marginBottom: '0.5rem' }}>
                        {/* 기본 아바타 */}
                        <div
                          onClick={() => handlePickImage(null)}
                          title="기본 (아바타)"
                          style={{ aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', background: 'linear-gradient(135deg,#6C5CE7,#A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: !form.room_image ? '2px solid #6C5CE7' : '2px solid transparent' }}
                        >
                          <span style={{ color: 'white', fontWeight: 900, fontSize: '14px' }}>{(user?.name || '?')[0]}</span>
                        </div>
                        {/* 선택된 책 표지 */}
                        {form.book_image && (
                          <div
                            onClick={() => handlePickImage(form.book_image)}
                            title="책 표지"
                            style={{ aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: form.room_image === form.book_image ? '2px solid #6C5CE7' : '2px solid transparent' }}
                          >
                            <img src={form.book_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        {/* 앨범 이미지 */}
                        {albumImages.map(img => (
                          <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: form.room_image === img.image_data ? '2px solid #6C5CE7' : '2px solid transparent' }}
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
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', padding: '0.375rem 0.625rem', background: 'rgba(108, 92, 231,0.06)', border: '1px dashed rgba(108, 92, 231,0.3)', borderRadius: '0.625rem', fontSize: '11px', fontWeight: 700, color: '#6C5CE7' }}>
                      {isUploadingImage ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                      새 이미지 추가
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={isUploadingImage} />
                    </label>
                  ) : (
                    <p style={{ fontSize: '10px', color: '#C7C2E0', fontWeight: 600, lineHeight: 1.5 }}>
                      앨범이 가득 찼습니다 (최대 {ALBUM_LIMIT}장)<br />이후 확장 가능 예정
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 방 제목 */}
            <div style={{ flex: 1 }}>
              <label className="form-label">방 제목 *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="예: 사피엔스 1장 함께 읽기"
                style={{ color: '#241B45', ...(attemptedSubmit && !form.title.trim() ? { borderColor: '#ef4444' } : {}) }}
              />
              {attemptedSubmit && !form.title.trim() && (
                <p style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, marginTop: '0.25rem' }}>방 제목을 입력해주세요.</p>
              )}
            </div>
          </div>

          {/* 책 선택 */}
          <div>
            <label className="form-label">함께 읽을 책 (선택)</label>
            {form.book_title ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: 'rgba(108, 92, 231,0.06)', border: '1px solid rgba(108, 92, 231,0.2)', borderRadius: '0.875rem' }}>
                {form.book_image && <img src={form.book_image} alt="" style={{ width: '32px', height: '46px', objectFit: 'cover', borderRadius: '4px' }} />}
                <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 700, color: '#241B45' }}>{form.book_title}</span>
                <button onClick={() => set('book_title', '')} style={{ width: '1.5rem', height: '1.5rem', borderRadius: '9999px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}>
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#C7C2E0' }} size={14} />
                    <input
                      className="form-input"
                      value={bookQuery}
                      onChange={e => setBookQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleBookSearch()}
                      placeholder="책 제목으로 검색"
                      style={{ paddingLeft: '2.5rem', color: '#241B45' }}
                    />
                  </div>
                  <button onClick={handleBookSearch} disabled={isSearching} style={{ padding: '0 1rem', background: 'rgba(108, 92, 231,0.08)', border: '1px solid rgba(108, 92, 231,0.2)', borderRadius: '0.875rem', fontSize: '0.8125rem', fontWeight: 800, color: '#6C5CE7', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {isSearching ? <Loader2 size={14} className="animate-spin" /> : '검색'}
                  </button>
                </div>
                {bookResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '0.375rem', background: '#FDFCFF', border: '1px solid rgba(108, 92, 231,0.2)', borderRadius: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                    {bookResults.map((b, i) => (
                      <div key={i} onClick={() => selectBook(b)} style={{ display: 'flex', gap: '0.625rem', padding: '0.625rem 0.875rem', cursor: 'pointer', borderBottom: '1px solid rgba(108, 92, 231,0.06)', transition: 'background 0.15s' }} className="hover:bg-amber-50\/30">
                        {b.image && <img src={b.image} alt="" style={{ width: '28px', height: '40px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }} />}
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#241B45', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title?.replace(/<\/?[^>]+>/g, '')}</p>
                          <p style={{ fontSize: '10px', color: '#8F87B8', fontWeight: 600 }}>{b.author}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 방장 본인이 읽을 책 — 지정 도서가 없는(자유도서) 모임일 때만 필요 */}
          {needsHostBook && (
            <div>
              <label className="form-label">내가 읽을 책 *</label>
              <p style={{ fontSize: '10px', color: '#C7C2E0', fontWeight: 600, marginBottom: '0.375rem' }}>
                지정 도서가 없는 모임이라, 방장도 읽으실 책을 선택해야 참가 기록이 남습니다.
              </p>
              {attemptedSubmit && !form.host_book_title && (
                <p style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, marginBottom: '0.375rem' }}>읽으실 책을 선택해주세요.</p>
              )}
              {form.host_book_title ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: 'rgba(108, 92, 231,0.06)', border: '1px solid rgba(108, 92, 231,0.2)', borderRadius: '0.875rem' }}>
                  {form.host_book_image && <img src={form.host_book_image} alt="" style={{ width: '32px', height: '46px', objectFit: 'cover', borderRadius: '4px' }} />}
                  <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 700, color: '#241B45' }}>{form.host_book_title}</span>
                  <button onClick={() => set('host_book_title', '')} style={{ width: '1.5rem', height: '1.5rem', borderRadius: '9999px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}>
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#C7C2E0' }} size={14} />
                      <input
                        className="form-input"
                        value={hostBookQuery}
                        onChange={e => setHostBookQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleHostBookSearch()}
                        placeholder="책 제목으로 검색"
                        style={{ paddingLeft: '2.5rem', color: '#241B45' }}
                      />
                    </div>
                    <button onClick={handleHostBookSearch} disabled={isSearchingHostBook} style={{ padding: '0 1rem', background: 'rgba(108, 92, 231,0.08)', border: '1px solid rgba(108, 92, 231,0.2)', borderRadius: '0.875rem', fontSize: '0.8125rem', fontWeight: 800, color: '#6C5CE7', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {isSearchingHostBook ? <Loader2 size={14} className="animate-spin" /> : '검색'}
                    </button>
                  </div>
                  {hostBookResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '0.375rem', background: '#FDFCFF', border: '1px solid rgba(108, 92, 231,0.2)', borderRadius: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                      {hostBookResults.map((b, i) => (
                        <div key={i} onClick={() => selectHostBook(b)} style={{ display: 'flex', gap: '0.625rem', padding: '0.625rem 0.875rem', cursor: 'pointer', borderBottom: '1px solid rgba(108, 92, 231,0.06)' }}>
                          {b.image && <img src={b.image} alt="" style={{ width: '28px', height: '40px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }} />}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#241B45', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title?.replace(/<\/?[^>]+>/g, '')}</p>
                            <p style={{ fontSize: '10px', color: '#8F87B8', fontWeight: 600 }}>{b.author}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 시작 일시 */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Calendar size={12} />시작 일시 *</label>
            <input
              type="datetime-local"
              className="form-input"
              value={form.scheduled_at}
              onChange={e => set('scheduled_at', e.target.value)}
              style={{ color: '#241B45' }}
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
                    <button key={m} onClick={() => set(key, m)} style={{ flex: 1, padding: '0.4rem 0', borderRadius: '0.625rem', fontSize: '11px', fontWeight: 800, cursor: 'pointer', background: form[key] === m ? 'rgba(108, 92, 231,0.15)' : 'transparent', border: `1px solid ${form[key] === m ? 'rgba(108, 92, 231,0.35)' : 'rgba(108, 92, 231,0.15)'}`, color: form[key] === m ? '#6C5CE7' : '#8F87B8', transition: 'all 0.15s', textAlign: 'center' }}>
                      {fmtMin(m)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <input
                    type="number" min="1" max="300"
                    value={form[key]}
                    onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) set(key, v); }}
                    style={{ flex: 1, padding: '0.35rem 0.5rem', borderRadius: '0.625rem', border: '1px solid rgba(108, 92, 231,0.2)', background: 'rgba(108, 92, 231,0.04)', fontSize: '11px', fontWeight: 800, color: '#241B45', outline: 'none', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '11px', color: '#8F87B8', fontWeight: 700 }}>분</span>
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
                  style={{ flex: 1, accentColor: '#6C5CE7' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 900, color: '#241B45', minWidth: '32px', textAlign: 'center' }}>{form.max_participants}명</span>
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
                  style={{ color: '#241B45', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.8125rem', color: '#8F87B8', fontWeight: 700, whiteSpace: 'nowrap' }}>분 전</span>
              </div>
              <p style={{ fontSize: '10px', color: '#C7C2E0', fontWeight: 600, marginTop: '0.25rem' }}>0 = 제한 없음</p>
            </div>
          </div>

          {/* 채팅 허용 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(108, 92, 231,0.04)', border: '1px solid rgba(108, 92, 231,0.12)', borderRadius: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {form.chat_enabled ? <MessageSquare size={14} style={{ color: '#6C5CE7' }} /> : <MessageSquareDashed size={14} style={{ color: '#C7C2E0' }} />}
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 800, color: form.chat_enabled ? '#241B45' : '#8F87B8' }}>독서 중 채팅</p>
                <p style={{ fontSize: '10px', color: '#C7C2E0', fontWeight: 600 }}>독서 시간 중 채팅 허용 여부 (토론 중엔 항상 열림)</p>
              </div>
            </div>
            <button
              onClick={() => set('chat_enabled', !form.chat_enabled)}
              style={{ padding: '0.35rem 1rem', borderRadius: '9999px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', background: form.chat_enabled ? 'rgba(108, 92, 231,0.12)' : 'rgba(100,100,100,0.07)', border: `1px solid ${form.chat_enabled ? 'rgba(108, 92, 231,0.3)' : 'rgba(108, 92, 231,0.12)'}`, color: form.chat_enabled ? '#6C5CE7' : '#8F87B8', flexShrink: 0 }}
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
              style={{ width: '100%', resize: 'none', color: '#241B45', boxSizing: 'border-box' }}
            />
          </div>

          {attemptedSubmit && !canSubmit && (
            <p style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>
              필수 항목({!form.title.trim() ? '방 제목' : '읽으실 책'})을 확인해주세요.
            </p>
          )}

          {/* 하단 버튼 */}
          <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.5rem' }}>
            <button onClick={onClose} className="cute-pill-button" style={{ flex: 1, padding: '0.875rem', background: 'rgba(108, 92, 231,0.06)', fontSize: '0.875rem', fontWeight: 800, color: '#8F87B8', cursor: 'pointer' }}>
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSaving}
              className="premium-button"
              style={{ flex: 2, padding: '0.875rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: !canSubmit || isSaving ? 0.6 : 1 }}
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
