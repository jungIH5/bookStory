import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { API_URL } from '../../api';

export default function AdminTab({ user }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    if (!user?.token) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        setUsers(await res.json());
      } else {
        setError('유저 목록을 불러오지 못했습니다.');
      }
    } catch {
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [user?.token]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} style={{ color: '#8C6B42' }} />
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 900, color: '#1C140E' }}>가입 유저 목록</h3>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#9E8D7A' }}>{users.length}명</span>
        </div>
        <button onClick={fetchUsers} disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '11px', fontWeight: 800, color: '#8C6B42', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.2)', borderRadius: '9999px', padding: '0.4rem 0.875rem', cursor: 'pointer' }}>
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          새로고침
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.875rem', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'rgba(140,107,66,0.06)', borderBottom: '1px solid rgba(139,107,66,0.12)' }}>
                {['ID', '이름', '성별', '나이', '지역', '이메일', '가입경로', '통계공개', '귓속말', '관리자', '가입일'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '10px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} style={{ padding: '2.5rem', textAlign: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: '#8C6B42' }} /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: '2.5rem', textAlign: 'center', color: '#BDB0A0', fontWeight: 600 }}>가입된 유저가 없습니다.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(139,107,66,0.08)', background: u.is_admin ? 'rgba(196,148,86,0.06)' : 'transparent' }}>
                  <td style={{ padding: '0.625rem 1rem', color: '#9E8D7A' }}>{u.id}</td>
                  <td style={{ padding: '0.625rem 1rem', fontWeight: 800, color: '#1C140E' }}>{u.name}</td>
                  <td style={{ padding: '0.625rem 1rem', color: '#5C4F42' }}>{u.gender || '-'}</td>
                  <td style={{ padding: '0.625rem 1rem', color: '#5C4F42' }}>{u.age ?? '-'}</td>
                  <td style={{ padding: '0.625rem 1rem', color: '#5C4F42' }}>{u.location || '-'}</td>
                  <td style={{ padding: '0.625rem 1rem', color: '#5C4F42' }}>{u.email || '-'}</td>
                  <td style={{ padding: '0.625rem 1rem', color: '#5C4F42' }}>{u.oauth_provider || '일반'}</td>
                  <td style={{ padding: '0.625rem 1rem' }}>{u.stats_public ? '공개' : '비공개'}</td>
                  <td style={{ padding: '0.625rem 1rem' }}>{u.allow_whisper === false ? '거부' : '허용'}</td>
                  <td style={{ padding: '0.625rem 1rem' }}>{u.is_admin ? <span style={{ color: '#8C6B42', fontWeight: 900 }}>✓</span> : ''}</td>
                  <td style={{ padding: '0.625rem 1rem', color: '#9E8D7A', whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
