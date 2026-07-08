import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, User, MapPin, Eye, EyeOff, Loader2, MessageSquareDashed, MessageSquare } from 'lucide-react';
import { searchKakaoLocation } from '../../utils';

export default function ProfileModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    location: user?.location || '',
    lat: user?.lat || null,
    lng: user?.lng || null,
    stats_public: user?.stats_public !== false,
    allow_whisper: user?.allow_whisper !== false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const handleLocationChange = (value) => {
    setForm(f => ({ ...f, location: value, lat: null, lng: null }));
    searchKakaoLocation(value, setLocationSuggestions, setIsSearchingLocation);
  };

  const selectLocation = (item) => {
    const simplified = item.address_name.split(' ').slice(1, 3).join(' ');
    setForm(f => ({ ...f, location: simplified, lat: parseFloat(item.y), lng: parseFloat(item.x) }));
    setLocationSuggestions([]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    await onSave({
      name: form.name.trim(),
      location: form.location,
      lat: form.lat,
      lng: form.lng,
      stats_public: form.stats_public,
      allow_whisper: form.allow_whisper,
    });
    setIsSaving(false);
  };

  return (
    <div className="modal-backdrop overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-content relative my-auto"
        style={{ maxWidth: '420px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <User size={18} style={{ color: '#8C6B42' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 900, letterSpacing: '-0.02em' }}>프로필 수정</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.12)', width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          <div>
            <label className="form-label">이름</label>
            <input
              className="form-input"
              style={{ color: '#1C140E' }}
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="이름을 입력하세요"
            />
          </div>

          <div style={{ position: 'relative' }}>
            <label className="form-label">활동 지역</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                style={{ color: '#1C140E', paddingRight: '3rem' }}
                value={form.location}
                onChange={(e) => handleLocationChange(e.target.value)}
                placeholder="동네, 역 이름 또는 장소명"
              />
              <MapPin style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#8C6B42' }} size={15} />
            </div>
            {locationSuggestions.length > 0 && (
              <div style={{ position: 'absolute', zIndex: 1200, top: '100%', left: 0, right: 0, marginTop: '0.5rem', background: '#FEFCF9', border: '1px solid rgba(139,107,66,0.2)', borderRadius: '0.875rem', boxShadow: '0 16px 40px rgba(0,0,0,0.15)', maxHeight: '180px', overflowY: 'auto' }}>
                {locationSuggestions.map((item, i) => (
                  <div key={i} onClick={() => selectLocation(item)} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(139,107,66,0.08)' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1C140E', marginBottom: '2px' }}>{item.place_name}</p>
                    <p style={{ fontSize: '10px', color: '#9E8D7A' }}>{item.address_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 독서 통계 공개 */}
          <div style={{ padding: '1rem', background: 'rgba(140,107,66,0.04)', borderRadius: '0.875rem', border: '1px solid rgba(140,107,66,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1C140E', marginBottom: '0.25rem' }}>독서 통계 공개</p>
                <p style={{ fontSize: '11px', color: '#9E8D7A', lineHeight: 1.5 }}>읽은 책 수와 독서 시간이 커뮤니티 순위에 표시됩니다.</p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, stats_public: !f.stats_public }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '9999px',
                  background: form.stats_public ? 'rgba(140,107,66,0.12)' : 'rgba(100,100,100,0.07)',
                  border: `1px solid ${form.stats_public ? 'rgba(140,107,66,0.3)' : 'rgba(139,107,66,0.12)'}`,
                  cursor: 'pointer', fontSize: '11px', fontWeight: 800,
                  color: form.stats_public ? '#8C6B42' : '#9E8D7A',
                  transition: 'all 0.2s', flexShrink: 0, marginLeft: '1rem',
                }}
              >
                {form.stats_public ? <><Eye size={12} /> 공개</> : <><EyeOff size={12} /> 비공개</>}
              </button>
            </div>
          </div>

          {/* 귓속말 설정 */}
          <div style={{ padding: '1rem', background: 'rgba(140,107,66,0.04)', borderRadius: '0.875rem', border: '1px solid rgba(140,107,66,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1C140E', marginBottom: '0.25rem' }}>독서 모임 귓속말</p>
                <p style={{ fontSize: '11px', color: '#9E8D7A', lineHeight: 1.5 }}>거부 시 모임 채팅방에서 귓속말을 받지 않습니다.<br />차단한 사용자의 귓속말은 항상 차단됩니다.</p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, allow_whisper: !f.allow_whisper }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '9999px',
                  background: form.allow_whisper ? 'rgba(140,107,66,0.12)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${form.allow_whisper ? 'rgba(140,107,66,0.3)' : 'rgba(239,68,68,0.25)'}`,
                  cursor: 'pointer', fontSize: '11px', fontWeight: 800,
                  color: form.allow_whisper ? '#8C6B42' : '#dc2626',
                  transition: 'all 0.2s', flexShrink: 0, marginLeft: '1rem',
                }}
              >
                {form.allow_whisper ? <><MessageSquare size={12} /> 허용</> : <><MessageSquareDashed size={12} /> 거부</>}
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || !form.name.trim()}
            className="premium-button disabled:opacity-50"
            style={{ width: '100%', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : null}
            저장하기
          </button>
        </div>
      </motion.div>
    </div>
  );
}
