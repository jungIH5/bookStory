import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, BookOpen, Heart, MessageCircle, Plus } from 'lucide-react';
import { renderMarkdown } from '../../utils';

export default function CommunityTab({ user, communityPosts, onOpenPost, onLikePost, onWritePost }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.625rem', letterSpacing: '-0.03em' }}>
            <MessageSquare style={{ color: '#8C6B42' }} size={28} />
            지식 나눔 광장
          </h2>
          <p style={{ color: '#9E8D7A', fontWeight: 700, fontSize: '0.875rem' }}>책을 통해 더 넓은 세상을 만나는 곳입니다.</p>
        </div>
        <button onClick={onWritePost} style={{ padding: '0.625rem 1.25rem', background: 'rgba(139,107,66,0.07)', border: '1px solid rgba(139,107,66,0.15)', borderRadius: '0.75rem', fontSize: '0.8125rem', fontWeight: 800, color: '#7B6B55', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', transition: 'all 0.2s ease', flexShrink: 0 }}>
          <Plus size={16} />
          글쓰기
        </button>
      </div>

      <div style={{ borderTop: '1px solid rgba(139,107,66,0.1)' }}>
        {communityPosts.map((post) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="group"
            onClick={() => onOpenPost(post)}
            style={{ position: 'relative', padding: '1.75rem 0', borderBottom: '1px solid rgba(139,107,66,0.1)', cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2px', background: 'linear-gradient(to bottom, #8C6B42, #C49456)', opacity: 0, borderRadius: '0 2px 2px 0', transition: 'opacity 0.2s ease' }} className="group-hover:opacity-100" />
            <div style={{ paddingLeft: '0.75rem' }}>
              {post.book_title && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', padding: '4px 12px 4px 8px', background: 'linear-gradient(135deg, rgba(140,107,66,0.1), rgba(196,148,86,0.08))', border: '1px solid rgba(140,107,66,0.2)', borderRadius: '8px' }}>
                  <BookOpen size={11} style={{ color: '#8C6B42', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#8C6B42' }}>{post.book_title}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                <span style={{ fontSize: '9px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(140,107,66,0.1)', border: '1px solid rgba(140,107,66,0.2)', padding: '2px 8px', borderRadius: '6px' }}>General</span>
              </div>
              <h3 className="group-hover:text-amber-700 transition-colors" style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '0.5rem', lineHeight: 1.3, letterSpacing: '-0.01em' }}>{post.title}</h3>
              <p style={{ color: '#9E8D7A', lineHeight: 1.6, fontSize: '0.875rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <button onClick={(e) => { e.stopPropagation(); onLikePost(post.id); }} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, color: post.liked ? '#fb7185' : '#9E8D7A', cursor: 'pointer', background: 'none', border: 'none', transition: 'color 0.2s ease' }} className="hover:text-rose-400">
                    <Heart size={14} fill={post.liked ? '#fb7185' : 'none'} />
                    {post.likes || 0}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onOpenPost(post); }} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, color: '#9E8D7A', cursor: 'pointer', background: 'none', border: 'none', transition: 'color 0.2s ease' }} className="hover:text-sky-400">
                    <MessageCircle size={14} />
                    {post.comments || 0}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.75rem' }}>
                  <div style={{ width: '1.625rem', height: '1.625rem', borderRadius: '9999px', background: 'linear-gradient(135deg, #8C6B42, #C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '9px' }}>
                    {(post.author || '?')[0]}
                  </div>
                  <span style={{ color: '#7B6B55', fontWeight: 700 }}>{post.author || '익명'}</span>
                  <span style={{ color: '#9E8D7A' }}>·</span>
                  <span style={{ color: '#BDB0A0', fontSize: '11px' }}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {communityPosts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#BDB0A0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <MessageSquare size={32} style={{ opacity: 0.4 }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>아직 게시물이 없습니다. 첫 글을 작성해보세요!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
