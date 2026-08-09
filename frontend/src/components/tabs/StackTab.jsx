import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Loader2, ChevronRight, X, Sprout } from 'lucide-react';
import { stripHtml } from '../../utils';
import { hexColors } from '../../constants';

// idx 기반 결정적 의사난수 — 매 렌더마다 가지 길이/기울기가 바뀌지 않도록 고정된 시드로 뽑는다.
const prand = (seed) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export default function StackTab({
  user, readBooks, viewMode, recommendations,
  isFetchingTendency, isFetchingRecs,
  onBookClick, onStackBookClick, onFetchTendency, onFetchRecommendations, onDeleteBook,
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {viewMode === 'tower' ? (
        <div style={{ width: '100%', maxWidth: '460px', height: '70vh', maxHeight: '640px', minHeight: '380px', backgroundColor: '#241B45', borderRadius: '3rem 3rem 2.5rem 2.5rem', border: '2px solid rgba(108, 92, 231,0.16)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '8px 10px 0 rgba(108, 92, 231,0.15), 0 32px 64px -16px rgba(0,0,0,0.6)', marginBottom: '2.5rem' }}>
          <span className="cute-float sparkle-deco" style={{ top: '10px', left: '18px', fontSize: '1.3rem', ['--tilt']: '-10deg', zIndex: 20 }}>⭐</span>
          <span className="cute-float sparkle-deco" style={{ top: '18px', right: '22px', fontSize: '1rem', ['--tilt']: '8deg', animationDelay: '0.6s', zIndex: 20 }}>✨</span>
          <div style={{ width: '100%', flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'block', position: 'relative' }}>
            <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', padding: '60px 48px 8px 48px' }}>
              {readBooks && readBooks.filter(b => b.status !== 'reading').length > 0 ? (
                <AnimatePresence initial={false}>
                  {readBooks.filter(b => b.status !== 'reading').map((book, idx) => {
                    const bookColor = hexColors[idx % 10];
                    // 페이지 수에 따라 두께(높이) 결정 — 최소 36px, 최대 88px
                    const pages = book.pages && book.pages > 0 ? book.pages : 260;
                    const bookH = Math.max(36, Math.min(88, pages / 3.5));
                    const xOffsets = [-8, 12, -16, 6, -10, 18, -4, 14, -12, 8];
                    const xOff = xOffsets[idx % xOffsets.length];
                    return (
                      <motion.div
                        key={book.id || book.title || idx}
                        initial={{ scaleX: 0, opacity: 0, x: xOff }}
                        animate={{ scaleX: 1, opacity: 1, x: xOff }}
                        exit={{ scaleX: 0, opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        style={{ width: '100%', transformOrigin: 'left center' }}
                      >
                        <div
                          onClick={() => onStackBookClick(book)}
                          className="hover:brightness-110 group"
                          style={{
                            width: '100%', height: `${bookH}px`, marginBottom: '3px',
                            display: 'flex', alignItems: 'center',
                            borderRadius: '3px 8px 8px 3px',
                            backgroundColor: bookColor,
                            backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(255,255,255,0.2) 2%, rgba(0,0,0,0.08) 5%, transparent 12%, transparent 82%, rgba(0,0,0,0.18) 100%)`,
                            borderLeft: '6px solid rgba(0,0,0,0.4)',
                            borderTop: '1px solid rgba(255,255,255,0.2)',
                            borderBottom: '1px solid rgba(0,0,0,0.35)',
                            boxShadow: `0 8px 16px -3px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)`,
                            cursor: 'pointer',
                            transition: 'filter 0.2s',
                            position: 'relative',
                            zIndex: idx + 1,
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}
                        >
                          {/* 책 등 광택 선 */}
                          <div style={{ position: 'absolute', left: '10px', top: '12%', bottom: '12%', width: '2px', backgroundColor: 'rgba(255,255,255,0.1)', filter: 'blur(0.5px)' }} />
                          {/* 커버 이미지 */}
                          {book.image && (
                            <img
                              src={book.image} alt=""
                              style={{ position: 'absolute', right: 0, top: 0, width: '80px', height: '100%', objectFit: 'cover', objectPosition: 'center top', opacity: 0.65, borderRadius: '0 7px 7px 0', borderLeft: '1px solid rgba(0,0,0,0.4)' }}
                            />
                          )}
                          {/* 제목 */}
                          <span style={{ fontSize: bookH < 44 ? '9px' : '11px', fontWeight: 900, letterSpacing: '0.03em', color: 'white', padding: `0 ${book.image ? '88px' : '16px'} 0 2rem`, userSelect: 'none', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', fontStyle: 'italic', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))', flexShrink: 1 }}>
                            {book.title.replace(/<\/?[^>]+(>|$)/g, "")}
                          </span>
                          {/* 읽는 중 뱃지 */}
                          {book.status === 'reading' && bookH >= 44 && (
                            <div style={{ position: 'absolute', top: '50%', right: book.image ? '88px' : '10px', transform: 'translateY(-50%)', background: 'rgba(167, 139, 250,0.28)', border: '1px solid rgba(167, 139, 250,0.55)', borderRadius: '9999px', padding: '2px 7px', fontSize: '9px', fontWeight: 900, color: '#A78BFA', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                              읽는 중
                            </div>
                          )}
                          {/* 호버 툴팁 */}
                          <div className="hidden group-hover:flex" style={{ position: 'absolute', top: '-54px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(108, 92, 231,0.3)', padding: '7px 13px', borderRadius: '12px', fontSize: '11px', fontWeight: 900, zIndex: 300, whiteSpace: 'nowrap', boxShadow: '0 12px 32px rgba(0,0,0,0.7)', alignItems: 'center', gap: '7px' }}>
                            <span style={{ backgroundColor: bookColor, width: '8px', height: '8px', borderRadius: '9999px', display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ color: 'white' }}>{book.title.replace(/<\/?[^>]+(>|$)/g, "").slice(0, 20)}</span>
                            <span style={{ color: 'rgba(167, 139, 250,0.8)', fontSize: '9px' }}>{pages}p</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              ) : (
                <div style={{ marginBottom: '8rem', textAlign: 'center' }}>
                  <div className="cute-float" style={{ width: '68px', height: '68px', margin: '0 auto 1rem', borderRadius: '42% 58% 63% 37% / 47% 44% 56% 53%', background: 'rgba(108, 92, 231,0.1)', border: '2px solid rgba(108, 92, 231,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={28} color="#A78BFA" />
                  </div>
                  <p style={{ fontWeight: 900, fontSize: '1rem', color: '#8F87B8', marginBottom: '0.375rem' }}>당신만의 지식 타워를 세우세요</p>
                  <p style={{ fontSize: '0.8125rem', color: '#C7C2E0' }}>검색으로 책을 찾아 서재에 추가해보세요</p>
                </div>
              )}
            </div>
          </div>
          <div style={{ width: '100%', height: '24px', backgroundImage: 'linear-gradient(to bottom, #2D2456, #150F2B)', borderRadius: '0 0 2.5rem 2.5rem', borderTop: '2px solid rgba(108, 92, 231,0.2)', boxShadow: '0 -4px 12px rgba(0,0,0,0.4)', position: 'relative', zIndex: 10 }}>
            <div style={{ position: 'absolute', top: '1px', left: 0, right: 0, height: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }} />
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {readBooks.filter(b => b.status !== 'reading').length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1.5rem', background: 'rgba(108, 92, 231,0.04)', border: '1px solid rgba(108, 92, 231,0.1)' }}>
              <BookOpen size={36} style={{ margin: '0 auto 1rem', color: '#C7C2E0' }} />
              <p style={{ color: '#8F87B8', fontWeight: 700 }}>완독한 책이 없습니다.</p>
            </div>
          )}
          {/* 완독 섹션 */}
          {readBooks.filter(b => b.status !== 'reading').length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                <div style={{ width: '3px', height: '14px', borderRadius: '9999px', background: '#6C5CE7' }} />
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.1em' }}>완독</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#C7C2E0' }}>{readBooks.filter(b => b.status !== 'reading').length}권</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.875rem' }}>
                {readBooks.filter(b => b.status !== 'reading').map((book, idx) => (
                  <BookCard key={book.id} book={book} idx={idx} onStackBookClick={onStackBookClick} onDeleteBook={onDeleteBook} />
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
            className="cute-pill-button"
            style={{ flex: 1, padding: '0.75rem', background: '#F0ECFF', border: '2.5px solid rgba(108, 92, 231,0.25)', color: '#5849C4', fontWeight: 800, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {isFetchingTendency ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
            내 독서 성향 분석
          </button>
          <button
            onClick={onFetchRecommendations}
            disabled={isFetchingRecs}
            className="cute-pill-button"
            style={{ flex: 1, padding: '0.75rem', background: '#FFF0F5', border: '2.5px solid rgba(255, 158, 181,0.35)', color: '#C2437A', fontWeight: 800, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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
            <h3 style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#241B45' }}>당신을 위한 추천 도서</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
            {recommendations.map((book, i) => (
              <div key={i} onClick={() => onBookClick(book)} className="book-list-item group" style={{ cursor: 'pointer' }}>
                {book.image ? (
                  <img src={book.image} style={{ width: '3rem', height: '4.25rem', objectFit: 'cover', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', flexShrink: 0 }} alt="" />
                ) : (
                  <div style={{ width: '3rem', height: '4.25rem', borderRadius: '0.5rem', background: 'rgba(108, 92, 231,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={18} style={{ color: '#6C5CE7' }} /></div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 className="group-hover:text-amber-700 transition-colors" style={{ fontWeight: 900, fontSize: '0.875rem', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</h4>
                  <p style={{ fontSize: '0.75rem', color: '#8F87B8', fontWeight: 700, marginBottom: '0.375rem' }}>{book.author}</p>
                  <p style={{ fontSize: '11px', color: '#6C5CE7', lineHeight: 1.5 }}>{book.reason}</p>
                </div>
                <ChevronRight size={14} style={{ color: '#C7C2E0', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function BookCard({ book, idx, onStackBookClick, onDeleteBook }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03, duration: 0.3, ease: 'easeOut' }}
      className="sticker-card group"
      onClick={() => onStackBookClick(book)}
      style={{ cursor: 'pointer', padding: '0.625rem', display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      {onDeleteBook && (
        <button
          onClick={e => { e.stopPropagation(); onDeleteBook(book.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 2, width: '1.375rem', height: '1.375rem', borderRadius: '9999px', background: 'rgba(239,68,68,0.85)', border: '1px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
        >
          <X size={10} />
        </button>
      )}
      <div style={{ width: '100%', aspectRatio: '3 / 4.2', borderRadius: '0.875rem', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.35)', marginBottom: '0.625rem', background: '#E9E5F7' }}>
        {book.image ? (
          <img src={book.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${hexColors[idx % 10]},${hexColors[(idx+2)%10]})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: '20px', fontWeight: 900 }}>{(book.title || '?')[0]}</span>
          </div>
        )}
      </div>
      <h4 className="group-hover:text-amber-700 transition-colors" style={{ fontWeight: 900, fontSize: '0.75rem', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '0.25rem', minHeight: '2.05em' }}>
        {stripHtml(book.title)}
      </h4>
      <p style={{ fontSize: '0.6875rem', color: '#8F87B8', fontWeight: 700, marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</p>
      {book.impression && (
        <div style={{ marginTop: 'auto' }}>
          <span style={{ fontSize: '9px', color: book.is_public ? '#6C5CE7' : '#C7C2E0', border: '1px solid rgba(108, 92, 231,0.12)', padding: '2px 7px', borderRadius: '9999px', background: 'rgba(108, 92, 231,0.04)' }}>
            {book.is_public ? '🌐' : '🔒'}
          </span>
        </div>
      )}
    </motion.div>
  );
}
