import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, Clock, X } from 'lucide-react';
import { formatReadingTime } from '../../utils';

export default function TimerCompleteModal({ book, seconds, onFinished, onStillReading, onCancel }) {
  if (!book) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '380px', background: '#FDFCFF', borderRadius: '2.25rem', overflow: 'hidden', boxShadow: '6px 8px 0 rgba(108, 92, 231,0.2), 0 32px 80px rgba(0,0,0,0.35)', border: '2.5px solid rgba(108, 92, 231,0.2)', position: 'relative' }}
      >
        <span className="cute-float sparkle-deco" style={{ top: '8px', left: '18px', ['--tilt']: '-12deg', zIndex: 2 }}>🎉</span>
        {onCancel && (
          <button
            onClick={onCancel}
            title="닫기 (일시정지 상태로 돌아가서 이어서 읽을 수 있어요)"
            style={{ position: 'absolute', top: '0.875rem', right: '0.875rem', zIndex: 2, width: '1.75rem', height: '1.75rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
          >
            <X size={13} />
          </button>
        )}

        {/* 헤더 */}
        <div style={{ background: 'linear-gradient(135deg, rgba(36, 27, 69,0.97), rgba(51, 42, 92,0.97))', padding: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '56px', minWidth: '56px', height: '80px', borderRadius: '0.9rem', overflow: 'hidden', background: 'rgba(108, 92, 231,0.2)', border: '2px solid rgba(108, 92, 231,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
            {book.image
              ? <img src={book.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <BookOpen size={20} style={{ color: '#6C5CE7' }} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '9px', fontWeight: 900, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.375rem' }}>독서 종료</p>
            <p style={{ fontWeight: 900, fontSize: '1rem', color: 'white', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
            {book.author && <p style={{ fontSize: '12px', color: '#6E67A0', fontWeight: 700, marginTop: '0.25rem' }}>{book.author}</p>}
          </div>
        </div>

        {/* 읽은 시간 */}
        <div style={{ padding: '1.25rem 1.75rem', background: 'rgba(108, 92, 231,0.04)', borderBottom: '1px solid rgba(108, 92, 231,0.1)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Clock size={14} style={{ color: '#6C5CE7', flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#6E67A0' }}>이번 세션</span>
          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#241B45', marginLeft: 'auto' }}>{formatReadingTime(seconds)}</span>
        </div>

        {/* 질문 */}
        <div style={{ padding: '1.75rem' }}>
          <p style={{ fontSize: '1rem', fontWeight: 900, color: '#241B45', marginBottom: '0.5rem' }}>이 책을 완독하셨나요?</p>
          <p style={{ fontSize: '0.8125rem', color: '#8F87B8', fontWeight: 700, marginBottom: '1.5rem', lineHeight: 1.5 }}>
            완독하셨다면 서재에서 완독 표시가 됩니다.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <button
              onClick={onFinished}
              className="cute-pill-button"
              style={{
                width: '100%', padding: '0.875rem',
                background: 'linear-gradient(135deg, #1E1838, #332A5C)',
                color: '#A78BFA', fontWeight: 900, fontSize: '0.9375rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={17} />
              완독했어요
            </button>
            <button
              onClick={onStillReading}
              className="cute-pill-button"
              style={{
                width: '100%', padding: '0.875rem',
                background: 'transparent',
                color: '#8F87B8', fontWeight: 800, fontSize: '0.9375rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              아직 읽는 중이에요
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
