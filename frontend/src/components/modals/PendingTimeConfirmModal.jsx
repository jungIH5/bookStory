import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, X } from 'lucide-react';
import { formatReadingTime } from '../../utils';

export default function PendingTimeConfirmModal({ item, onConfirm, onDismiss }) {
  const estimatedMinutes = Math.round((item.estimated_seconds || 0) / 60);
  const [minutes, setMinutes] = useState(estimatedMinutes);

  if (!item) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        style={{ width: '100%', maxWidth: '380px', background: '#FDFCFF', borderRadius: '2.25rem', overflow: 'hidden', boxShadow: '6px 8px 0 rgba(108, 92, 231,0.2), 0 32px 80px rgba(0,0,0,0.35)', border: '2.5px solid rgba(108, 92, 231,0.2)', position: 'relative' }}
      >
        <span className="cute-float sparkle-deco" style={{ top: '8px', left: '18px', ['--tilt']: '-12deg', zIndex: 2 }}>⏳</span>
        <button
          onClick={onDismiss}
          title="나중에 확인하기"
          style={{ position: 'absolute', top: '0.875rem', right: '0.875rem', zIndex: 1, width: '1.75rem', height: '1.75rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
        >
          <X size={13} />
        </button>

        <div style={{ background: 'linear-gradient(135deg, rgba(36, 27, 69,0.97), rgba(36, 27, 69,0.97))', padding: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '56px', minWidth: '56px', height: '80px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(108, 92, 231,0.2)', border: '1px solid rgba(108, 92, 231,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
            {item.book_image
              ? <img src={item.book_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <BookOpen size={20} style={{ color: '#6C5CE7' }} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '9px', fontWeight: 900, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.375rem' }}>세션이 자동 종료됐어요</p>
            <p style={{ fontWeight: 900, fontSize: '1rem', color: 'white', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.room_title}</p>
            {item.book_title && <p style={{ fontSize: '12px', color: '#6E67A0', fontWeight: 700, marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.book_title}</p>}
          </div>
        </div>

        <div style={{ padding: '1.25rem 1.75rem', background: 'rgba(108, 92, 231,0.04)', borderBottom: '1px solid rgba(108, 92, 231,0.1)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Clock size={14} style={{ color: '#6C5CE7', flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#6E67A0' }}>자동 계산된 예상 시간</span>
          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#241B45', marginLeft: 'auto' }}>{formatReadingTime(item.estimated_seconds)}</span>
        </div>

        <div style={{ padding: '1.75rem' }}>
          <p style={{ fontSize: '1rem', fontWeight: 900, color: '#241B45', marginBottom: '0.5rem' }}>독서기록을 켜둔 채로 자리를 비우셨나 봐요</p>
          <p style={{ fontSize: '0.8125rem', color: '#8F87B8', fontWeight: 700, marginBottom: '1.25rem', lineHeight: 1.5 }}>
            실제로 읽으신 시간(분)을 확인하고 저장해주세요. 정확히 기억나지 않으면 예상치를 그대로 두셔도 괜찮아요.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
            <input
              type="number"
              min="0"
              value={minutes}
              onChange={e => setMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
              style={{
                flex: 1, padding: '0.75rem 0.875rem', borderRadius: '0.75rem',
                border: '1px solid rgba(108, 92, 231,0.25)', background: 'white',
                fontSize: '1rem', fontWeight: 800, color: '#241B45', textAlign: 'center',
              }}
            />
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#6E67A0' }}>분</span>
          </div>

          <button
            onClick={() => onConfirm(minutes * 60)}
            className="cute-pill-button"
            style={{
              width: '100%', padding: '0.875rem',
              background: 'linear-gradient(135deg, #1E1838, #332A5C)',
              color: '#A78BFA', fontWeight: 900, fontSize: '0.9375rem',
              cursor: 'pointer',
            }}
          >
            확인 및 저장
          </button>
        </div>
      </motion.div>
    </div>
  );
}
