import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Pause, Play, Square, X } from 'lucide-react';
import { formatTimer } from '../utils';

export default function ReadingTimer({ book, seconds, isRunning, onPause, onResume, onStop, onHide }) {
  if (!book) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      style={{
        position: 'fixed',
        bottom: '5.5rem',
        left: '50%',
        x: '-50%',
        zIndex: 9000,
        background: 'rgba(28,20,14,0.96)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139,107,66,0.35)',
        borderRadius: '9999px',
        padding: '0.625rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        whiteSpace: 'nowrap',
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: '1.875rem', height: '2.625rem', borderRadius: '3px',
          overflow: 'hidden', flexShrink: 0,
          background: 'rgba(140,107,66,0.15)',
          border: `1px solid ${isRunning ? 'rgba(196,148,86,0.35)' : 'rgba(139,107,66,0.15)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {book.image ? (
            <img src={book.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <BookOpen size={10} style={{ color: isRunning ? '#C49456' : '#7B6B55' }} />
          )}
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#9E8D7A', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {book.title}
        </span>
      </div>

      <div style={{
        fontFamily: 'monospace',
        fontSize: '1rem',
        fontWeight: 900,
        color: isRunning ? '#C49456' : '#7B6B55',
        letterSpacing: '0.05em',
        minWidth: '52px',
        textAlign: 'center',
      }}>
        {formatTimer(seconds)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <button
          onClick={isRunning ? onPause : onResume}
          title={isRunning ? '일시정지' : '계속 읽기'}
          style={{
            width: '1.875rem', height: '1.875rem', borderRadius: '9999px',
            background: 'rgba(139,107,66,0.12)', border: '1px solid rgba(139,107,66,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#C49456', transition: 'all 0.15s ease',
          }}
        >
          {isRunning ? <Pause size={11} fill="#C49456" /> : <Play size={11} fill="#C49456" />}
        </button>
        <button
          onClick={onStop}
          title="독서 종료 및 기록 저장"
          style={{
            width: '1.875rem', height: '1.875rem', borderRadius: '9999px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#ef4444', transition: 'all 0.15s ease',
          }}
        >
          <Square size={10} fill="#ef4444" />
        </button>
        {onHide && (
          <button
            onClick={onHide}
            title="위젯 숨기기 (독서 타이머 탭에서 다시 켤 수 있어요)"
            style={{
              width: '1.875rem', height: '1.875rem', borderRadius: '9999px',
              background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#7B6B55', transition: 'all 0.15s ease',
            }}
          >
            <X size={11} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
