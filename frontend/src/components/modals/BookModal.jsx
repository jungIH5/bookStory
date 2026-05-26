import React from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen, Sparkles, Loader2, Bookmark, Plus, MessageCircle } from 'lucide-react';
import { stripHtml } from '../../utils';

export default function BookModal({
  book, analysisResult, questions, isAnalyzing,
  bookImpression, setBookImpression,
  bookImpressionPublic, setBookImpressionPublic,
  isSaving, isSavingImpression,
  onClose, onRegister, onLoadAnalysis, onStartDiscussion, onSaveImpression,
}) {
  return (
    <div className="modal-backdrop overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-content relative my-auto"
        style={{ boxShadow: '0 0 80px rgba(140,107,66,0.12), 0 40px 80px rgba(0,0,0,0.6)' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,107,66,0.09)', border: 'none', borderRadius: '9999px', cursor: 'pointer', color: '#9E8D7A', transition: 'all 0.2s ease', zIndex: 10 }} className="hover:bg-red-500\/20 hover:text-red-400"><X size={16} /></button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.125rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(139,107,66,0.1)' }}>
            <div style={{ width: '3.5rem', flexShrink: 0 }}>
              <div style={{ aspectRatio: '2/3', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid rgba(139,107,66,0.15)' }}>
                {book.image ? (
                  <img src={book.image} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#EDE8E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={16} color="#8C6B42" /></div>
                )}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.375rem' }}>
                <BookOpen size={11} style={{ color: '#8C6B42' }} />
                <span style={{ fontSize: '9px', color: '#8C6B42', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>책 소개</span>
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>{stripHtml(book.title)}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#9E8D7A' }}>{book.author}</span>
                <span style={{ width: '3px', height: '3px', borderRadius: '9999px', background: 'rgba(139,107,66,0.3)', display: 'inline-block' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#9E8D7A' }}>{book.publisher}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(140,107,66,0.04)', borderRadius: '0.875rem', border: '1px solid rgba(140,107,66,0.1)', minHeight: '4rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #8C6B42, #C49456)', borderRadius: '9999px' }} />
                <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#A07840', textTransform: 'uppercase', letterSpacing: '0.12em' }}>책 소개</h3>
              </div>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.7, color: '#7B6B55', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{analysisResult || '책 소개 정보가 없습니다.'}</p>
            </motion.div>
          </div>

          {!isAnalyzing && questions.thematic.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(140,107,66,0.04)', borderRadius: '0.875rem', border: '1px solid rgba(140,107,66,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #8C6B42, #C49456)', borderRadius: '9999px' }} />
                  <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#A07840', textTransform: 'uppercase', letterSpacing: '0.12em' }}>토론 질문</h3>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {questions.thematic.map((q, i) => (
                    <li key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                      <span style={{ flexShrink: 0, width: '1.25rem', height: '1.25rem', borderRadius: '9999px', background: 'rgba(140,107,66,0.15)', border: '1px solid rgba(140,107,66,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 900, color: '#8C6B42', marginTop: '1px' }}>{i + 1}</span>
                      <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#3D2D1E', fontWeight: 500 }}>{q}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {questions.perspective_shift.length > 0 && (
                <div style={{ padding: '1rem', background: 'rgba(196,148,86,0.04)', borderRadius: '0.875rem', border: '1px solid rgba(196,148,86,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #C49456, #f59e0b)', borderRadius: '9999px' }} />
                    <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#C49456', textTransform: 'uppercase', letterSpacing: '0.12em' }}>관점 전환</h3>
                  </div>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {questions.perspective_shift.map((item, i) => (
                      <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '9px', fontWeight: 900, color: '#C49456', background: 'rgba(196,148,86,0.12)', border: '1px solid rgba(196,148,86,0.2)', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', width: 'fit-content', letterSpacing: '0.05em' }}>{item.perspective}</span>
                        <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#3D2D1E', fontWeight: 500 }}>{item.question}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          <div style={{ padding: '1rem', background: 'rgba(140,107,66,0.03)', borderRadius: '0.875rem', border: '1px solid rgba(140,107,66,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #8C6B42, #C49456)', borderRadius: '9999px' }} />
                <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#A07840', textTransform: 'uppercase', letterSpacing: '0.12em' }}>내 감상평 <span style={{ fontSize: '8px', color: '#BDB0A0', textTransform: 'none', letterSpacing: 0 }}>(선택)</span></h3>
              </div>
              <button onClick={() => setBookImpressionPublic(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '9999px', background: bookImpressionPublic ? 'rgba(140,107,66,0.1)' : 'rgba(100,100,100,0.06)', border: `1px solid ${bookImpressionPublic ? 'rgba(140,107,66,0.25)' : 'rgba(139,107,66,0.12)'}`, cursor: 'pointer', fontSize: '10px', fontWeight: 700, color: bookImpressionPublic ? '#8C6B42' : '#9E8D7A', transition: 'all 0.2s' }}>
                {bookImpressionPublic ? '🌐 공개' : '🔒 나만 보기'}
              </button>
            </div>
            <textarea
              value={bookImpression}
              onChange={e => setBookImpression(e.target.value)}
              placeholder="이 책을 읽고 느낀 점을 자유롭게 적어보세요..."
              rows={3}
              className="form-input"
              style={{ width: '100%', resize: 'vertical', fontSize: '0.8125rem', lineHeight: 1.6, color: '#1C140E', minHeight: '72px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            {book?.fromStack ? (
              <button onClick={onSaveImpression} disabled={isSavingImpression} className="premium-button disabled:opacity-50" style={{ flex: 1, padding: '0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {isSavingImpression ? <Loader2 className="animate-spin" size={15} /> : <Bookmark size={15} />}
                <span>감상평 저장</span>
              </button>
            ) : (
              <button onClick={onRegister} disabled={isSaving} className="premium-button disabled:opacity-50" style={{ flex: 1, padding: '0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {isSaving ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
                <span>내 서재에 기록하기</span>
              </button>
            )}
            {questions.thematic.length > 0 ? (
              <button onClick={onStartDiscussion} style={{ flex: 1, padding: '0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(196,148,86,0.12)', border: '1px solid rgba(196,148,86,0.25)', borderRadius: '0.875rem', color: '#C49456', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <MessageCircle size={15} />
                <span>토론 시작하기</span>
              </button>
            ) : (
              <button onClick={onLoadAnalysis} disabled={isAnalyzing} style={{ flex: 1, padding: '0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(140,107,66,0.07)', border: '1px solid rgba(140,107,66,0.15)', borderRadius: '0.875rem', color: '#8C6B42', fontWeight: 800, cursor: isAnalyzing ? 'wait' : 'pointer', transition: 'all 0.2s ease', opacity: isAnalyzing ? 0.7 : 1 }}>
                {isAnalyzing ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
                <span>{isAnalyzing ? 'AI 분석 중...' : 'AI 토론 질문 생성'}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
