import React from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, MessageCircle, Loader2, Send } from 'lucide-react';
import { stripHtml } from '../../utils';

export default function ConversationModal({
  selectedBook, sessionQA, conversationInput, setConversationInput,
  isSubmittingAnswer, onClose, onSubmitAnswer, user,
}) {
  return (
    <div className="modal-backdrop overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-content relative my-auto"
        style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid rgba(139,107,66,0.1)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <MessageCircle size={13} style={{ color: '#C49456' }} />
              <span style={{ fontSize: '9px', color: '#C49456', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>AI 토론 진행</span>
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{stripHtml(selectedBook.title)}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.12)', width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A' }} className="hover:bg-white\/10 hover:text-white"><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {sessionQA.map((turn, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '9999px', background: 'linear-gradient(135deg, #8C6B42, #C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={10} color="white" />
                </div>
                <div style={{ flex: 1, background: 'rgba(140,107,66,0.07)', border: '1px solid rgba(140,107,66,0.15)', borderRadius: '0 0.875rem 0.875rem 0.875rem', padding: '0.75rem 1rem' }}>
                  <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#3D2D1E', fontWeight: 500 }}>{turn.question}</p>
                </div>
              </div>
              {turn.answer && (
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
                  <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '9999px', background: '#EDE8E2', border: '1px solid rgba(139,107,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '9px', fontWeight: 900, color: '#7B6B55' }}>
                    {(user?.name || '나')[0]}
                  </div>
                  <div style={{ flex: 1, background: 'rgba(139,107,66,0.07)', border: '1px solid rgba(139,107,66,0.12)', borderRadius: '0.875rem 0 0.875rem 0.875rem', padding: '0.75rem 1rem' }}>
                    <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#7B6B55', fontWeight: 500 }}>{turn.answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isSubmittingAnswer && (
            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', paddingLeft: '2.375rem' }}>
              <Loader2 size={14} className="animate-spin" style={{ color: '#8C6B42' }} />
              <span style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700 }}>다음 질문 생성 중...</span>
            </div>
          )}
        </div>

        {sessionQA.length > 0 && sessionQA[sessionQA.length - 1].answer === null && !isSubmittingAnswer && (
          <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(139,107,66,0.1)' }}>
            <textarea
              value={conversationInput}
              onChange={(e) => setConversationInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmitAnswer(); } }}
              placeholder="답변을 입력하세요... (Shift+Enter: 줄바꿈)"
              className="form-input"
              style={{ flex: 1, height: '5rem', resize: 'none', color: '#1C140E', fontSize: '0.8125rem' }}
            />
            <button
              onClick={onSubmitAnswer}
              disabled={!conversationInput.trim()}
              style={{ alignSelf: 'flex-end', width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: conversationInput.trim() ? 'linear-gradient(135deg, #8C6B42, #C49456)' : 'rgba(139,107,66,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: conversationInput.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s ease', flexShrink: 0 }}
            >
              <Send size={15} color="white" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
