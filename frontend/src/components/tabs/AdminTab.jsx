import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldOff, Loader2, RefreshCw, Search, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';
import { API_URL } from '../../api';

const SORTABLE = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '이름' },
  { key: 'gender', label: '성별' },
];

export default function AdminTab({ user }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name } | null
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingPermissionFor, setUpdatingPermissionFor] = useState(null);
  const [actionError, setActionError] = useState('');
  const searchTimer = useRef(null);

  const fetchUsers = async () => {
    if (!user?.token) return;
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ sort_by: sortBy, order });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`${API_URL}/api/admin/users?${params.toString()}`, {
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

  useEffect(() => { fetchUsers(); }, [user?.token, sortBy, order]);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(fetchUsers, 350);
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setOrder('asc');
    }
  };

  const handleTogglePermission = async (target) => {
    if (!user?.token || updatingPermissionFor) return;
    setUpdatingPermissionFor(target.id);
    setActionError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${target.id}/permission`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: !target.is_admin }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === target.id ? { ...u, is_admin: !target.is_admin } : u));
      } else {
        const err = await res.json().catch(() => ({}));
        setActionError(err.detail || '권한 변경에 실패했습니다.');
      }
    } finally {
      setUpdatingPermissionFor(null);
    }
  };

  const handleDelete = async (target) => {
    target = target || deleteTarget;
    if (!user?.token || !target || isDeleting) return;
    setIsDeleting(true);
    setActionError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== target.id));
        setDeleteTarget(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setActionError(err.detail || '탈퇴 처리에 실패했습니다.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const sortIcon = (key) => {
    if (sortBy !== key) return null;
    return order === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} style={{ color: '#6C5CE7' }} />
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 900, color: '#241B45' }}>가입 유저 목록</h3>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#8F87B8' }}>{users.length}명</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#C7C2E0' }} />
            <input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="이름 검색..."
              className="form-input"
              style={{ paddingLeft: '2rem', height: '2.25rem', fontSize: '0.8125rem', color: '#241B45', width: '160px' }}
            />
          </div>
          <button onClick={fetchUsers} disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '11px', fontWeight: 800, color: '#6C5CE7', background: 'rgba(108, 92, 231,0.08)', border: '1px solid rgba(108, 92, 231,0.2)', borderRadius: '9999px', padding: '0.4rem 0.875rem', cursor: 'pointer' }}>
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            새로고침
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.875rem', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {actionError && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.875rem', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', flexShrink: 0 }}><X size={13} /></button>
        </div>
      )}

      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'rgba(108, 92, 231,0.06)', borderBottom: '1px solid rgba(108, 92, 231,0.12)' }}>
                {SORTABLE.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)}
                    style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '10px', fontWeight: 900, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>{col.label}{sortIcon(col.key)}</span>
                  </th>
                ))}
                {['나이', '지역', '이메일', '가입경로', '통계공개', '귓속말', '관리자', '가입일', ''].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '10px', fontWeight: 900, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={12} style={{ padding: '2.5rem', textAlign: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: '#6C5CE7' }} /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={12} style={{ padding: '2.5rem', textAlign: 'center', color: '#C7C2E0', fontWeight: 600 }}>해당하는 유저가 없습니다.</td></tr>
              ) : users.map(u => {
                const isSelf = u.id === parseInt(user?.id);
                return (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(108, 92, 231,0.08)', background: u.is_admin ? 'rgba(167, 139, 250,0.06)' : 'transparent' }}>
                  <td style={{ padding: '0.625rem 1rem', color: '#8F87B8' }}>{u.id}</td>
                  <td style={{ padding: '0.625rem 1rem', fontWeight: 800, color: '#241B45' }}>{u.name}{isSelf && <span style={{ marginLeft: '0.375rem', fontSize: '9px', color: '#A78BFA', fontWeight: 900 }}>(나)</span>}</td>
                  <td style={{ padding: '0.625rem 1rem', color: '#6E67A0' }}>{u.gender || '-'}</td>
                  <td style={{ padding: '0.625rem 1rem', color: '#6E67A0' }}>{u.age ?? '-'}</td>
                  <td style={{ padding: '0.625rem 1rem', color: '#6E67A0' }}>{u.location || '-'}</td>
                  <td style={{ padding: '0.625rem 1rem', color: '#6E67A0' }}>{u.email || '-'}</td>
                  <td style={{ padding: '0.625rem 1rem', color: '#6E67A0' }}>{u.oauth_provider || '일반'}</td>
                  <td style={{ padding: '0.625rem 1rem' }}>{u.stats_public ? '공개' : '비공개'}</td>
                  <td style={{ padding: '0.625rem 1rem' }}>{u.allow_whisper === false ? '거부' : '허용'}</td>
                  <td style={{ padding: '0.625rem 1rem' }}>
                    <button
                      onClick={() => handleTogglePermission(u)}
                      disabled={updatingPermissionFor === u.id || isSelf}
                      title={isSelf ? '본인 권한은 여기서 변경할 수 없습니다' : (u.is_admin ? '관리자 해제' : '관리자로 지정')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '9999px',
                        background: u.is_admin ? 'rgba(108, 92, 231,0.12)' : 'rgba(143, 135, 184,0.08)',
                        border: `1px solid ${u.is_admin ? 'rgba(108, 92, 231,0.3)' : 'rgba(143, 135, 184,0.2)'}`,
                        fontSize: '10px', fontWeight: 800, color: u.is_admin ? '#6C5CE7' : '#8F87B8',
                        cursor: isSelf ? 'default' : 'pointer', opacity: isSelf ? 0.6 : 1,
                      }}>
                      {updatingPermissionFor === u.id ? <Loader2 size={10} className="animate-spin" /> : u.is_admin ? <ShieldCheck size={10} /> : <ShieldOff size={10} />}
                      {u.is_admin ? '관리자' : '일반'}
                    </button>
                  </td>
                  <td style={{ padding: '0.625rem 1rem', color: '#8F87B8', whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                  <td style={{ padding: '0.625rem 1rem', position: 'relative' }}>
                    <button
                      onClick={() => setDeleteTarget(deleteTarget?.id === u.id ? null : { id: u.id, name: u.name })}
                      disabled={isSelf}
                      title={isSelf ? '본인 계정은 삭제할 수 없습니다' : '탈퇴(삭제)'}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.75rem', height: '1.75rem', borderRadius: '9999px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', cursor: isSelf ? 'default' : 'pointer', opacity: isSelf ? 0.4 : 1 }}>
                      <Trash2 size={11} />
                    </button>
                    {deleteTarget?.id === u.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100, marginTop: '0.25rem', background: '#FDFCFF', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.75rem', padding: '0.625rem', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', width: '180px', whiteSpace: 'normal' }}
                      >
                        <p style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                          "{deleteTarget.name}"님을 탈퇴시킬까요?
                        </p>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '4px 0', background: 'rgba(143, 135, 184,0.15)', border: '1px solid rgba(143, 135, 184,0.4)', borderRadius: '9999px', fontSize: '10px', fontWeight: 800, color: '#8F87B8', cursor: 'pointer' }}>취소</button>
                          <button onClick={() => handleDelete()} disabled={isDeleting} style={{ flex: 1, padding: '4px 0', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '9999px', fontSize: '10px', fontWeight: 900, color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                            {isDeleting ? <Loader2 size={10} className="animate-spin" /> : '확인'}
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
