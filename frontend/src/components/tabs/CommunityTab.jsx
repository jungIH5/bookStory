import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, BookOpen, Heart, MessageCircle, Plus, Loader2, Trophy } from 'lucide-react';
import { renderMarkdown, formatReadingTime } from '../../utils';
import { API_URL } from '../../api';

export default function CommunityTab({ user, communityPosts, hasMore, isFetchingMore, onOpenPost, onLikePost, onWritePost, onLoadMore }) {
  const [activeView, setActiveView] = useState('posts');
  const [rankingView, setRankingView] = useState('books');
  const [leaderboard, setLeaderboard] = useState([]);
  const [isFetchingLeaderboard, setIsFetchingLeaderboard] = useState(false);

  useEffect(() => {
    if (activeView === 'ranking' && leaderboard.length === 0) {
      fetchLeaderboard();
    }
  }, [activeView]);

  const fetchLeaderboard = async () => {
    setIsFetchingLeaderboard(true);
    try {
      const res = await fetch(`${API_URL}/api/reading/leaderboard`);
      const data = await res.json();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch {} finally { setIsFetchingLeaderboard(false); }
  };

  const medalColor = (rank) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#9E8D7A';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.625rem', letterSpacing: '-0.03em' }}>
            <MessageSquare style={{ color: '#8C6B42' }} size={28} />
            지식 나눔 광장
          </h2>
          <p style={{ color: '#9E8D7A', fontWeight: 700, fontSize: '0.875rem' }}>책을 통해 더 넓은 세상을 만나는 곳입니다.</p>
        </div>
        {activeView === 'posts' && (
          <button onClick={onWritePost} style={{ padding: '0.625rem 1.25rem', background: 'rgba(139,107,66,0.07)', border: '1px solid rgba(139,107,66,0.15)', borderRadius: '0.75rem', fontSize: '0.8125rem', fontWeight: 800, color: '#7B6B55', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', transition: 'all 0.2s ease', flexShrink: 0 }}>
            <Plus size={16} />
            글쓰기
          </button>
        )}
      </div>

      {/* 탭 토글 */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { id: 'posts', label: '게시물', icon: <MessageSquare size={13} /> },
          { id: 'ranking', label: '독서 순위', icon: <Trophy size={13} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 800,
              cursor: 'pointer', transition: 'all 0.2s ease',
              background: activeView === tab.id ? 'rgba(140,107,66,0.12)' : 'transparent',
              border: `1px solid ${activeView === tab.id ? 'rgba(140,107,66,0.3)' : 'rgba(139,107,66,0.12)'}`,
              color: activeView === tab.id ? '#8C6B42' : '#9E8D7A',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 게시물 뷰 */}
      {activeView === 'posts' && (
        <>
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

          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '1.5rem' }}>
              <button
                onClick={onLoadMore}
                disabled={isFetchingMore}
                style={{ padding: '0.625rem 2rem', background: 'rgba(139,107,66,0.07)', border: '1px solid rgba(139,107,66,0.18)', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 800, color: '#7B6B55', cursor: isFetchingMore ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s ease', opacity: isFetchingMore ? 0.6 : 1 }}
              >
                {isFetchingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                {isFetchingMore ? '불러오는 중...' : '더 보기'}
              </button>
            </div>
          )}
        </>
      )}

      {/* 순위 뷰 */}
      {activeView === 'ranking' && (
        <div>
          {/* 책 수 / 독서 시간 서브탭 */}
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem' }}>
            {[
              { id: 'books', label: '책 수 순위' },
              { id: 'time', label: '독서 시간 순위' },
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setRankingView(sub.id)}
                style={{
                  padding: '0.4rem 1rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 800,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  background: rankingView === sub.id ? 'rgba(140,107,66,0.14)' : 'transparent',
                  border: `1px solid ${rankingView === sub.id ? 'rgba(140,107,66,0.35)' : 'rgba(139,107,66,0.12)'}`,
                  color: rankingView === sub.id ? '#8C6B42' : '#9E8D7A',
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {isFetchingLeaderboard ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
              <Loader2 className="animate-spin" size={28} style={{ color: '#8C6B42' }} />
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#BDB0A0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Trophy size={32} style={{ opacity: 0.4 }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>아직 순위 데이터가 없습니다.</p>
            </div>
          ) : (() => {
            const sorted = [...leaderboard].sort((a, b) =>
              rankingView === 'books'
                ? b.books_count - a.books_count || b.total_seconds - a.total_seconds
                : b.total_seconds - a.total_seconds || b.books_count - a.books_count
            );
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sorted.map((entry, idx) => {
                  const rank = idx + 1;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '1rem 1.25rem',
                        background: rank <= 3 ? `rgba(${rank === 1 ? '255,215,0' : rank === 2 ? '192,192,192' : '205,127,50'},0.06)` : 'rgba(139,107,66,0.03)',
                        border: `1px solid ${rank <= 3 ? `rgba(${rank === 1 ? '255,215,0' : rank === 2 ? '192,192,192' : '205,127,50'},0.2)` : 'rgba(139,107,66,0.1)'}`,
                        borderRadius: '0.875rem',
                      }}
                    >
                      <div style={{
                        width: '2rem', height: '2rem', borderRadius: '9999px', flexShrink: 0,
                        background: rank <= 3 ? `rgba(${rank === 1 ? '255,215,0' : rank === 2 ? '192,192,192' : '205,127,50'},0.15)` : 'rgba(139,107,66,0.08)',
                        border: `1px solid ${medalColor(rank)}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 900, color: rank <= 3 ? medalColor(rank) : '#9E8D7A',
                      }}>
                        {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : rank}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 900, fontSize: '0.9375rem', color: '#1C140E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.name}
                          {user?.id && parseInt(user.id) === entry.id && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '9px', fontWeight: 900, color: '#8C6B42', background: 'rgba(140,107,66,0.1)', border: '1px solid rgba(140,107,66,0.2)', padding: '1px 6px', borderRadius: '9999px', letterSpacing: '0.05em' }}>나</span>
                          )}
                        </p>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {rankingView === 'books' ? (
                          <>
                            <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700, marginBottom: '1px' }}>읽은 책</p>
                            <p style={{ fontSize: '1.125rem', fontWeight: 900, color: '#1C140E' }}>{entry.books_count}권</p>
                          </>
                        ) : (
                          <>
                            <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700, marginBottom: '1px' }}>독서 시간</p>
                            <p style={{ fontSize: '1.125rem', fontWeight: 900, color: '#8C6B42' }}>{formatReadingTime(entry.total_seconds)}</p>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </motion.div>
  );
}
