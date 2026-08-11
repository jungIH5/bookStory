import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Loader2, ChevronRight, X, Sprout, Minus, Plus } from 'lucide-react';
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
            <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', padding: '32px 20px 12px' }}>
              {readBooks && readBooks.filter(b => b.status !== 'reading').length > 0 ? (
                <BookTree books={readBooks.filter(b => b.status !== 'reading')} onStackBookClick={onStackBookClick} />
              ) : (
                <div style={{ marginBottom: '8rem', textAlign: 'center' }}>
                  <div className="cute-float" style={{ width: '68px', height: '68px', margin: '0 auto 1rem', borderRadius: '42% 58% 63% 37% / 47% 44% 56% 53%', background: 'rgba(108, 92, 231,0.1)', border: '2px solid rgba(108, 92, 231,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sprout size={28} color="#A78BFA" />
                  </div>
                  <p style={{ fontWeight: 900, fontSize: '1rem', color: '#8F87B8', marginBottom: '0.375rem' }}>당신만의 독서 나무를 심어보세요</p>
                  <p style={{ fontSize: '0.8125rem', color: '#C7C2E0' }}>책을 완독하면 나무에 잎이 돋아나요</p>
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

function BookTree({ books, onStackBookClick }) {
  const count = books.length;
  const width = 300;
  const centerX = width / 2;

  // 캐노피(수관)는 책이 늘수록 sqrt로 서서히 넓어진다 — 선형으로 키우면 후반부에 잎이
  // 너무 성기게 퍼져 보인다. 트렁크도 완만하게 함께 자라 나무가 크는 느낌을 준다.
  const canopyRx = Math.min(148, 66 + Math.sqrt(count) * 15);
  const canopyRy = canopyRx * 0.74;
  const trunkHeight = 100 + Math.min(150, count * 4);
  const svgH = Math.max(360, trunkHeight + canopyRy * 2 + 60);
  const groundY = svgH - 24;
  const canopyBaseY = groundY - trunkHeight;
  const canopyCenterY = canopyBaseY - canopyRy * 0.62;

  // 트렁크가 완전히 곧지 않고 살짝 휘어 보이도록 y에 따라 x를 사인파로 흔든다.
  const trunkX = (y) => centerX + 9 * Math.sin((groundY - y) / 55);
  const trunkBaseW = 30;
  const trunkTopW = 13;
  const trunkW = (y) => {
    const t = Math.min(1, Math.max(0, (groundY - y) / trunkHeight));
    return trunkBaseW + (trunkTopW - trunkBaseW) * t;
  };

  // 트렁크를 얇은 선이 아니라 밑동이 두툼하고 위로 갈수록 가늘어지는 채워진 도형으로 그린다
  // (뿌리 쪽 두 지점은 폭을 더 벌려 살짝 뿌리 플레어를 준다).
  const steps = 12;
  const leftPts = [];
  const rightPts = [];
  for (let s = 0; s <= steps; s++) {
    const y = groundY - (trunkHeight * s) / steps;
    const cx = trunkX(y);
    const flare = s === 0 ? 1.6 : s === 1 ? 1.2 : 1;
    const halfW = (trunkW(y) * flare) / 2;
    leftPts.push(`${(cx - halfW).toFixed(1)},${y.toFixed(1)}`);
    rightPts.push(`${(cx + halfW).toFixed(1)},${y.toFixed(1)}`);
  }
  const trunkPath = `M ${leftPts.join(' L ')} L ${rightPts.slice().reverse().join(' L ')} Z`;

  // 캐노피 안으로 뻗는 굵은 가지 몇 개(장식용 — 잎 하나하나와 매칭시키지 않는다. 실제 나무도
  // 가지는 굵은 몇 갈래뿐이고 그 안에서 잎/열매가 무성하게 돋아난다).
  const branchAngles = [-64, -30, 0, 30, 64];
  const branches = branchAngles.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const len = canopyRx * 0.8;
    const endX = centerX + Math.sin(rad) * len;
    const endY = canopyBaseY - Math.cos(rad) * len * 0.7;
    const ctrlX = centerX + Math.sin(rad) * len * 0.5;
    const ctrlY = canopyBaseY - len * 0.42;
    return `M ${centerX.toFixed(1)},${canopyBaseY.toFixed(1)} Q ${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`;
  });

  // 책(잎/열매)은 특정 가지 끝이 아니라, 해바라기 씨앗 배열(황금각 스파이럴)로 캐노피
  // 타원 안에 자연스럽게 흩뿌린다 — 사다리처럼 규칙적으로 보이지 않게 하기 위함.
  const goldenAngle = 137.508 * (Math.PI / 180);
  const leaves = books.map((book, i) => {
    const r = Math.sqrt((i + 0.5) / count);
    const theta = i * goldenAngle;
    const x = centerX + Math.cos(theta) * r * canopyRx * 0.92;
    const y = canopyCenterY + Math.sin(theta) * r * canopyRy * 0.92;
    const jitter = prand(i + 1);
    const rot = (jitter - 0.5) * 24;
    const stemX = x + (centerX - x) * 0.22;
    const stemY = y + (canopyCenterY - y) * 0.22;
    return { book, i, x, y, rot, stemX, stemY };
  });

  return (
    <div style={{ position: 'relative', width: `${width}px`, height: `${svgH}px`, margin: '0 auto' }}>
      <svg width={width} height={svgH} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <linearGradient id="treeTrunkFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2A2050" />
            <stop offset="45%" stopColor="#3D3163" />
            <stop offset="100%" stopColor="#4E3F82" />
          </linearGradient>
          <filter id="treeCanopyGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="20" />
          </filter>
        </defs>
        {/* 캐노피 은은한 발광 배경 */}
        <ellipse cx={centerX} cy={canopyCenterY} rx={canopyRx} ry={canopyRy} fill="rgba(167, 139, 250,0.22)" filter="url(#treeCanopyGlow)" />
        <ellipse cx={centerX - canopyRx * 0.28} cy={canopyCenterY - canopyRy * 0.22} rx={canopyRx * 0.55} ry={canopyRy * 0.55} fill="rgba(216, 180, 254,0.18)" filter="url(#treeCanopyGlow)" />
        {/* 트렁크 */}
        <path d={trunkPath} fill="url(#treeTrunkFill)" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
        <path d={`M ${trunkX(groundY) - trunkW(groundY) * 0.75},${groundY} L ${trunkX(canopyBaseY) - trunkW(canopyBaseY) * 0.3},${canopyBaseY}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinecap="round" />
        {/* 굵은 가지 */}
        {branches.map((d, bi) => (
          <path key={bi} d={d} fill="none" stroke="url(#treeTrunkFill)" strokeWidth="7" strokeLinecap="round" opacity="0.9" />
        ))}
        {/* 잎/열매를 캐노피 중심에 살짝 붙들어주는 짧은 잔가지 */}
        {leaves.map(({ i, x, y, stemX, stemY }) => (
          <path key={i} d={`M ${x.toFixed(1)},${y.toFixed(1)} L ${stemX.toFixed(1)},${stemY.toFixed(1)}`} fill="none" stroke="rgba(167, 139, 250,0.45)" strokeWidth="2.5" strokeLinecap="round" />
        ))}
      </svg>
      <AnimatePresence initial={false}>
        {leaves.map(({ book, i, x, y, rot }) => {
          const bookColor = hexColors[i % 10];
          return (
            <motion.div
              key={book.id || book.title || i}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22, delay: i * 0.02 }}
              onClick={() => onStackBookClick(book)}
              className="group"
              style={{
                position: 'absolute', left: `${x}px`, top: `${y}px`,
                width: '42px', height: '42px', zIndex: i + 1,
                transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: '100%', height: '100%', overflow: 'hidden', background: '#2D2456',
                borderRadius: '46% 54% 60% 40% / 55% 45% 55% 45%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.45)', border: '2px solid rgba(167, 139, 250,0.4)',
              }}>
                {book.image ? (
                  <img src={book.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${bookColor},${hexColors[(i + 2) % 10]})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'white', fontSize: '13px', fontWeight: 900 }}>{(book.title || '?')[0]}</span>
                  </div>
                )}
              </div>
              <div className="hidden group-hover:flex" style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: `translateX(-50%) rotate(${-rot}deg)`, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(108, 92, 231,0.3)', padding: '6px 11px', borderRadius: '10px', fontSize: '10px', fontWeight: 900, color: 'white', zIndex: 300, whiteSpace: 'nowrap', boxShadow: '0 12px 32px rgba(0,0,0,0.7)' }}>
                {book.title.replace(/<\/?[^>]+(>|$)/g, "").slice(0, 20)}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
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
