import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Plus, Loader2 } from 'lucide-react';
import { searchKakaoLocation } from '../../utils';

export default function CreateClubModal({ clubForm, setClubForm, isSavingClub, onClose, onCreate }) {
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const handleLocationChange = (value) => {
    setClubForm({ ...clubForm, location: value, lat: null, lng: null });
    searchKakaoLocation(value, setLocationSuggestions, setIsSearchingLocation);
  };

  const selectLocation = (item) => {
    const simplifiedAddr = item.address_name.split(' ').slice(1, 3).join(' ');
    setClubForm({ ...clubForm, location: simplifiedAddr, lat: parseFloat(item.y), lng: parseFloat(item.x) });
    setLocationSuggestions([]);
  };

  return (
    <div className="modal-backdrop overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-content relative my-auto"
        style={{ maxWidth: '480px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em' }}>모임 개설하기</h2>
          <button onClick={onClose} style={{ background: 'rgba(108, 92, 231,0.08)', border: '1px solid rgba(108, 92, 231,0.12)', width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8F87B8', transition: 'all 0.2s ease' }} className="hover:bg-white\/10 hover:text-white"><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          <div>
            <label className="form-label">모임 이름</label>
            <input className="form-input" style={{ color: '#241B45' }} placeholder="예: 강남 심리학 독서회" value={clubForm.name} onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })} />
          </div>
          <div>
            <label className="form-label">카테고리</label>
            <select className="form-input appearance-none" style={{ color: '#241B45' }} value={clubForm.category} onChange={(e) => setClubForm({ ...clubForm, category: e.target.value })}>
              <option>독서/기록</option>
              <option>소설/토론</option>
              <option>인문/철학</option>
              <option>자기계발</option>
              <option>비즈니스</option>
            </select>
          </div>
          <div>
            <label className="form-label">모임 설명</label>
            <textarea className="form-input" style={{ height: '5.5rem', resize: 'none', color: '#241B45' }} placeholder="어떤 활동을 하는 모임인지 알려주세요" value={clubForm.description} onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })} />
          </div>
          <div style={{ position: 'relative' }}>
            <label className="form-label">활동 지역</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" style={{ color: '#241B45', paddingRight: '3rem' }} placeholder="동네, 역 이름 또는 장소명 (예: 합정역)" value={clubForm.location} onChange={(e) => handleLocationChange(e.target.value)} />
              <MapPin style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6C5CE7' }} size={16} />
            </div>
            {locationSuggestions.length > 0 && (
              <div style={{ position: 'absolute', zIndex: 1200, top: '100%', left: 0, right: 0, marginTop: '0.5rem', background: '#FDFCFF', border: '1px solid rgba(108, 92, 231,0.2)', borderRadius: '0.875rem', boxShadow: '0 16px 40px rgba(0,0,0,0.15)', maxHeight: '180px', overflowY: 'auto' }}>
                {locationSuggestions.map((item, i) => (
                  <div key={i} onClick={() => selectLocation(item)} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(108, 92, 231,0.08)', transition: 'background 0.15s ease' }} className="hover:bg-white\/5">
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#241B45', marginBottom: '2px' }}>{item.place_name}</p>
                    <p style={{ fontSize: '10px', color: '#8F87B8' }}>{item.address_name}</p>
                  </div>
                ))}
              </div>
            )}
            {clubForm.lat && clubForm.lng && (
              <div style={{ marginTop: '0.5rem', padding: '0.375rem 0.875rem', background: 'rgba(108, 92, 231,0.08)', border: '1px solid rgba(108, 92, 231,0.2)', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6C5CE7' }}>📍 위치 확인됨: {clubForm.location}</span>
              </div>
            )}
          </div>

          <button onClick={onCreate} disabled={isSavingClub} className="premium-button disabled:opacity-50" style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {isSavingClub ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            <span>모임 개설 완료</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
