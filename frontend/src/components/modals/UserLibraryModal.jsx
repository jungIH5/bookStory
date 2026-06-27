import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, ChevronDown, ChevronUp, Loader2, Library } from 'lucide-react';
import { stripHtml } from '../../utils';
import { API_URL } from '../../api';
import { hexColors } from '../../constants';

export default function UserLibraryModal({ userId, userName, currentUserId, onClose }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/books/read?user_id=${userId}`);
        const data = await res.json();
        setBooks(Array.isArray(data) ? data : []);
      } catch {} finally { setLoading(false); }
    })();
  }, [userId]);

  const reading = books.filter(b => b.status === 'reading');
  const finished = books.filter(b => b.status !== 'reading');
  const isMe = parseInt(currentUserId) === parseInt(userId);

  return (
    <div className="modal-backdrop overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 32 }}
        onClick={e => e.stopPropagation()}
        className="modal-content relative my-auto"
        style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' }}
      >
        {/* 헤더 */}
        <div style={{ padding: '1.5rem 1.75rem 1.25rem', borderBottom: '1px solid rgba(139,107,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '9999px', background: 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '13px' }}>
              {(userName || '?')[0]}
            </div>
            <div>
              <p style={{ fontWeight: 900, fontSize: '1rem', color: '#1C140E' }}>{isMe ? '내 서재' : `${userName}님의 서재`}</p>
              <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700, marginTop: '1px' }}>
                완독 {finished.length}권 · 읽는 중 {reading.length}권
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A' }}>
            <X size={14} />
          </button>
        </div>

        {/* 본문 */}
        <div style={{ padding: '1.25rem 1.75rem 1.75rem', overflowY: 'auto', maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
              <Loader2 className="animate-spin" size={28} style={{ color: '#8C6B42' }} />
            </div>
          ) : books.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#BDB0A0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <Library size={32} style={{ opacity: 0.4 }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>아직 서재에 책이 없습니다.</p>
            </div>
          ) : (
            <>
              {/* 읽는 중 */}
              {reading.length > 0 && (
                <Section
                  title="읽는 중"
                  books={reading}
                  expandedId={expandedId}
                  onToggle={setExpandedId}
                  isMe={isMe}
                  accentColor="#C49456"
                />
              )}
              {/* 완독 */}
              {finished.length > 0 && (
                <Section
                  title="완독"
                  books={finished}
                  expandedId={expandedId}
                  onToggle={setExpandedId}
                  isMe={isMe}
                  accentColor="#8C6B42"
                />
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Section({ title, books, expandedId, onToggle, isMe, accentColor }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <div style={{ width: '3px', height: '14px', borderRadius: '9999px', background: accentColor }} />
        <span style={{ fontSize: '11px', fontWeight: 900, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#BDB0A0' }}>{books.length}권</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {books.map((book, idx) => (
          <BookCard
            key={book.id}
            book={book}
            idx={idx}
            isExpanded={expandedId === book.id}
            onToggle={() => onToggle(expandedId === book.id ? null : book.id)}
            isMe={isMe}
          />
        ))}
      </div>
    </div>
  );
}

function BookCard({ book, idx, isExpanded, onToggle, isMe }) {
  const title = stripHtml(book.title);
  const hasImpression = book.impression && (book.is_public || isMe);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
      style={{
        borderRadius: '0.875rem',
        border: `1px solid ${isExpanded ? 'rgba(140,107,66,0.25)' : 'rgba(139,107,66,0.1)'}`,
        background: isExpanded ? 'rgba(140,107,66,0.04)' : 'transparent',
        overflow: 'hidden',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <div
        onClick={hasImpression ? onToggle : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          padding: '0.875rem 1rem',
          cursor: hasImpression ? 'pointer' : 'default',
        }}
      >
        {/* 표지 */}
        <div style={{ width: '42px', minWidth: '42px', height: '60px', borderRadius: '5px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', background: '#EDE8E2', flexShrink: 0 }}>
          {book.image
            ? <img src={book.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${hexColors[idx % 10]},${hexColors[(idx+2)%10]})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 900 }}>{title[0]}</span>
              </div>}
        </div>

        {/* 정보 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 900, fontSize: '0.875rem', color: '#1C140E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.25rem' }}>{title}</p>
          {book.author && <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700, marginBottom: '0.375rem' }}>{book.author}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {book.status === 'reading' ? (
              <span style={{ fontSize: '9px', fontWeight: 900, color: '#C49456', background: 'rgba(196,148,86,0.1)', border: '1px solid rgba(196,148,86,0.3)', padding: '2px 7px', borderRadius: '9999px', letterSpacing: '0.05em' }}>읽는 중</span>
            ) : (
              <span style={{ fontSize: '9px', fontWeight: 900, color: '#8C6B42', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.2)', padding: '2px 7px', borderRadius: '9999px', letterSpacing: '0.05em' }}>완독</span>
            )}
            {book.impression && !book.is_public && isMe && (
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#BDB0A0' }}>🔒 비공개 감상</span>
            )}
            {book.impression && book.is_public && (
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#9E8D7A' }}>감상 있음</span>
            )}
          </div>
        </div>

        {/* 펼치기 */}
        {hasImpression && (
          <div style={{ flexShrink: 0, color: '#9E8D7A' }}>
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        )}
      </div>

      {/* 감상 펼침 */}
      <AnimatePresence>
        {isExpanded && hasImpression && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1rem 1rem 1rem' }}>
              <div style={{ padding: '0.875rem 1rem', background: 'rgba(140,107,66,0.06)', border: '1px solid rgba(140,107,66,0.12)', borderRadius: '0.75rem' }}>
                <p style={{ fontSize: '9px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>감상</p>
                <p style={{ fontSize: '0.8125rem', color: '#3D2410', lineHeight: 1.7, fontWeight: 500, whiteSpace: 'pre-wrap' }}>{book.impression}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
