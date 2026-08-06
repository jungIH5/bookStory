import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play, Pause, Square, BookOpen, Search, Loader2, X } from 'lucide-react';
import { formatTimer, stripHtml } from '../../utils';
import { API_URL } from '../../api';

export default function TimerTab({ user, readBooks, timerBook, timerSeconds, timerRunning, onStart, onPause, onResume, onStop, widgetHidden, onToggleWidget }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleQueryChange = (val) => {
    setQuery(val);
    setSelectedBook(null);
    setShowDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_URL}/api/books/search?query=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSearchResults(data.items || []);
      } catch {} finally { setIsSearching(false); }
    }, 380);
  };

  const select = (book) => {
    setSelectedBook(book);
    setQuery(book.title);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setSelectedBook(null);
    setQuery('');
    setSearchResults([]);
  };

  const handleStart = () => {
    if (!selectedBook) return;
    onStart({ title: selectedBook.title, author: selectedBook.author || '', image: selectedBook.image || '' });
    setSelectedBook(null);
    setQuery('');
    setSearchResults([]);
  };

  // 서재 책 중 쿼리에 매칭되는 것 (검색어 있을 때만)
  const libraryMatches = query.trim()
    ? readBooks.filter(b => stripHtml(b.title).toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : [];

  // 드롭다운에 보여줄 서재 섹션: 검색어 없으면 전체 서재, 있으면 매칭된 것
  const librarySection = query.trim() ? libraryMatches : readBooks.slice(0, 8);
  const searchSection = searchResults.slice(0, 6);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.625rem', letterSpacing: '-0.03em' }}>
          <span className="cute-float" style={{ display: 'inline-block', fontSize: '1.5rem' }}>⏰</span>
          독서 타이머
        </h2>
        <p style={{ color: '#8F87B8', fontWeight: 700, fontSize: '0.875rem' }}>독서 시간을 기록하고 나만의 독서 습관을 만들어보세요.</p>
      </div>

      {timerBook ? (
        /* ── 타이머 진행 중 ── */
        <motion.div
          key="active"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            maxWidth: '440px', margin: '0 auto', position: 'relative',
            padding: '2rem', borderRadius: '2.5rem',
            background: 'rgba(36, 27, 69,0.96)', border: '2px solid rgba(108, 92, 231,0.35)',
            boxShadow: '6px 8px 0 rgba(108, 92, 231,0.2), 0 24px 60px rgba(0,0,0,0.5)',
          }}
        >
          <span className="cute-float sparkle-deco" style={{ top: '-4px', right: '18px', ['--tilt']: '10deg' }}>⏰</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{
              width: '64px', minWidth: '64px', height: '92px',
              borderRadius: '0.9rem', overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              background: 'rgba(108, 92, 231,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid rgba(108, 92, 231,0.25)',
            }}>
              {timerBook.image
                ? <img src={timerBook.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <BookOpen size={22} style={{ color: '#6C5CE7' }} />}
            </div>
            <div>
              <p style={{ fontSize: '9px', fontWeight: 900, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.375rem' }}>읽는 중</p>
              <p style={{ fontWeight: 900, fontSize: '1rem', color: 'white', lineHeight: 1.3, marginBottom: '0.25rem' }}>{timerBook.title}</p>
              {timerBook.author && <p style={{ fontSize: '12px', color: '#6E67A0', fontWeight: 700 }}>{timerBook.author}</p>}
              {timerBook.startedAt && <p style={{ fontSize: '10px', color: '#574C8C', fontWeight: 700, marginTop: '0.25rem' }}>{timerBook.startedAt} 시작</p>}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              fontFamily: 'monospace', fontSize: '3.75rem', fontWeight: 900,
              color: timerRunning ? '#A78BFA' : '#6E67A0',
              letterSpacing: '0.04em', lineHeight: 1,
              textShadow: timerRunning ? '0 0 40px rgba(167, 139, 250,0.35)' : 'none',
              transition: 'all 0.3s ease',
            }}>
              {formatTimer(timerSeconds)}
            </div>
            <p style={{ fontSize: '11px', color: '#574C8C', fontWeight: 700, marginTop: '0.5rem' }}>
              {timerRunning ? '독서 중...' : '일시 정지됨'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={timerRunning ? onPause : onResume}
              className="cute-pill-button"
              style={{
                flex: 1, padding: '0.75rem', fontWeight: 800, fontSize: '0.875rem',
                background: 'rgba(167, 139, 250,0.18)',
                color: '#A78BFA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              {timerRunning ? <Pause size={15} fill="#A78BFA" /> : <Play size={15} fill="#A78BFA" />}
              {timerRunning ? '일시정지' : '계속 읽기'}
            </button>
            <button
              onClick={onStop}
              className="cute-pill-button"
              style={{
                flex: 1, padding: '0.75rem', fontWeight: 800, fontSize: '0.875rem',
                background: 'rgba(239,68,68,0.12)',
                color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              <Square size={14} fill="#ef4444" />
              독서 종료
            </button>
          </div>

          {onToggleWidget && (
            <button
              onClick={onToggleWidget}
              style={{
                width: '100%', marginTop: '0.75rem', padding: '0.5rem', borderRadius: '0.75rem',
                fontWeight: 700, fontSize: '11px', background: 'transparent', border: '1px dashed rgba(108, 92, 231,0.3)',
                color: '#6E67A0', cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              {widgetHidden ? '떠있는 위젯 다시 보기' : '떠있는 위젯 숨김 (다른 탭에서 안 보임)'}
            </button>
          )}
        </motion.div>
      ) : (
        /* ── 타이머 시작 설정 ── */
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="blob-card" style={{ padding: '1.75rem', background: '#F7F5FF', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* 통합 검색 인풋 */}
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Search size={11} style={{ color: '#6C5CE7' }} />
                책 선택
              </label>
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    style={{ color: '#241B45', paddingRight: '2.5rem' }}
                    placeholder="제목 또는 저자 검색, 또는 클릭해서 서재에서 선택"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {isSearching ? (
                    <Loader2 size={14} className="animate-spin" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6C5CE7' }} />
                  ) : query ? (
                    <button onClick={clearSelection} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8F87B8', display: 'flex', alignItems: 'center' }}>
                      <X size={14} />
                    </button>
                  ) : null}
                </div>

                {/* 선택된 책 미리보기 */}
                {selectedBook && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: 'rgba(108, 92, 231,0.08)', border: '1px solid rgba(108, 92, 231,0.2)', borderRadius: '0.75rem' }}>
                    <div style={{ width: '36px', height: '50px', borderRadius: '4px', overflow: 'hidden', background: '#E9E5F7', flexShrink: 0 }}>
                      {selectedBook.image
                        ? <img src={selectedBook.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={14} style={{ color: '#6C5CE7' }} /></div>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: '0.875rem', color: '#241B45', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedBook.title}</p>
                      {selectedBook.author && <p style={{ fontSize: '11px', color: '#8F87B8', fontWeight: 700 }}>{selectedBook.author}</p>}
                    </div>
                  </div>
                )}

                {/* 드롭다운 */}
                <AnimatePresence>
                  {showDropdown && !selectedBook && (librarySection.length > 0 || searchSection.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      style={{
                        position: 'absolute', zIndex: 500, top: '100%', left: 0, right: 0, marginTop: '0.375rem',
                        background: '#FDFCFF', border: '1px solid rgba(108, 92, 231,0.2)',
                        borderRadius: '0.875rem', boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                        maxHeight: '300px', overflowY: 'auto',
                      }}
                    >
                      {/* 내 서재 섹션 */}
                      {librarySection.length > 0 && (
                        <>
                          <p style={{ fontSize: '9px', fontWeight: 900, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.625rem 1rem 0.25rem' }}>내 서재</p>
                          {librarySection.map(book => (
                            <div
                              key={book.id}
                              onClick={() => select({ title: stripHtml(book.title), author: book.author || '', image: book.image || '' })}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(108, 92, 231,0.06)' }}
                              className="hover:bg-amber-50"
                            >
                              <div style={{ width: '28px', height: '38px', borderRadius: '3px', overflow: 'hidden', background: '#E9E5F7', flexShrink: 0 }}>
                                {book.image ? <img src={book.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={10} style={{ color: '#6C5CE7' }} /></div>}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#241B45', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripHtml(book.title)}</p>
                                <p style={{ fontSize: '10px', color: '#8F87B8', fontWeight: 700 }}>{book.author}</p>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* 검색 결과 섹션 */}
                      {searchSection.length > 0 && (
                        <>
                          <p style={{ fontSize: '9px', fontWeight: 900, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.625rem 1rem 0.25rem' }}>검색 결과</p>
                          {searchSection.map((book, i) => (
                            <div
                              key={i}
                              onClick={() => select({ title: stripHtml(book.title), author: book.author || '', image: book.image || '' })}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(108, 92, 231,0.06)' }}
                              className="hover:bg-amber-50"
                            >
                              <div style={{ width: '28px', height: '38px', borderRadius: '3px', overflow: 'hidden', background: '#E9E5F7', flexShrink: 0 }}>
                                {book.image ? <img src={book.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={10} style={{ color: '#6C5CE7' }} /></div>}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#241B45', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripHtml(book.title)}</p>
                                <p style={{ fontSize: '10px', color: '#8F87B8', fontWeight: 700 }}>{book.author}</p>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={!selectedBook}
              className="premium-button disabled:opacity-40"
              style={{ width: '100%', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9375rem' }}
            >
              <Play size={16} fill="white" />
              읽기 시작
            </button>
          </div>

          {!user && (
            <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: '#8F87B8', fontWeight: 700, textAlign: 'center' }}>
              로그인 후 독서 시간이 기록됩니다.
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
