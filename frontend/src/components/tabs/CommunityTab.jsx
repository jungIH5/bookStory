import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, BookOpen, Heart, MessageCircle, Plus, Loader2, Trophy } from 'lucide-react';
import { formatReadingTime } from '../../utils';
import { API_URL } from '../../api';

export default function CommunityTab({ user, communityPosts, hasMore, isFetchingMore, onOpenPost, onLikePost, onWritePost, onLoadMore, onOpenUserLibrary }) {
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
    return '#8A7460';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.625rem', letterSpacing: '-0.03em' }}>
            <span className="cute-float" style={{ display: 'inline-block', fontSize: '1.5rem' }}>💌</span>
            지식 나눔 광장
          </h2>
          <p style={{ color: '#8A7460', fontWeight: 700, fontSize: '0.875rem' }}>책을 통해 더 넓은 세상을 만나는 곳입니다.</p>
        </div>
        {activeView === 'posts' && (
          <button onClick={onWritePost} className="cute-pill-button" style={{ padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg, #8B5A2B, #D2914B)', fontSize: '0.8125rem', fontWeight: 800, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
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
              background: activeView === tab.id ? 'rgba(139, 90, 43,0.12)' : 'transparent',
              border: `1px solid ${activeView === tab.id ? 'rgba(139, 90, 43,0.3)' : 'rgba(139, 90, 43,0.12)'}`,
              color: activeView === tab.id ? '#8B5A2B' : '#8A7460',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {communityPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group sticker-card"
                onClick={() => onOpenPost(post)}
                style={{ position: 'relative', padding: '1rem 1.125rem', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  {/* 분류 */}
                  <span className="sticker-badge" style={{ fontSize: '8px', flexShrink: 0 }}>
                    💬 General
                  </span>

                  {/* 제목 + 책 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 className="group-hover:text-amber-700 transition-colors" style={{ fontSize: '0.9375rem', fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</h3>
                      {post.book_title && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '2px 8px 2px 6px', background: 'rgba(139, 90, 43,0.08)', border: '1px solid rgba(139, 90, 43,0.15)', borderRadius: '6px', flexShrink: 0 }}>
                          <BookOpen size={9} style={{ color: '#8B5A2B' }} />
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#8B5A2B', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.book_title}</span>
                          {post.book_tag_source === 'ai' && !post.book_tag_confirmed && (
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#D2914B' }}>AI 추정</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 글쓴이 */}
                  <div
                    onClick={e => { e.stopPropagation(); if (post.user_id && onOpenUserLibrary) onOpenUserLibrary(post.user_id, post.author); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0, cursor: post.user_id ? 'pointer' : 'default' }}
                  >
                    <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '9999px', background: 'linear-gradient(135deg, #8B5A2B, #D2914B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '9px', overflow: 'hidden' }}>
                      {post.author_image ? <img src={post.author_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (post.author || '?')[0]}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#6E5A45', fontWeight: 700, textDecoration: post.user_id ? 'underline' : 'none', textUnderlineOffset: '2px', textDecorationColor: 'rgba(139, 90, 43,0.3)' }}>
                      {post.author || '익명'}
                    </span>
                  </div>

                  {/* 좋아요 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onLikePost(post.id); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, color: post.liked ? '#fb7185' : '#8A7460', cursor: 'pointer', background: 'none', border: 'none', flexShrink: 0, transition: 'color 0.2s ease' }}
                    className="hover:text-rose-400"
                  >
                    <Heart size={13} fill={post.liked ? '#fb7185' : 'none'} />
                    {post.likes || 0}
                  </button>

                  {/* 댓글 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, color: '#8A7460', flexShrink: 0 }}>
                    <MessageCircle size={13} />
                    {post.comments || 0}
                  </div>
                </div>
              </motion.div>
            ))}
            {communityPosts.length === 0 && (
              <div className="blob-card" style={{ textAlign: 'center', padding: '4rem 0', color: '#C4AD91', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <span className="cute-float" style={{ fontSize: '2.5rem' }}>💌</span>
                <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>아직 게시물이 없습니다. 첫 글을 작성해보세요!</p>
              </div>
            )}
          </div>

          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '1.5rem' }}>
              <button
                onClick={onLoadMore}
                disabled={isFetchingMore}
                style={{ padding: '0.625rem 2rem', background: 'rgba(139, 90, 43,0.07)', border: '1px solid rgba(139, 90, 43,0.18)', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 800, color: '#6E5A45', cursor: isFetchingMore ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s ease', opacity: isFetchingMore ? 0.6 : 1 }}
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
                  background: rankingView === sub.id ? 'rgba(139, 90, 43,0.14)' : 'transparent',
                  border: `1px solid ${rankingView === sub.id ? 'rgba(139, 90, 43,0.35)' : 'rgba(139, 90, 43,0.12)'}`,
                  color: rankingView === sub.id ? '#8B5A2B' : '#8A7460',
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {isFetchingLeaderboard ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
              <Loader2 className="animate-spin" size={28} style={{ color: '#8B5A2B' }} />
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#C4AD91', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
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
                        background: rank <= 3 ? `rgba(${rank === 1 ? '255,215,0' : rank === 2 ? '192,192,192' : '205,127,50'},0.08)` : '#FBF6EC',
                        border: `2px solid ${rank <= 3 ? `rgba(${rank === 1 ? '255,215,0' : rank === 2 ? '192,192,192' : '205,127,50'},0.3)` : 'rgba(139, 90, 43,0.12)'}`,
                        borderRadius: '1.5rem',
                        boxShadow: rank <= 3 ? '3px 4px 0 rgba(139, 90, 43,0.1)' : 'none',
                      }}
                    >
                      <div style={{
                        width: '2rem', height: '2rem', borderRadius: '9999px', flexShrink: 0,
                        background: rank <= 3 ? `rgba(${rank === 1 ? '255,215,0' : rank === 2 ? '192,192,192' : '205,127,50'},0.15)` : 'rgba(139, 90, 43,0.08)',
                        border: `1px solid ${medalColor(rank)}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 900, color: rank <= 3 ? medalColor(rank) : '#8A7460',
                      }}>
                        {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : rank}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          onClick={() => onOpenUserLibrary && onOpenUserLibrary(entry.id, entry.name)}
                          style={{ fontWeight: 900, fontSize: '0.9375rem', color: '#2B1B0E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(139, 90, 43,0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                        >
                          {entry.name}
                          {user?.id && parseInt(user.id) === entry.id && (
                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#8B5A2B', background: 'rgba(139, 90, 43,0.1)', border: '1px solid rgba(139, 90, 43,0.2)', padding: '1px 6px', borderRadius: '9999px', letterSpacing: '0.05em' }}>나</span>
                          )}
                        </p>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {rankingView === 'books' ? (
                          <>
                            <p style={{ fontSize: '11px', color: '#8A7460', fontWeight: 700, marginBottom: '1px' }}>읽은 책</p>
                            <p style={{ fontSize: '1.125rem', fontWeight: 900, color: '#2B1B0E' }}>{entry.books_count}권</p>
                          </>
                        ) : (
                          <>
                            <p style={{ fontSize: '11px', color: '#8A7460', fontWeight: 700, marginBottom: '1px' }}>독서 시간</p>
                            <p style={{ fontSize: '1.125rem', fontWeight: 900, color: '#8B5A2B' }}>{formatReadingTime(entry.total_seconds)}</p>
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
