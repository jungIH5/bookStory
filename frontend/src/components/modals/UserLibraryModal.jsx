import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, Loader2, Library, Clock, BookMarked, UserPlus, UserCheck, UserX, Waves, Users, MessageSquare, UserCog, BookOpen, Shield, ShieldOff, UserMinus } from 'lucide-react';
import { stripHtml, formatReadingTime } from '../../utils';
import { API_URL } from '../../api';
import { hexColors } from '../../constants';

export default function UserLibraryModal({ userId, userName, currentUserId, token, friendRequests = [], onAcceptFriend, onRejectFriend, onClose, onEditProfile }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [stats, setStats] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [relation, setRelation] = useState({ is_following: false, is_blocked: false });
  const [relationLoading, setRelationLoading] = useState(false);
  const [hostedRooms, setHostedRooms] = useState([]);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followsLoading, setFollowsLoading] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [roomMessages, setRoomMessages] = useState({});
  const [loadingMsgs, setLoadingMsgs] = useState(null);
  const [activeTab, setActiveTab] = useState('books');

  const isMe = parseInt(currentUserId) === parseInt(userId);

  const tabs = isMe
    ? [
        { id: 'books', label: '독서', icon: <BookOpen size={12} /> },
        { id: 'rooms', label: '모임', icon: <Waves size={12} /> },
        { id: 'follows', label: '팔로우', icon: <Users size={12} /> },
      ]
    : [
        { id: 'books', label: '독서', icon: <BookOpen size={12} /> },
        { id: 'follows', label: '관계', icon: <Users size={12} /> },
      ];

  const fetchFriendStatus = useCallback(async () => {
    if (isMe || !token) return;
    try {
      const res = await fetch(`${API_URL}/api/friends/status/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriendStatus(await res.json());
    } catch {}
  }, [userId, token, isMe]);

  const fetchRelation = useCallback(async () => {
    if (isMe || !token) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/relation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRelation(await res.json());
    } catch {}
  }, [userId, token, isMe]);

  const fetchFollows = useCallback(async () => {
    if (!isMe) return;
    setFollowsLoading(true);
    try {
      const [fwRes, frRes] = await Promise.all([
        fetch(`${API_URL}/api/users/${userId}/following`),
        fetch(`${API_URL}/api/users/${userId}/followers`),
      ]);
      if (fwRes.ok) setFollowing(await fwRes.json());
      if (frRes.ok) setFollowers(await frRes.json());
    } catch {} finally { setFollowsLoading(false); }
  }, [userId, isMe]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [booksRes, statsRes, userRes] = await Promise.all([
          fetch(`${API_URL}/api/books/read?user_id=${userId}`),
          fetch(`${API_URL}/api/reading/stats/${userId}`),
          fetch(`${API_URL}/api/users/${userId}`),
        ]);
        const booksData = await booksRes.json();
        const statsData = await statsRes.json();
        setBooks(Array.isArray(booksData) ? booksData : []);
        setStats(statsData);
        if (userRes.ok) { const userData = await userRes.json(); setProfileImage(userData.profile_image || ''); }
      } catch {} finally { setLoading(false); }
    })();
    fetchFriendStatus();
    fetchRelation();
    if (isMe && token) {
      fetch(`${API_URL}/api/dive/rooms/hosted`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : []).then(d => setHostedRooms(Array.isArray(d) ? d : [])).catch(() => {});
      fetch(`${API_URL}/api/dive/rooms/joined`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : []).then(d => setJoinedRooms(Array.isArray(d) ? d : [])).catch(() => {});
      fetchFollows();
    }
  }, [userId, fetchFriendStatus, fetchRelation, fetchFollows]);

  const handleFriendAction = async () => {
    if (!token || friendLoading) return;
    setFriendLoading(true);
    try {
      if (!friendStatus || friendStatus.status === 'none') {
        const res = await fetch(`${API_URL}/api/friends/request`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ addressee_id: parseInt(userId) }),
        });
        if (res.ok) await fetchFriendStatus();
      } else if (friendStatus.status === 'pending' && !friendStatus.is_requester) {
        await fetch(`${API_URL}/api/friends/${friendStatus.id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        await fetchFriendStatus();
      } else {
        await fetch(`${API_URL}/api/friends/${friendStatus.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        setFriendStatus({ status: 'none' });
      }
    } finally { setFriendLoading(false); }
  };

  const handleFollowAction = async () => {
    if (!token || relationLoading) return;
    setRelationLoading(true);
    try {
      if (relation.is_following) {
        await fetch(`${API_URL}/api/users/${userId}/follow`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        setRelation(r => ({ ...r, is_following: false }));
      } else {
        await fetch(`${API_URL}/api/users/${userId}/follow`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        setRelation(r => ({ ...r, is_following: true }));
      }
    } finally { setRelationLoading(false); }
  };

  const handleBlockAction = async () => {
    if (!token || relationLoading) return;
    setRelationLoading(true);
    try {
      if (relation.is_blocked) {
        await fetch(`${API_URL}/api/users/${userId}/block`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        setRelation(r => ({ ...r, is_blocked: false }));
      } else {
        await fetch(`${API_URL}/api/users/${userId}/block`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        setRelation(r => ({ ...r, is_blocked: true, is_following: false }));
      }
    } finally { setRelationLoading(false); }
  };

  const handleUnfollowUser = async (targetId) => {
    if (!token) return;
    await fetch(`${API_URL}/api/users/${targetId}/follow`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setFollowing(prev => prev.filter(u => u.id !== targetId));
  };

  const handleToggleRoom = async (roomId) => {
    if (expandedRoom === roomId) { setExpandedRoom(null); return; }
    setExpandedRoom(roomId);
    if (!roomMessages[roomId] && token) {
      setLoadingMsgs(roomId);
      try {
        const res = await fetch(`${API_URL}/api/dive/rooms/${roomId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) { const msgs = await res.json(); setRoomMessages(prev => ({ ...prev, [roomId]: msgs })); }
      } catch {} finally { setLoadingMsgs(null); }
    }
  };

  const fmtAgo = (dt) => {
    const diff = Date.now() - new Date(dt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  };

  const reading = books.filter(b => b.status === 'reading');
  const finished = books.filter(b => b.status !== 'reading');

  const friendBtnLabel = () => {
    if (!friendStatus || friendStatus.status === 'none') return '친구 추가';
    if (friendStatus.status === 'accepted') return '친구';
    if (friendStatus.status === 'pending' && !friendStatus.is_requester) return '수락하기';
    return '요청 취소';
  };
  const friendBtnIcon = () => {
    if (!friendStatus || friendStatus.status === 'none') return <UserPlus size={12} />;
    if (friendStatus.status === 'accepted') return <UserCheck size={12} />;
    if (friendStatus.status === 'pending' && !friendStatus.is_requester) return <UserCheck size={12} />;
    return <UserX size={12} />;
  };
  const friendBtnStyle = () => {
    const base = { display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.875rem', borderRadius: '9999px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', border: '1px solid' };
    if (!friendStatus || friendStatus.status === 'none') return { ...base, background: 'rgba(140,107,66,0.1)', borderColor: 'rgba(140,107,66,0.3)', color: '#8C6B42' };
    if (friendStatus.status === 'accepted') return { ...base, background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)', color: '#16a34a' };
    if (friendStatus.status === 'pending' && !friendStatus.is_requester) return { ...base, background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.3)', color: '#2563eb' };
    return { ...base, background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' };
  };

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
        <div style={{ padding: '1.5rem 1.75rem 1.25rem', borderBottom: '1px solid rgba(139,107,66,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '9999px', background: 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '15px', flexShrink: 0, overflow: 'hidden' }}>
                {profileImage ? <img src={profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (userName || '?')[0]}
              </div>
              <div>
                <p style={{ fontWeight: 900, fontSize: '1.0625rem', color: '#1C140E' }}>{isMe ? '내 서재' : `${userName}님의 서재`}</p>
                <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700, marginTop: '2px' }}>
                  읽는 중 {reading.length}권 · 완독 {finished.length}권
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isMe && onEditProfile && (
                <button onClick={onEditProfile} title="프로필 수정" style={iconBtnStyle}>
                  <UserCog size={13} />
                </button>
              )}
              <button onClick={onClose} style={iconBtnStyle}><X size={14} /></button>
            </div>
          </div>

          {/* 통계 카드 */}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.875rem', background: 'rgba(140,107,66,0.06)', border: '1px solid rgba(140,107,66,0.14)', borderRadius: '0.75rem' }}>
              <BookMarked size={13} style={{ color: '#8C6B42', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '9px', color: '#9E8D7A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>완독</p>
                <p style={{ fontSize: '1rem', fontWeight: 900, color: '#1C140E', lineHeight: 1.2 }}>{stats?.books_count ?? finished.length}<span style={{ fontSize: '10px', color: '#9E8D7A', fontWeight: 700, marginLeft: '2px' }}>권</span></p>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.875rem', background: 'rgba(196,148,86,0.06)', border: '1px solid rgba(196,148,86,0.14)', borderRadius: '0.75rem' }}>
              <Clock size={13} style={{ color: '#C49456', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '9px', color: '#9E8D7A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>독서 시간</p>
                <p style={{ fontSize: '1rem', fontWeight: 900, color: '#1C140E', lineHeight: 1.2 }}>{stats ? formatReadingTime(stats.total_seconds) : '—'}</p>
              </div>
            </div>
          </div>

          {/* 탭 바 */}
          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '1rem', background: 'rgba(139,107,66,0.06)', borderRadius: '0.75rem', padding: '0.25rem' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                  padding: '0.5rem 0.75rem', borderRadius: '0.625rem', border: 'none',
                  fontSize: '11px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.18s',
                  background: activeTab === tab.id ? 'white' : 'transparent',
                  color: activeTab === tab.id ? '#8C6B42' : '#9E8D7A',
                  boxShadow: activeTab === tab.id ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 받은 친구 요청 (독서 탭에만, 본인) */}
        {activeTab === 'books' && friendRequests.length > 0 && (
          <div style={{ padding: '0.875rem 1.75rem', borderBottom: '1px solid rgba(139,107,66,0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ fontSize: '11px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>받은 친구 요청 {friendRequests.length}건</p>
            {friendRequests.map(req => (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.875rem', background: 'rgba(140,107,66,0.04)', border: '1px solid rgba(140,107,66,0.12)', borderRadius: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '9999px', background: 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 900, overflow: 'hidden' }}>
                    {req.requester_image ? <img src={req.requester_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (req.requester_name || '?')[0]}
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1C140E' }}>{req.requester_name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button onClick={() => onAcceptFriend?.(req.id)} style={{ padding: '0.3rem 0.75rem', background: 'rgba(140,107,66,0.1)', border: '1px solid rgba(140,107,66,0.25)', borderRadius: '9999px', fontSize: '11px', fontWeight: 800, color: '#8C6B42', cursor: 'pointer' }}>수락</button>
                  <button onClick={() => onRejectFriend?.(req.id)} style={{ padding: '0.3rem 0.75rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '9999px', fontSize: '11px', fontWeight: 800, color: '#dc2626', cursor: 'pointer' }}>거절</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 본문 */}
        <div style={{ padding: '1.25rem 1.75rem 1.75rem', overflowY: 'auto', maxHeight: '65vh', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ── 독서 탭 ── */}
          {activeTab === 'books' && (
            loading
              ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><Loader2 className="animate-spin" size={28} style={{ color: '#8C6B42' }} /></div>
              : books.length === 0
                ? <div style={{ textAlign: 'center', padding: '3rem 0', color: '#BDB0A0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <Library size={32} style={{ opacity: 0.4 }} />
                    <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>아직 서재에 책이 없습니다.</p>
                  </div>
                : <>
                    {reading.length > 0 && (
                      <Section title="읽는 중" books={reading} expandedId={expandedId} onToggle={setExpandedId} isMe={isMe} accentColor="#C49456" />
                    )}
                    {finished.length > 0 && (
                      <Section title="완독" books={finished} expandedId={expandedId} onToggle={setExpandedId} isMe={isMe} accentColor="#8C6B42" />
                    )}
                  </>
          )}

          {/* ── 모임 탭 (본인만) ── */}
          {activeTab === 'rooms' && isMe && (
            <>
              <RoomSection
                title="참여한 독서모임"
                accentColor="#22c55e"
                rooms={joinedRooms}
                expandedRoom={expandedRoom}
                roomMessages={roomMessages}
                loadingMsgs={loadingMsgs}
                onToggleRoom={handleToggleRoom}
                fmtAgo={fmtAgo}
              />
              <RoomSection
                title="개설한 독서모임"
                accentColor="#C49456"
                rooms={hostedRooms}
                expandedRoom={expandedRoom}
                roomMessages={roomMessages}
                loadingMsgs={loadingMsgs}
                onToggleRoom={handleToggleRoom}
                fmtAgo={fmtAgo}
              />
            </>
          )}

          {/* ── 팔로우 탭 (본인) ── */}
          {activeTab === 'follows' && isMe && (
            followsLoading
              ? <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}><Loader2 className="animate-spin" size={24} style={{ color: '#8C6B42' }} /></div>
              : <>
                  <FollowSection title="팔로잉" accentColor="#C49456" users={following} emptyText="팔로우한 사람이 없습니다.">
                    {(u) => (
                      <button onClick={() => handleUnfollowUser(u.id)} style={smallBtnStyle('#9E8D7A')}>
                        <UserMinus size={10} /> 언팔로우
                      </button>
                    )}
                  </FollowSection>
                  <FollowSection title="팔로워" accentColor="#8C6B42" users={followers} emptyText="팔로워가 없습니다." />
                </>
          )}

          {/* ── 관계 탭 (타인) ── */}
          {activeTab === 'follows' && !isMe && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <p style={{ fontSize: '11px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {userName}님과의 관계
              </p>

              {/* 친구 */}
              <div style={relationCardStyle}>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1C140E', marginBottom: '2px' }}>친구</p>
                  <p style={{ fontSize: '11px', color: '#9E8D7A' }}>친구 요청을 보내거나 수락합니다.</p>
                </div>
                <button onClick={handleFriendAction} disabled={friendLoading} style={friendBtnStyle()}>
                  {friendLoading ? <Loader2 size={11} className="animate-spin" /> : friendBtnIcon()}
                  {friendBtnLabel()}
                </button>
              </div>

              {/* 팔로우 */}
              <div style={relationCardStyle}>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1C140E', marginBottom: '2px' }}>팔로우</p>
                  <p style={{ fontSize: '11px', color: '#9E8D7A' }}>이 사람의 독서 활동을 팔로우합니다.</p>
                </div>
                <button onClick={handleFollowAction} disabled={relationLoading} style={smallBtnStyle(relation.is_following ? '#22c55e' : '#8C6B42')}>
                  {relationLoading ? <Loader2 size={10} className="animate-spin" /> : relation.is_following ? <UserCheck size={10} /> : <UserPlus size={10} />}
                  {relation.is_following ? '팔로잉' : '팔로우'}
                </button>
              </div>

              {/* 차단 */}
              <div style={{ ...relationCardStyle, borderColor: relation.is_blocked ? 'rgba(239,68,68,0.3)' : 'rgba(139,107,66,0.12)', background: relation.is_blocked ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1C140E', marginBottom: '2px' }}>차단</p>
                  <p style={{ fontSize: '11px', color: '#9E8D7A' }}>차단 시 귓속말·친구 요청이 차단됩니다.</p>
                </div>
                <button onClick={handleBlockAction} disabled={relationLoading} style={smallBtnStyle(relation.is_blocked ? '#dc2626' : '#9E8D7A')}>
                  {relationLoading ? <Loader2 size={10} className="animate-spin" /> : relation.is_blocked ? <ShieldOff size={10} /> : <Shield size={10} />}
                  {relation.is_blocked ? '차단됨' : '차단'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── 스타일 상수 ──────────────────────────────────────────────
const iconBtnStyle = {
  width: '2rem', height: '2rem', borderRadius: '9999px',
  background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: '#9E8D7A', flexShrink: 0,
};

const relationCardStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0.875rem 1rem', background: 'transparent',
  border: '1px solid rgba(139,107,66,0.12)', borderRadius: '0.875rem',
};

const smallBtnStyle = (color) => ({
  display: 'flex', alignItems: 'center', gap: '0.3rem',
  padding: '0.375rem 0.875rem', borderRadius: '9999px',
  fontSize: '11px', fontWeight: 800, cursor: 'pointer',
  background: `${color}15`, border: `1px solid ${color}40`, color,
  flexShrink: 0, marginLeft: '0.75rem',
});

// ── 팔로우 섹션 ──────────────────────────────────────────────
function FollowSection({ title, accentColor, users, emptyText, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ width: '3px', height: '14px', borderRadius: '9999px', background: accentColor }} />
        <span style={{ fontSize: '11px', fontWeight: 900, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#BDB0A0' }}>{users.length}명</span>
      </div>
      {users.length === 0
        ? <p style={{ fontSize: '0.8125rem', color: '#BDB0A0', fontWeight: 600 }}>{emptyText}</p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', background: 'rgba(140,107,66,0.04)', border: '1px solid rgba(140,107,66,0.1)', borderRadius: '0.75rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '9999px', background: 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 900, flexShrink: 0, overflow: 'hidden' }}>
                  {u.profile_image ? <img src={u.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.name || '?')[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1C140E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                  {u.location && <p style={{ fontSize: '10px', color: '#9E8D7A', fontWeight: 600 }}>{u.location}</p>}
                </div>
                {children?.(u)}
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ── 모임 섹션 ────────────────────────────────────────────────
function RoomSection({ title, accentColor, rooms, expandedRoom, roomMessages, loadingMsgs, onToggleRoom, fmtAgo }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <div style={{ width: '3px', height: '14px', borderRadius: '9999px', background: accentColor }} />
        <Waves size={12} style={{ color: accentColor }} />
        <span style={{ fontSize: '11px', fontWeight: 900, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#BDB0A0' }}>{rooms.length}건</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {rooms.length === 0 && (
          <p style={{ fontSize: '0.8125rem', color: '#BDB0A0', fontWeight: 600, padding: '0.25rem 0' }}>이력이 없습니다.</p>
        )}
        {rooms.map(room => {
          const isOpen = expandedRoom === room.id;
          const msgs = roomMessages[room.id] || [];
          const statusLabel = room.status === 'ended' ? '종료' : room.status === 'discussion' ? '토론 중' : room.status === 'reading' ? '독서 중' : '예정';
          return (
            <div key={room.id} style={{ border: '1px solid rgba(139,107,66,0.12)', borderRadius: '0.875rem', overflow: 'hidden' }}>
              <div
                onClick={() => onToggleRoom(room.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', cursor: 'pointer', background: isOpen ? 'rgba(140,107,66,0.06)' : 'transparent', transition: 'background 0.15s' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1C140E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.title}</p>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#9E8D7A', background: 'rgba(139,107,66,0.06)', border: '1px solid rgba(139,107,66,0.15)', padding: '1px 6px', borderRadius: '9999px', flexShrink: 0 }}>{statusLabel}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', color: '#9E8D7A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={10} />{fmtAgo(room.scheduled_at)}</span>
                    <span style={{ fontSize: '10px', color: '#9E8D7A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={10} />{room.participant_count}명</span>
                    {room.host_name && <span style={{ fontSize: '10px', color: '#9E8D7A', fontWeight: 700 }}>방장: {room.host_name}</span>}
                    <span style={{ fontSize: '10px', color: '#9E8D7A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MessageSquare size={10} />채팅 {msgs.length}건</span>
                  </div>
                </div>
                {isOpen ? <ChevronUp size={14} style={{ color: '#9E8D7A', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: '#9E8D7A', flexShrink: 0 }} />}
              </div>
              {isOpen && (
                <div style={{ borderTop: '1px solid rgba(139,107,66,0.08)', padding: '0.75rem 1rem', background: 'rgba(140,107,66,0.02)' }}>
                  {loadingMsgs === room.id
                    ? <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}><Loader2 size={16} className="animate-spin" style={{ color: '#8C6B42' }} /></div>
                    : msgs.length === 0
                      ? <p style={{ fontSize: '0.8125rem', color: '#BDB0A0', fontWeight: 600, textAlign: 'center' }}>채팅 내역이 없습니다.</p>
                      : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                          {msgs.map(m => (
                            <div key={m.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                              <div style={{ width: '18px', height: '18px', borderRadius: '9999px', background: m.is_ai ? 'linear-gradient(135deg,#C49456,#F59E0B)' : 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 900, flexShrink: 0, overflow: 'hidden' }}>
                                {m.is_ai ? 'AI' : m.user_image ? <img src={m.user_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.user_name || '?')[0]}
                              </div>
                              <div>
                                <span style={{ fontSize: '10px', fontWeight: 800, color: m.is_ai ? '#C49456' : '#8C6B42', marginRight: '0.25rem' }}>{m.is_ai ? 'AI' : m.user_name}</span>
                                <p style={{ fontSize: '0.8125rem', color: '#3D2D1E', lineHeight: 1.5, wordBreak: 'break-word' }}>{m.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 책 섹션 ──────────────────────────────────────────────────
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
          <BookCard key={book.id} book={book} idx={idx} isExpanded={expandedId === book.id} onToggle={() => onToggle(expandedId === book.id ? null : book.id)} isMe={isMe} />
        ))}
      </div>
    </div>
  );
}

function BookCard({ book, idx, isExpanded, onToggle, isMe }) {
  const title = stripHtml(book.title);
  const hasImpression = book.impression && (book.is_public || isMe);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
      style={{ borderRadius: '0.875rem', border: `1px solid ${isExpanded ? 'rgba(140,107,66,0.25)' : 'rgba(139,107,66,0.1)'}`, background: isExpanded ? 'rgba(140,107,66,0.04)' : 'transparent', overflow: 'hidden', transition: 'border-color 0.2s, background 0.2s' }}
    >
      <div onClick={hasImpression ? onToggle : undefined} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', cursor: hasImpression ? 'pointer' : 'default' }}>
        <div style={{ width: '42px', minWidth: '42px', height: '60px', borderRadius: '5px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', background: '#EDE8E2', flexShrink: 0 }}>
          {book.image
            ? <img src={book.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${hexColors[idx % 10]},${hexColors[(idx+2)%10]})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 900 }}>{title[0]}</span>
              </div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 900, fontSize: '0.875rem', color: '#1C140E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.25rem' }}>{title}</p>
          {book.author && <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700, marginBottom: '0.375rem' }}>{book.author}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {book.status === 'reading'
              ? <span style={{ fontSize: '9px', fontWeight: 900, color: '#C49456', background: 'rgba(196,148,86,0.1)', border: '1px solid rgba(196,148,86,0.3)', padding: '2px 7px', borderRadius: '9999px' }}>읽는 중</span>
              : <span style={{ fontSize: '9px', fontWeight: 900, color: '#8C6B42', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.2)', padding: '2px 7px', borderRadius: '9999px' }}>완독</span>}
            {book.impression && !book.is_public && isMe && <span style={{ fontSize: '9px', fontWeight: 700, color: '#BDB0A0' }}>🔒 비공개 감상</span>}
            {book.impression && book.is_public && <span style={{ fontSize: '9px', fontWeight: 700, color: '#9E8D7A' }}>감상 있음</span>}
          </div>
        </div>
        {hasImpression && <div style={{ flexShrink: 0, color: '#9E8D7A' }}>{isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</div>}
      </div>
      <AnimatePresence>
        {isExpanded && hasImpression && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
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
