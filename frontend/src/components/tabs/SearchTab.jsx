import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, Loader2 } from 'lucide-react';
import { stripHtml } from '../../utils';
import { hexColors } from '../../constants';

export default function SearchTab({ searchResults, searchQuery, isSearching, onBookClick, hasMore, isFetchingMore, onLoadMore }) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) onLoadMore?.();
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', marginTop: '0.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 160px)', gap: '1.75rem 1rem', width: '100%', justifyContent: 'center' }}>
        {searchResults.map((book, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.055, duration: 0.35, ease: 'easeOut' }}
            onClick={() => onBookClick(book)}
            className="premium-card group"
            style={{ padding: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}
          >
            <div style={{ width: '100%', aspectRatio: '3/4', marginBottom: '0.875rem', overflow: 'hidden', borderRadius: '0.875rem', position: 'relative', boxShadow: '0 16px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(139,107,66,0.1)', background: '#EDE8E2' }}>
              {book.image ? (
                <img
                  src={book.image}
                  className="group-hover:scale-110 transition-transform duration-700"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  alt=""
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              <div style={{ display: book.image ? 'none' : 'flex', position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${hexColors[index % 10]}, ${hexColors[(index + 3) % 10]})`, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem' }}>
                <BookOpen size={24} color="rgba(255,255,255,0.8)" />
                <span style={{ fontSize: '10px', color: 'white', fontWeight: 700, textAlign: 'center', padding: '0 0.5rem', lineHeight: 1.3 }}>{stripHtml(book.title)}</span>
              </div>
              <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-300" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,20,14,0.92) 0%, rgba(140,107,66,0.5) 55%, transparent 80%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0.75rem' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: 'white', letterSpacing: '0.12em', textTransform: 'uppercase' }}>자세히 보기</span>
                <div style={{ width: '20px', height: '1.5px', background: 'rgba(196,148,86,0.9)', marginTop: '4px', borderRadius: '9999px' }} />
              </div>
            </div>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <h4 style={{ fontWeight: 900, fontSize: '0.8125rem', lineHeight: 1.35, padding: '0 0.25rem', marginBottom: '0.25rem' }} className="line-clamp-2">{stripHtml(book.title)}</h4>
              <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 0.5rem' }}>{book.author}</p>
              {book.discount && <p style={{ fontSize: '10px', color: '#8C6B42', fontWeight: 800, marginTop: '3px' }}>{parseInt(book.discount).toLocaleString()}원</p>}
            </div>
          </motion.div>
        ))}
      </div>
      {searchResults.length > 0 && (
        <div ref={sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
          {isFetchingMore && <Loader2 size={20} className="animate-spin" style={{ color: '#8C6B42' }} />}
        </div>
      )}
      {searchResults.length === 0 && searchQuery && !isSearching && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: '2rem', background: 'rgba(139,107,66,0.04)', border: '1px solid rgba(139,107,66,0.1)', marginTop: '1rem' }}>
          <Search size={36} style={{ margin: '0 auto 1rem', color: '#BDB0A0' }} />
          <p style={{ color: '#9E8D7A', fontWeight: 700 }}>검색 결과가 없습니다.</p>
          <p style={{ color: '#BDB0A0', fontSize: '0.8125rem', marginTop: '0.375rem' }}>다른 키워드로 검색해보세요.</p>
        </div>
      )}
      {searchResults.length === 0 && !searchQuery && !isSearching && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <Search size={48} style={{ margin: '0 auto 1rem', color: '#9E8D7A' }} />
          <p style={{ color: '#BDB0A0', fontWeight: 700 }}>읽고 싶은 책을 검색해보세요</p>
        </div>
      )}
    </motion.div>
  );
}
