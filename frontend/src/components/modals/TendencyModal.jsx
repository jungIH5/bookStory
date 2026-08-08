import React from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

export default function TendencyModal({ tendencyResult, userName, onClose }) {
  return (
    <div className="modal-backdrop overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-content relative my-auto"
        style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <Sparkles size={13} style={{ color: '#8B5A2B' }} />
              <span style={{ fontSize: '9px', color: '#8B5A2B', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>AI 독서 성향 분석</span>
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{userName}님의 독서 패턴</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(139, 90, 43,0.08)', border: '1px solid rgba(139, 90, 43,0.12)', width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8A7460' }} className="hover:bg-white\/10 hover:text-white"><X size={16} /></button>
        </div>

        {tendencyResult.qa_count === 0 ? (
          <p style={{ color: '#8A7460', fontSize: '0.875rem', lineHeight: 1.7, textAlign: 'center', padding: '2rem 0' }}>{tendencyResult.tendency_summary}</p>
        ) : (
          <>
            <div style={{ padding: '1rem', background: 'rgba(139, 90, 43,0.05)', border: '1px solid rgba(139, 90, 43,0.12)', borderRadius: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #8B5A2B, #D2914B)', borderRadius: '9999px' }} />
                <span style={{ fontSize: '9px', fontWeight: 900, color: '#6E4A1F', textTransform: 'uppercase', letterSpacing: '0.12em' }}>성향 요약</span>
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#6E5A45' }}>{tendencyResult.tendency_summary}</p>
            </div>

            {tendencyResult.reading_lenses?.length > 0 && (
              <div>
                <p style={{ fontSize: '9px', fontWeight: 900, color: '#8B5A2B', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.625rem' }}>자주 쓰는 관점</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {tendencyResult.reading_lenses.map((lens, i) => (
                    <span key={i} style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#8B5A2B', background: 'rgba(139, 90, 43,0.1)', border: '1px solid rgba(139, 90, 43,0.2)', padding: '4px 12px', borderRadius: '9999px' }}>{lens}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {tendencyResult.strong_areas?.length > 0 && (
                <div style={{ padding: '0.875rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '0.875rem' }}>
                  <p style={{ fontSize: '9px', fontWeight: 900, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>잘하는 영역</p>
                  {tendencyResult.strong_areas.map((a, i) => (
                    <p key={i} style={{ fontSize: '0.8125rem', color: '#6E5A45', lineHeight: 1.6, fontWeight: 500 }}>· {a}</p>
                  ))}
                </div>
              )}
              {tendencyResult.growth_areas?.length > 0 && (
                <div style={{ padding: '0.875rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '0.875rem' }}>
                  <p style={{ fontSize: '9px', fontWeight: 900, color: '#fcd34d', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>성장 가능 영역</p>
                  {tendencyResult.growth_areas.map((a, i) => (
                    <p key={i} style={{ fontSize: '0.8125rem', color: '#6E5A45', lineHeight: 1.6, fontWeight: 500 }}>· {a}</p>
                  ))}
                </div>
              )}
            </div>

            <p style={{ fontSize: '10px', color: '#C4AD91', textAlign: 'right' }}>분석 기반: Q&A {tendencyResult.qa_count}개</p>
          </>
        )}
      </motion.div>
    </div>
  );
}
