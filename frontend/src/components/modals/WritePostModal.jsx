import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Loader2, Search } from 'lucide-react';
import { API_URL } from '../../api';
import { stripHtml } from '../../utils';

export default function WritePostModal({ postForm, setPostForm, isSubmitting, onClose, onSubmit }) {
  const [postBookSearch, setPostBookSearch] = useState('');
  const [postBookResults, setPostBookResults] = useState([]);
  const [postSelectedBook, setPostSelectedBook] = useState(null);
  const [isSearchingPostBook, setIsSearchingPostBook] = useState(false);
  const postSearchTimer = useRef(null);

  const searchPostBook = (query) => {
    if (postSearchTimer.current) clearTimeout(postSearchTimer.current);
    if (!query.trim()) { setPostBookResults([]); return; }
    postSearchTimer.current = setTimeout(async () => {
      setIsSearchingPostBook(true);
      try {
        const res = await fetch(`${API_URL}/api/books/search?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        setPostBookResults((data.items || []).slice(0, 5));
      } catch {}
      finally { setIsSearchingPostBook(false); }
    }, 320);
  };

  const handleClose = () => {
    setPostSelectedBook(null);
    setPostBookResults([]);
    setPostBookSearch('');
    onClose();
  };

  const handleSubmit = () => {
    onSubmit(postSelectedBook ? { ...postSelectedBook, title: stripHtml(postSelectedBook.title) } : null);
    setPostSelectedBook(null);
    setPostBookResults([]);
    setPostBookSearch('');
  };

  return (
    <div className="modal-backdrop overflow-y-auto" onClick={handleClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-content relative my-auto"
        style={{ maxWidth: '560px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div>
            <p style={{ fontSize: '9px', color: '#8C6B42', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>지식 나누기 광장</p>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em' }}>글쓰기</h2>
          </div>
          <button onClick={handleClose} style={{ background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.12)', width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          <div>
            <label className="form-label">제목</label>
            <input className="form-input" style={{ color: '#1C140E' }} placeholder="어떤 이야기를 나누고 싶으신가요?" value={postForm.title} onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} />
          </div>

          <div>
            <label className="form-label">관련 책 검색 (선택)</label>
            {!postSelectedBook && (
              <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 600, marginBottom: '0.5rem' }}>
                직접 고르지 않아도 괜찮아요 — 등록 후 AI가 내용을 보고 책을 추정해드려요.
              </p>
            )}
            {postSelectedBook ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'linear-gradient(135deg, rgba(140,107,66,0.08), rgba(196,148,86,0.06))', border: '1px solid rgba(140,107,66,0.25)', borderRadius: '0.875rem' }}>
                {postSelectedBook.image && <img src={postSelectedBook.image} alt="" style={{ width: '2.75rem', height: '3.75rem', objectFit: 'cover', borderRadius: '4px', flexShrink: 0, boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '9px', color: '#8C6B42', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>선택된 책</p>
                  <p style={{ fontWeight: 800, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{stripHtml(postSelectedBook.title)}</p>
                  <p style={{ fontSize: '0.75rem', color: '#9E8D7A', fontWeight: 600 }}>{postSelectedBook.author}</p>
                </div>
                <button onClick={() => { setPostSelectedBook(null); setPostBookSearch(''); }} style={{ background: 'rgba(139,107,66,0.1)', border: '1px solid rgba(139,107,66,0.15)', width: '1.75rem', height: '1.75rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A', flexShrink: 0 }}><X size={12} /></button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={14} />
                <input className="form-input" style={{ color: '#1C140E', paddingLeft: '2.5rem' }} placeholder="책 제목이나 저자를 검색하세요" value={postBookSearch} onChange={(e) => { setPostBookSearch(e.target.value); searchPostBook(e.target.value); }} />
                {isSearchingPostBook && <Loader2 style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={14} className="animate-spin" />}
                {postBookResults.length > 0 && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#FEFCF9', border: '1px solid rgba(139,107,66,0.15)', borderRadius: '0.875rem', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden' }}>
                    {postBookResults.map((book, i) => (
                      <div key={i} onClick={() => { setPostSelectedBook(book); setPostForm(p => ({ ...p, book_title: stripHtml(book.title) })); setPostBookResults([]); setPostBookSearch(''); }} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 1rem', cursor: 'pointer', borderBottom: i < postBookResults.length - 1 ? '1px solid rgba(139,107,66,0.08)' : 'none', background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(140,107,66,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {book.image && <img src={book.image} alt="" style={{ width: '2rem', height: '2.75rem', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }} />}
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripHtml(book.title)}</p>
                          <p style={{ fontSize: '11px', color: '#9E8D7A' }}>{book.author}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="form-label">내용</label>
            <textarea
              className="form-input"
              style={{ minHeight: '10rem', resize: 'vertical', color: '#1C140E', lineHeight: 1.65, fontFamily: 'inherit' }}
              placeholder="내용을 입력하세요"
              value={postForm.content}
              onChange={e => setPostForm(p => ({ ...p, content: e.target.value }))}
            />
          </div>

          <button onClick={handleSubmit} disabled={isSubmitting} className="premium-button disabled:opacity-50" style={{ width: '100%', padding: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            <span>게시하기</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
