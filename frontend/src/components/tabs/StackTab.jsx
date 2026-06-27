import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Loader2, ChevronRight, X } from 'lucide-react';
import { stripHtml } from '../../utils';
import { hexColors } from '../../constants';

export default function StackTab({
  user, readBooks, viewMode, recommendations,
  isFetchingTendency, isFetchingRecs,
  onBookClick, onStackBookClick, onFetchTendency, onFetchRecommendations, onDeleteBook,
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {viewMode === 'tower' ? (
        <div style={{ width: '100%', maxWidth: '460px', height: '70vh', maxHeight: '640px', minHeight: '380px', backgroundColor: '#2C1A10', borderRadius: '2rem', border: '1px solid rgba(139,107,66,0.1)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 32px 64px -16px rgba(0,0,0,0.7)', marginBottom: '2.5rem' }}>
          <div style={{ width: '100%', flex: 1, overflowY: 'auto', display: 'block', position: 'relative' }}>
            <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', padding: '60px 36px 8px 36px' }}>
              {readBooks && readBooks.length > 0 ? (
                <AnimatePresence initial={false}>
                  {readBooks.map((book, idx) => {
                    const bookColor = hexColors[idx % 10];
                    const bookH = Math.max(52, (book.pages && book.pages > 0 ? book.pages : 280) / 5);
                    return (
                      <motion.div
                        key={book.id || book.title || idx}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        exit={{ scaleX: 0, opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        style={{ transformOrigin: 'left center' }}
                      >
                        <div
                          onClick={() => onStackBookClick(book)}
                          className="hover:scale-[1.04] hover:brightness-110 group"
                          style={{ width: '100%', height: `${bookH}px`, marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px 8px 8px 3px', backgroundColor: bookColor, backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.18) 2%, rgba(0,0,0,0.08) 4%, transparent 10%, transparent 85%, rgba(0,0,0,0.15) 100%)`, borderLeft: '5px solid rgba(0,0,0,0.35)', borderTop: '1px solid rgba(255,255,255,0.18)', borderBottom: '1px solid rgba(0,0,0,0.3)', boxShadow: '0 6px 10px -2px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', position: 'relative', zIndex: idx + 1, flexShrink: 0, overflow: 'hidden' }}
                        >
                          <div style={{ position: 'absolute', left: '8px', top: '15%', bottom: '15%', width: '2px', backgroundColor: 'rgba(255,255,255,0.08)', filter: 'blur(0.5px)' }} />
                          {book.image && (
                            <img src={book.image} alt="" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '90px', objectFit: 'cover', opacity: 0.6, borderRadius: '0 8px 8px 0', borderLeft: '1px solid rgba(0,0,0,0.4)', transition: 'opacity 0.3s' }} className="group-hover:opacity-85" />
                          )}
                          <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.02em', color: 'white', padding: '0 72px 0 2rem', userSelect: 'none', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', fontStyle: 'italic', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}>
                            {book.title.replace(/<\/?[^>]+(>|$)/g, "")}
                          </span>
                          {book.status === 'reading' && (
                            <div style={{ position: 'absolute', top: '50%', right: book.image ? '96px' : '12px', transform: 'translateY(-50%)', background: 'rgba(196,148,86,0.25)', border: '1px solid rgba(196,148,86,0.5)', borderRadius: '9999px', padding: '2px 8px', fontSize: '9px', fontWeight: 900, color: '#C49456', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                              읽는 중
                            </div>
                          )}
                          <div className="hidden group-hover:flex" style={{ position: 'absolute', top: '-58px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(139,107,66,0.3)', padding: '8px 14px', borderRadius: '12px', fontSize: '11px', fontWeight: 900, zIndex: 200, whiteSpace: 'nowrap', boxShadow: '0 12px 32px rgba(0,0,0,0.7)', alignItems: 'center', gap: '8px' }}>
                            <span style={{ backgroundColor: bookColor, width: '8px', height: '8px', borderRadius: '9999px', display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ color: 'white' }}>{book.author || '저자 미상'}</span>
                            <span style={{ color: 'rgba(196,148,86,0.8)', fontSize: '9px' }}>{book.pages || 250}p</span>
                            {book.status === 'reading' && <span style={{ color: '#C49456', fontSize: '9px' }}>· 읽는 중</span>}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              ) : (
                <div style={{ marginBottom: '8rem', textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', margin: '0 auto 1rem', borderRadius: '1.25rem', background: 'rgba(139,107,66,0.07)', border: '1px solid rgba(139,107,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={28} color="#7B6B55" />
                  </div>
                  <p style={{ fontWeight: 900, fontSize: '1rem', color: '#9E8D7A', marginBottom: '0.375rem' }}>당신만의 지식 타워를 세우세요</p>
                  <p style={{ fontSize: '0.8125rem', color: '#BDB0A0' }}>검색으로 책을 찾아 서재에 추가해보세요</p>
                </div>
              )}
            </div>
          </div>
          <div style={{ width: '100%', height: '22px', backgroundImage: 'linear-gradient(to bottom, #3d1a00, #1a0900)', borderRadius: '0 0 2rem 2rem', borderTop: '1px solid rgba(139,107,66,0.15)', boxShadow: '0 -4px 12px rgba(0,0,0,0.4)', position: 'relative', zIndex: 10 }}>
            <div style={{ position: 'absolute', top: '1px', left: 0, right: 0, height: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }} />
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {readBooks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1.5rem', background: 'rgba(139,107,66,0.04)', border: '1px solid rgba(139,107,66,0.1)' }}>
              <BookOpen size={36} style={{ margin: '0 auto 1rem', color: '#BDB0A0' }} />
              <p style={{ color: '#9E8D7A', fontWeight: 700 }}>아직 기록된 책이 없습니다.</p>
            </div>
          )}
          {/* 읽는 중 섹션 */}
          {readBooks.filter(b => b.status === 'reading').length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                <div style={{ width: '3px', height: '14px', borderRadius: '9999px', background: '#C49456' }} />
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#C49456', textTransform: 'uppercase', letterSpacing: '0.1em' }}>읽는 중</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#BDB0A0' }}>{readBooks.filter(b => b.status === 'reading').length}권</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {readBooks.filter(b => b.status === 'reading').map((book, idx) => (
                  <BookListItem key={book.id} book={book} idx={idx} onStackBookClick={onStackBookClick} onDeleteBook={onDeleteBook} />
                ))}
              </div>
            </div>
          )}
          {/* 완독 섹션 */}
          {readBooks.filter(b => b.status !== 'reading').length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                <div style={{ width: '3px', height: '14px', borderRadius: '9999px', background: '#8C6B42' }} />
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.1em' }}>완독</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#BDB0A0' }}>{readBooks.filter(b => b.status !== 'reading').length}권</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {readBooks.filter(b => b.status !== 'reading').map((book, idx) => (
                  <BookListItem key={book.id} book={book} idx={idx} onStackBookClick={onStackBookClick} onDeleteBook={onDeleteBook} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {user && readBooks.length > 0 && (
        <div style={{ width: '100%', maxWidth: '460px', marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onFetchTendency}
            disabled={isFetchingTendency}
            style={{ flex: 1, padding: '0.75rem', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.2)', borderRadius: '0.875rem', color: '#A07840', fontWeight: 800, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s ease' }}
          >
            {isFetchingTendency ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
            내 독서 성향 분석
          </button>
          <button
            onClick={onFetchRecommendations}
            disabled={isFetchingRecs}
            style={{ flex: 1, padding: '0.75rem', background: 'rgba(196,148,86,0.08)', border: '1px solid rgba(196,148,86,0.2)', borderRadius: '0.875rem', color: '#C49456', fontWeight: 800, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s ease' }}
          >
            {isFetchingRecs ? <Loader2 className="animate-spin" size={14} /> : <BookOpen size={14} />}
            추천 도서 보기
          </button>
        </div>
      )}

      {recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', marginTop: '2rem' }}>
          <div className="section-header" style={{ marginBottom: '1rem' }}>
            <div className="section-accent" />
            <h3 style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1C140E' }}>당신을 위한 추천 도서</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
            {recommendations.map((book, i) => (
              <div key={i} onClick={() => onBookClick(book)} className="book-list-item group" style={{ cursor: 'pointer' }}>
                {book.image ? (
                  <img src={book.image} style={{ width: '3rem', height: '4.25rem', objectFit: 'cover', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', flexShrink: 0 }} alt="" />
                ) : (
                  <div style={{ width: '3rem', height: '4.25rem', borderRadius: '0.5rem', background: 'rgba(140,107,66,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={18} style={{ color: '#8C6B42' }} /></div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 className="group-hover:text-amber-700 transition-colors" style={{ fontWeight: 900, fontSize: '0.875rem', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</h4>
                  <p style={{ fontSize: '0.75rem', color: '#9E8D7A', fontWeight: 700, marginBottom: '0.375rem' }}>{book.author}</p>
                  <p style={{ fontSize: '11px', color: '#8C6B42', lineHeight: 1.5 }}>{book.reason}</p>
                </div>
                <ChevronRight size={14} style={{ color: '#BDB0A0', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function BookListItem({ book, idx, onStackBookClick, onDeleteBook }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.3, ease: 'easeOut' }}
      className="book-list-item group"
      onClick={() => onStackBookClick(book)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ width: '3rem', minWidth: '3rem', height: '4.25rem', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', flexShrink: 0, background: '#EDE8E2' }}>
        {book.image ? (
          <img src={book.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${hexColors[idx % 10]},${hexColors[(idx+2)%10]})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 900 }}>{(book.title || '?')[0]}</span>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h4 className="group-hover:text-amber-700 transition-colors" style={{ fontWeight: 900, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripHtml(book.title)}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
            <span style={{ fontSize: '9px', color: '#8C6B42', fontWeight: 900, background: 'rgba(140,107,66,0.1)', border: '1px solid rgba(140,107,66,0.2)', padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.05em' }}>
              {new Date(book.read_at).toLocaleDateString('ko-KR')}
            </span>
            {onDeleteBook && (
              <button
                onClick={e => { e.stopPropagation(); onDeleteBook(book.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ width: '1.375rem', height: '1.375rem', borderRadius: '9999px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#9E8D7A', fontWeight: 700, marginBottom: '0.375rem' }}>{book.author}</p>
        {book.impression && (
          <p style={{ fontSize: '0.75rem', color: '#7B6B55', lineHeight: 1.5, marginBottom: '0.375rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            <span style={{ color: book.is_public ? '#8C6B42' : '#BDB0A0', fontWeight: 700, marginRight: '4px' }}>{book.is_public ? '🌐' : '🔒'}</span>
            {book.impression}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {book.pages > 0 && <span style={{ fontSize: '9px', color: '#9E8D7A', border: '1px solid rgba(139,107,66,0.12)', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(139,107,66,0.04)' }}>{book.pages}p</span>}
          {book.publisher && <span style={{ fontSize: '9px', color: '#9E8D7A', border: '1px solid rgba(139,107,66,0.12)', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(139,107,66,0.04)' }}>{book.publisher}</span>}
          {!book.impression && <span onClick={e => { e.stopPropagation(); onStackBookClick(book); }} style={{ fontSize: '9px', color: '#8C6B42', border: '1px solid rgba(140,107,66,0.2)', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(140,107,66,0.05)', cursor: 'pointer' }}>+ 감상평 쓰기</span>}
        </div>
      </div>
    </motion.div>
  );
}
