import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Sparkles, Loader2, Bookmark, Plus, MessageCircle, Trash2, Timer, Quote, ChevronDown, ChevronUp } from 'lucide-react';
import { stripHtml } from '../../utils';
import { API_URL } from '../../api';

export default function BookModal({
  book, analysisResult, questions, isAnalyzing,
  bookImpression, setBookImpression,
  bookImpressionPublic, setBookImpressionPublic,
  currentBookPages, setCurrentBookPages,
  isSaving, isSavingImpression,
  timerBook, token,
  onClose, onRegister, onLoadAnalysis, onStartDiscussion, onSaveImpression, onDeleteBook, onStartTimer,
}) {
  const [highlights, setHighlights] = useState([]);
  const [hlText, setHlText] = useState('');
  const [hlPage, setHlPage] = useState('');
  const [hlSaving, setHlSaving] = useState(false);
  const [hlOpen, setHlOpen] = useState(false);

  useEffect(() => {
    if (book?.fromStack && book?.id && token) {
      fetch(`${API_URL}/api/highlights?read_book_id=${book.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : []).then(setHighlights).catch(() => {});
    } else {
      setHighlights([]);
    }
  }, [book?.id, book?.fromStack, token]);

  const handleSaveHighlight = async () => {
    if (!hlText.trim() || !token || !book?.id) return;
    setHlSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/highlights`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ read_book_id: book.id, text: hlText.trim(), page_num: parseInt(hlPage) || null }),
      });
      if (res.ok) {
        const newHl = await res.json();
        setHighlights(prev => [newHl, ...prev]);
        setHlText('');
        setHlPage('');
      }
    } finally { setHlSaving(false); }
  };

  const handleDeleteHighlight = async (hId) => {
    setHighlights(prev => prev.filter(h => h.id !== hId));
    await fetch(`${API_URL}/api/highlights/${hId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  };
  const thisTitle = stripHtml(book?.title || '');
  const isTimerRunningHere = timerBook?.title === thisTitle;
  return (
    <div className="modal-backdrop overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-content relative my-auto"
        style={{ boxShadow: '0 0 80px rgba(108, 92, 231,0.12), 0 40px 80px rgba(0,0,0,0.6)' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(108, 92, 231,0.09)', border: 'none', borderRadius: '9999px', cursor: 'pointer', color: '#8F87B8', transition: 'all 0.2s ease', zIndex: 10 }} className="hover:bg-red-500\/20 hover:text-red-400"><X size={16} /></button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.125rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(108, 92, 231,0.1)' }}>
            <div style={{ width: '3.5rem', flexShrink: 0 }}>
              <div style={{ aspectRatio: '2/3', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid rgba(108, 92, 231,0.15)' }}>
                {book.image ? (
                  <img src={book.image} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#E9E5F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={16} color="#6C5CE7" /></div>
                )}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.375rem' }}>
                <BookOpen size={11} style={{ color: '#6C5CE7' }} />
                <span style={{ fontSize: '9px', color: '#6C5CE7', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>책 소개</span>
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>{stripHtml(book.title)}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#8F87B8' }}>{book.author}</span>
                <span style={{ width: '3px', height: '3px', borderRadius: '9999px', background: 'rgba(108, 92, 231,0.3)', display: 'inline-block' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#8F87B8' }}>{book.publisher}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(108, 92, 231,0.04)', borderRadius: '0.875rem', border: '1px solid rgba(108, 92, 231,0.1)', minHeight: '4rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #6C5CE7, #A78BFA)', borderRadius: '9999px' }} />
                <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#5849C4', textTransform: 'uppercase', letterSpacing: '0.12em' }}>책 소개</h3>
              </div>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.7, color: '#6E67A0', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{analysisResult || '책 소개 정보가 없습니다.'}</p>
            </motion.div>
          </div>

          {!isAnalyzing && questions.thematic.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(108, 92, 231,0.04)', borderRadius: '0.875rem', border: '1px solid rgba(108, 92, 231,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #6C5CE7, #A78BFA)', borderRadius: '9999px' }} />
                  <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#5849C4', textTransform: 'uppercase', letterSpacing: '0.12em' }}>토론 질문</h3>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {questions.thematic.map((q, i) => (
                    <li key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                      <span style={{ flexShrink: 0, width: '1.25rem', height: '1.25rem', borderRadius: '9999px', background: 'rgba(108, 92, 231,0.15)', border: '1px solid rgba(108, 92, 231,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 900, color: '#6C5CE7', marginTop: '1px' }}>{i + 1}</span>
                      <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#3A3070', fontWeight: 500 }}>{q}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {questions.perspective_shift.length > 0 && (
                <div style={{ padding: '1rem', background: 'rgba(167, 139, 250,0.04)', borderRadius: '0.875rem', border: '1px solid rgba(167, 139, 250,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #A78BFA, #f59e0b)', borderRadius: '9999px' }} />
                    <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.12em' }}>관점 전환</h3>
                  </div>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {questions.perspective_shift.map((item, i) => (
                      <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '9px', fontWeight: 900, color: '#A78BFA', background: 'rgba(167, 139, 250,0.12)', border: '1px solid rgba(167, 139, 250,0.2)', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', width: 'fit-content', letterSpacing: '0.05em' }}>{item.perspective}</span>
                        <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#3A3070', fontWeight: 500 }}>{item.question}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          <div style={{ padding: '1rem', background: 'rgba(108, 92, 231,0.03)', borderRadius: '0.875rem', border: '1px solid rgba(108, 92, 231,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #6C5CE7, #A78BFA)', borderRadius: '9999px' }} />
                <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#5849C4', textTransform: 'uppercase', letterSpacing: '0.12em' }}>내 감상평 <span style={{ fontSize: '8px', color: '#C7C2E0', textTransform: 'none', letterSpacing: 0 }}>(선택)</span></h3>
              </div>
              <button onClick={() => setBookImpressionPublic(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '9999px', background: bookImpressionPublic ? 'rgba(108, 92, 231,0.1)' : 'rgba(100,100,100,0.06)', border: `1px solid ${bookImpressionPublic ? 'rgba(108, 92, 231,0.25)' : 'rgba(108, 92, 231,0.12)'}`, cursor: 'pointer', fontSize: '10px', fontWeight: 700, color: bookImpressionPublic ? '#6C5CE7' : '#8F87B8', transition: 'all 0.2s' }}>
                {bookImpressionPublic ? '🌐 공개' : '🔒 나만 보기'}
              </button>
            </div>
            <textarea
              value={bookImpression}
              onChange={e => setBookImpression(e.target.value)}
              placeholder="이 책을 읽고 느낀 점을 자유롭게 적어보세요..."
              rows={3}
              className="form-input"
              style={{ width: '100%', resize: 'vertical', fontSize: '0.8125rem', lineHeight: 1.6, color: '#241B45', minHeight: '72px', boxSizing: 'border-box' }}
            />
          </div>

          {/* 인상깊은 문장 — 서재에 등록된 책만 */}
          {book?.fromStack && token && (
            <div style={{ background: 'rgba(108, 92, 231,0.03)', borderRadius: '0.875rem', border: '1px solid rgba(108, 92, 231,0.1)', overflow: 'hidden' }}>
              <button
                onClick={() => setHlOpen(o => !o)}
                style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #6C5CE7, #A78BFA)', borderRadius: '9999px' }} />
                  <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#5849C4', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    인상깊은 문장 <span style={{ fontSize: '8px', color: '#C7C2E0', textTransform: 'none', letterSpacing: 0 }}>({highlights.length})</span>
                  </h3>
                </div>
                {hlOpen ? <ChevronUp size={13} style={{ color: '#8F87B8' }} /> : <ChevronDown size={13} style={{ color: '#8F87B8' }} />}
              </button>

              <AnimatePresence>
                {hlOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '0 1rem 1rem' }}>
                      {/* 입력 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.875rem' }}>
                        <textarea
                          value={hlText}
                          onChange={e => setHlText(e.target.value)}
                          placeholder="기억하고 싶은 문장을 입력하세요..."
                          rows={2}
                          className="form-input"
                          style={{ width: '100%', resize: 'none', fontSize: '0.8125rem', lineHeight: 1.6, color: '#241B45', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="number"
                            value={hlPage}
                            onChange={e => setHlPage(e.target.value)}
                            placeholder="p."
                            style={{ width: '64px', fontSize: '0.8125rem', fontWeight: 700, padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(108, 92, 231,0.3)', background: 'white', color: '#241B45', outline: 'none', textAlign: 'center' }}
                          />
                          <button
                            onClick={handleSaveHighlight}
                            disabled={!hlText.trim() || hlSaving}
                            style={{ flex: 1, padding: '6px 12px', background: 'rgba(108, 92, 231,0.1)', border: '1px solid rgba(108, 92, 231,0.25)', borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 800, color: '#6C5CE7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', opacity: !hlText.trim() || hlSaving ? 0.5 : 1 }}
                          >
                            {hlSaving ? <Loader2 size={13} className="animate-spin" /> : <Quote size={13} />}
                            저장
                          </button>
                        </div>
                      </div>

                      {/* 저장된 문장 목록 */}
                      {highlights.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {highlights.map(h => (
                            <div key={h.id} style={{ display: 'flex', gap: '0.625rem', padding: '0.625rem 0.875rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(108, 92, 231,0.1)', borderRadius: '0.625rem' }}>
                              <Quote size={12} style={{ color: '#A78BFA', flexShrink: 0, marginTop: '2px' }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#3A3070', fontWeight: 500, wordBreak: 'break-word' }}>{h.text}</p>
                                {h.page_num && <span style={{ fontSize: '10px', color: '#C7C2E0', fontWeight: 700 }}>p.{h.page_num}</span>}
                              </div>
                              <button
                                onClick={() => handleDeleteHighlight(h.id)}
                                style={{ width: '1.375rem', height: '1.375rem', borderRadius: '9999px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {highlights.length === 0 && (
                        <p style={{ fontSize: '0.75rem', color: '#C7C2E0', fontWeight: 600, textAlign: 'center', padding: '0.5rem 0' }}>저장된 문장이 없습니다.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {setCurrentBookPages && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(108, 92, 231,0.04)', borderRadius: '0.875rem', border: '1px solid rgba(108, 92, 231,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #6C5CE7, #A78BFA)', borderRadius: '9999px', flexShrink: 0 }} />
                <span style={{ fontSize: '9px', fontWeight: 900, color: '#5849C4', textTransform: 'uppercase', letterSpacing: '0.12em' }}>책 두께 (페이지 수)</span>
              </div>
              <input
                type="number"
                min="1"
                max="9999"
                value={currentBookPages}
                onChange={e => { const v = parseInt(e.target.value, 10); if (v > 0) setCurrentBookPages(v); }}
                onClick={e => e.stopPropagation()}
                style={{ width: '72px', fontSize: '0.8125rem', fontWeight: 700, padding: '4px 8px', borderRadius: '8px', border: '1px solid rgba(108, 92, 231,0.3)', background: 'white', color: '#241B45', outline: 'none', textAlign: 'center' }}
              />
              <span style={{ fontSize: '9px', color: '#8F87B8', fontWeight: 700 }}>p</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            {book?.fromStack ? (
              <>
                <button onClick={onSaveImpression} disabled={isSavingImpression} className="premium-button disabled:opacity-50" style={{ flex: 1, padding: '0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {isSavingImpression ? <Loader2 className="animate-spin" size={15} /> : <Bookmark size={15} />}
                  <span>감상평 저장</span>
                </button>
                {onDeleteBook && (
                  <button onClick={onDeleteBook} style={{ padding: '0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.875rem', color: '#ef4444', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>
                    <Trash2 size={14} />
                    <span className="sm:inline hidden">삭제</span>
                  </button>
                )}
              </>
            ) : (
              <button onClick={onRegister} disabled={isSaving} className="premium-button disabled:opacity-50" style={{ flex: 1, padding: '0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {isSaving ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
                <span>내 서재에 기록하기</span>
              </button>
            )}
            {questions.thematic.length > 0 ? (
              <button onClick={onStartDiscussion} style={{ flex: 1, padding: '0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(167, 139, 250,0.12)', border: '1px solid rgba(167, 139, 250,0.25)', borderRadius: '0.875rem', color: '#A78BFA', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <MessageCircle size={15} />
                <span>토론 시작하기</span>
              </button>
            ) : (
              <button onClick={onLoadAnalysis} disabled={isAnalyzing} style={{ flex: 1, padding: '0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(108, 92, 231,0.07)', border: '1px solid rgba(108, 92, 231,0.15)', borderRadius: '0.875rem', color: '#6C5CE7', fontWeight: 800, cursor: isAnalyzing ? 'wait' : 'pointer', transition: 'all 0.2s ease', opacity: isAnalyzing ? 0.7 : 1 }}>
                {isAnalyzing ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
                <span>{isAnalyzing ? 'AI 분석 중...' : 'AI 토론 질문 생성'}</span>
              </button>
            )}
          </div>

          {onStartTimer && (
            <button
              onClick={() => { onStartTimer({ title: thisTitle, author: book.author || '' }); onClose(); }}
              disabled={isTimerRunningHere}
              style={{
                width: '100%', padding: '0.7rem', fontSize: '0.8125rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                background: isTimerRunningHere ? 'rgba(108, 92, 231,0.05)' : 'rgba(108, 92, 231,0.06)',
                border: `1px solid ${isTimerRunningHere ? 'rgba(108, 92, 231,0.2)' : 'rgba(108, 92, 231,0.18)'}`,
                borderRadius: '0.875rem', color: isTimerRunningHere ? '#A78BFA' : '#6C5CE7',
                fontWeight: 800, cursor: isTimerRunningHere ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Timer size={14} />
              <span>{isTimerRunningHere ? '타이머 진행 중' : '읽기 시작 (시간 기록)'}</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
