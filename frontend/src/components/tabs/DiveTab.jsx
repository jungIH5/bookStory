import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Plus, Clock, Trophy, Loader2, Calendar, Waves } from 'lucide-react';
import { formatReadingTime } from '../../utils';
import { API_URL } from '../../api';

export default function DiveTab({ user, diveRooms, isFetchingRooms, onCreateRoom, onOpenRoom, onOpenUserLibrary }) {
  const [activeView, setActiveView] = useState('rooms');
  const [rankingView, setRankingView] = useState('books');
  const [leaderboard, setLeaderboard] = useState([]);
  const [isFetchingLeaderboard, setIsFetchingLeaderboard] = useState(false);

  useEffect(() => {
    if (activeView === 'ranking' && leaderboard.length === 0) {
      setIsFetchingLeaderboard(true);
      fetch(`${API_URL}/api/reading/leaderboard`)
        .then(r => r.json()).then(d => setLeaderboard(Array.isArray(d) ? d : []))
        .catch(() => {}).finally(() => setIsFetchingLeaderboard(false));
    }
  }, [activeView]);

  const medalColor = r => r === 1 ? '#FFD700' : r === 2 ? '#C0C0C0' : r === 3 ? '#CD7F32' : '#8F87B8';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.625rem', letterSpacing: '-0.03em' }}>
            <span className="cute-float" style={{ display: 'inline-block', fontSize: '1.5rem' }}>🌊</span>
            독서모임
          </h2>
          <p style={{ color: '#8F87B8', fontWeight: 700, fontSize: '0.875rem' }}>함께 읽고 이야기 나누는 실시간 독서 공간입니다.</p>
        </div>
        {activeView === 'rooms' && user && (
          <button
            onClick={onCreateRoom}
            className="cute-pill-button"
            style={{ padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg, #6C5CE7, #A78BFA)', fontSize: '0.8125rem', fontWeight: 800, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}
          >
            <Plus size={16} />
            방 개설
          </button>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { id: 'rooms', label: '모임 목록', icon: <Waves size={13} /> },
          { id: 'ranking', label: '독서 순위', icon: <Trophy size={13} /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveView(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease', background: activeView === tab.id ? 'rgba(108, 92, 231,0.12)' : 'transparent', border: `2px solid ${activeView === tab.id ? 'rgba(108, 92, 231,0.3)' : 'rgba(108, 92, 231,0.12)'}`, color: activeView === tab.id ? '#6C5CE7' : '#8F87B8' }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* 모임 목록 */}
      {activeView === 'rooms' && (
        <>
          {isFetchingRooms ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
              <Loader2 className="animate-spin" size={28} style={{ color: '#6C5CE7' }} />
            </div>
          ) : diveRooms.length === 0 ? (
            <div className="blob-card" style={{ textAlign: 'center', padding: '5rem 2rem', color: '#C7C2E0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <span className="cute-float" style={{ fontSize: '2.5rem' }}>🌊</span>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700 }}>개설된 방이 없습니다.</p>
              {user && <p style={{ fontSize: '0.8125rem' }}>첫 번째 독서 모임을 만들어보세요!</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {diveRooms.map((room, idx) => (
                <RoomCard key={room.id} room={room} idx={idx} user={user} onOpen={onOpenRoom} />
              ))}
            </div>
          )}
        </>
      )}

      {/* 독서 순위 */}
      {activeView === 'ranking' && (
        <div>
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem' }}>
            {[{ id: 'books', label: '책 수 순위' }, { id: 'time', label: '독서 시간 순위' }].map(sub => (
              <button key={sub.id} onClick={() => setRankingView(sub.id)} style={{ padding: '0.4rem 1rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease', background: rankingView === sub.id ? 'rgba(108, 92, 231,0.14)' : 'transparent', border: `1px solid ${rankingView === sub.id ? 'rgba(108, 92, 231,0.35)' : 'rgba(108, 92, 231,0.12)'}`, color: rankingView === sub.id ? '#6C5CE7' : '#8F87B8' }}>
                {sub.label}
              </button>
            ))}
          </div>
          {isFetchingLeaderboard ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
              <Loader2 className="animate-spin" size={28} style={{ color: '#6C5CE7' }} />
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#C7C2E0' }}>
              <Trophy size={32} style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
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
                    <motion.div key={entry.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: rank <= 3 ? `rgba(${rank===1?'255,215,0':rank===2?'192,192,192':'205,127,50'},0.08)` : '#FDFCFF', border: `2px solid ${rank<=3?`rgba(${rank===1?'255,215,0':rank===2?'192,192,192':'205,127,50'},0.3)`:'rgba(108, 92, 231,0.12)'}`, borderRadius: '1.5rem', boxShadow: rank <= 3 ? '3px 4px 0 rgba(108, 92, 231,0.1)' : 'none' }}>
                      <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', flexShrink: 0, background: rank<=3?`rgba(${rank===1?'255,215,0':rank===2?'192,192,192':'205,127,50'},0.15)`:'rgba(108, 92, 231,0.08)', border: `1px solid ${medalColor(rank)}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, color: rank<=3?medalColor(rank):'#8F87B8' }}>
                        {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p onClick={() => onOpenUserLibrary && onOpenUserLibrary(entry.id, entry.name)} style={{ fontWeight: 900, fontSize: '0.9375rem', color: '#241B45', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(108, 92, 231,0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          {entry.name}
                          {user?.id && parseInt(user.id) === entry.id && <span style={{ fontSize: '9px', fontWeight: 900, color: '#6C5CE7', background: 'rgba(108, 92, 231,0.1)', border: '1px solid rgba(108, 92, 231,0.2)', padding: '1px 6px', borderRadius: '9999px' }}>나</span>}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {rankingView === 'books' ? (
                          <><p style={{ fontSize: '11px', color: '#8F87B8', fontWeight: 700, marginBottom: '1px' }}>읽은 책</p><p style={{ fontSize: '1.125rem', fontWeight: 900, color: '#241B45' }}>{entry.books_count}권</p></>
                        ) : (
                          <><p style={{ fontSize: '11px', color: '#8F87B8', fontWeight: 700, marginBottom: '1px' }}>독서 시간</p><p style={{ fontSize: '1.125rem', fontWeight: 900, color: '#6C5CE7' }}>{formatReadingTime(entry.total_seconds)}</p></>
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

function RoomCard({ room, idx, user, onOpen }) {
  const now = new Date();
  const scheduledAt = new Date(room.scheduled_at);
  const diffMs = scheduledAt - now;
  const diffMin = Math.floor(diffMs / 60000);
  const isSoon = diffMs > 0 && diffMin < 60;
  const isOngoing = room.status === 'reading' || room.status === 'discussion';

  // 방장이 방을 열지 않아 상태가 'scheduled'에 그대로 남아있어도, 예정된 독서+토론 시간이
  // 이미 다 지났다면(자동 종료 sweep이 아직 안 돌았을 뿐) "예정"이 아니라 "시간 종료"로 보여준다.
  const discussionEnd = scheduledAt.getTime() + ((room.reading_minutes || 0) + (room.discussion_minutes || 0)) * 60000;
  const isTimeUp = room.status === 'scheduled' && Date.now() > discussionEnd;

  const statusMap = {
    scheduled: { label: '예정', color: '#8F87B8', bg: 'rgba(143, 135, 184,0.08)', border: 'rgba(143, 135, 184,0.2)' },
    reading: { label: '독서 중', color: '#A78BFA', bg: 'rgba(167, 139, 250,0.1)', border: 'rgba(167, 139, 250,0.3)' },
    discussion: { label: '토론 중', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
  };
  const badge = isTimeUp
    ? { label: '시간 종료', color: '#C7C2E0', bg: 'rgba(199, 194, 224,0.08)', border: 'rgba(199, 194, 224,0.2)' }
    : (statusMap[room.status] || statusMap.scheduled);

  const fmtTime = (dt) => {
    const d = new Date(dt);
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${mi}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      onClick={() => onOpen(room)}
      className="group sticker-card"
      style={{ display: 'flex', gap: '1rem', padding: '1rem 1.125rem', background: isOngoing ? '#F3F0FF' : '#FDFCFF', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
    >
      {isSoon && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #6C5CE7, #A78BFA)' }} />}

      {/* 책 표지 */}
      <div style={{ width: '48px', minWidth: '48px', height: '68px', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', flexShrink: 0, background: 'rgba(108, 92, 231,0.08)', border: '2px solid rgba(108, 92, 231,0.15)' }}>
        {room.book_image
          ? <img src={room.book_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={18} style={{ color: '#6C5CE7' }} /></div>}
      </div>

      {/* 정보 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <h3 className="group-hover:text-amber-700 transition-colors" style={{ fontWeight: 900, fontSize: '0.9375rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{room.title}</h3>
          <span className="sticker-badge" style={{ fontSize: '9px', background: badge.bg, color: badge.color, border: `2px solid ${badge.border}`, flexShrink: 0 }}>{badge.label}</span>
        </div>

        {room.book_title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
            <BookOpen size={10} style={{ color: '#6C5CE7', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: '#6C5CE7', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.book_title}</span>
          </div>
        )}

        <p style={{ fontSize: '11px', color: '#8F87B8', fontWeight: 700, marginBottom: '0.375rem' }}>방장: {room.host_name || '알 수 없음'}</p>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '10px', fontWeight: 700, color: isSoon ? '#A78BFA' : '#8F87B8' }}>
            <Calendar size={10} />
            {fmtTime(room.scheduled_at)}
            {isSoon && <span style={{ color: '#A78BFA', fontWeight: 900 }}>· 곧 시작!</span>}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '10px', fontWeight: 700, color: '#8F87B8' }}>
            <Clock size={10} />
            독서 {room.reading_minutes}분 + 토론 {room.discussion_minutes}분
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '10px', fontWeight: 700, color: (room.participant_count || 0) >= room.max_participants ? '#ef4444' : '#8F87B8' }}>
            <Users size={10} />
            {room.participant_count || 0}/{room.max_participants}명
          </span>
        </div>

        {room.notice && (
          <p style={{ fontSize: '10px', color: '#C7C2E0', fontWeight: 600, marginTop: '0.375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📌 {room.notice}
          </p>
        )}
      </div>
    </motion.div>
  );
}
