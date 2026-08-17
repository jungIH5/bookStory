import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus, Star } from 'lucide-react';
import { getValidUserId } from '../../utils';

export default function ClubsTab({ user, clubs, joinedClubs, onSelectClub, onCreateClub }) {
  const validUserId = getValidUserId(user);
  const showsNearby = !!(user && user.lat && user.lng);
  const allClubs = showsNearby ? clubs.slice(5) : clubs;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '-0.03em' }}>
            <span className="cute-float" style={{ display: 'inline-block', fontSize: '1.75rem' }}>🏘️</span>
            독서 커뮤니티
          </h2>
          <p style={{ color: '#8F87B8', fontWeight: 700, fontSize: '0.875rem' }}>지하철 한 정거장 거리의 이웃과 함께 책을 읽어보세요.</p>
        </div>
        <button onClick={onCreateClub} className="premium-button" style={{ fontSize: '0.8125rem', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <Plus size={17} />
          모임 개설
        </button>
      </div>

      {user && user.lat && user.lng ? (
        <div>
          <div className="section-header">
            <div className="section-accent" />
            <h3 style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#241B45' }}>내 주변 가까운 모임</h3>
          </div>
          <div className="custom-scroll" style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: '1.25rem', paddingBottom: '1.5rem', scrollSnapType: 'x mandatory', margin: '0 -1.5rem', padding: '0 1.5rem 1.5rem' }}>
            {clubs.slice(0, 5).map((club) => (
              <div
                key={club.id}
                onClick={() => onSelectClub(club)}
                className="premium-card group"
                style={{ width: '280px', minWidth: '280px', height: '340px', display: 'flex', flexDirection: 'column', cursor: 'pointer', scrollSnapAlign: 'start', background: 'rgba(255,255,255,0.97)', flexShrink: 0 }}
              >
                <div style={{ width: '100%', height: '160px', position: 'relative', overflow: 'hidden', background: '#E9E5F7', flexShrink: 0 }}>
                  <img src={club.image} className="group-hover:scale-110 transition-transform duration-700" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} alt={club.name} />
                  <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 10 }}>
                    <div style={{ background: 'rgba(108, 92, 231,0.9)', backdropFilter: 'blur(8px)', color: 'white', padding: '3px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(108, 92, 231,0.25)' }}>
                      <MapPin size={9} />
                      {club.distance != null ? `${club.distance}km` : '—'}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(36, 27, 69,0.6), transparent)' }} />
                </div>
                <div style={{ padding: '1.1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 className="group-hover:text-amber-700 transition-colors" style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.375rem' }}>{club.name}</h3>
                    <p style={{ fontSize: '11px', color: '#8F87B8', fontWeight: 700, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>{club.description}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontWeight: 900, borderTop: '1px solid rgba(108, 92, 231,0.1)', paddingTop: '0.875rem', marginTop: '0.5rem' }}>
                    <span style={{ color: '#8F87B8', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{club.location}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {club.avg_rating > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#A78BFA' }}><Star size={9} fill="#A78BFA" />{club.avg_rating}</span>}
                      <span style={{ color: 'rgba(108, 92, 231,0.8)' }}>{club.member_count}명</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : user ? (
        <div style={{ padding: '1rem 1.25rem', marginBottom: '1rem', background: 'rgba(108, 92, 231,0.04)', border: '1px dashed rgba(108, 92, 231,0.2)', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <MapPin size={14} style={{ color: '#C7C2E0', flexShrink: 0 }} />
          <p style={{ fontSize: '0.8125rem', color: '#8F87B8', fontWeight: 600 }}>회원정보에 위치를 등록하면 가까운 모임을 우선 추천해드려요.</p>
        </div>
      ) : null}

      {user && validUserId && clubs.filter(c => c.creator_id === validUserId).length > 0 && (
        <div>
          <div className="section-header" style={{ marginBottom: '1.25rem' }}>
            <div className="section-accent" />
            <h3 style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#241B45' }}>내가 개설한 모임</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.875rem', marginBottom: '2rem' }}>
            {clubs.filter(c => c.creator_id === validUserId).map((club) => (
              <div
                key={club.id}
                onClick={() => onSelectClub(club)}
                className="glass-card group"
                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', height: '130px', border: '1.5px solid rgba(108, 92, 231,0.3)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: '3.25rem', height: '3.25rem', borderRadius: '0.875rem', overflow: 'hidden', border: '1px solid rgba(108, 92, 231,0.15)', flexShrink: 0, background: '#E9E5F7' }}>
                    <img src={club.image} className="w-full h-full grayscale group-hover:grayscale-0 transition-all" style={{ objectFit: 'cover' }} alt="" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '2px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: '#6C5CE7', background: 'rgba(108, 92, 231,0.12)', border: '1px solid rgba(108, 92, 231,0.25)', padding: '1px 6px', borderRadius: '4px' }}>개설자</span>
                    </div>
                    <h4 className="group-hover:text-amber-700 transition-colors" style={{ fontSize: '0.8125rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.name}</h4>
                    <p style={{ fontSize: '11px', color: '#8F87B8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                      <MapPin size={9} /> {club.location}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(108, 92, 231,0.08)' }}>
                  <span style={{ fontSize: '9px', fontWeight: 900, color: '#8F87B8', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(108, 92, 231,0.07)', border: '1px solid rgba(108, 92, 231,0.12)', padding: '2px 8px', borderRadius: '6px' }}>{club.category}</span>
                  <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(108, 92, 231,0.8)' }}>{club.member_count}명</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(108, 92, 231,0.1)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div className="section-header" style={{ marginBottom: 0 }}>
            <div className="section-accent" style={{ background: 'rgba(108, 92, 231,0.35)' }} />
            <h3 style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8F87B8' }}>모든 독서 모임</h3>
          </div>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C7C2E0' }}>총 {clubs.length}개 활동 중</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.875rem' }}>
          {allClubs.map((club) => (
            <div
              key={club.id}
              onClick={() => onSelectClub(club)}
              className="glass-card group"
              style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', height: '130px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: '3.25rem', height: '3.25rem', borderRadius: '0.875rem', overflow: 'hidden', border: '1px solid rgba(108, 92, 231,0.15)', flexShrink: 0, background: '#E9E5F7' }}>
                  <img src={club.image} className="w-full h-full grayscale group-hover:grayscale-0 transition-all" style={{ objectFit: 'cover' }} alt="" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 className="group-hover:text-amber-700 transition-colors" style={{ fontSize: '0.8125rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.name}</h4>
                  <p style={{ fontSize: '11px', color: '#8F87B8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                    <MapPin size={9} /> {club.location}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(108, 92, 231,0.08)' }}>
                <span style={{ fontSize: '9px', fontWeight: 900, color: '#8F87B8', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(108, 92, 231,0.07)', border: '1px solid rgba(108, 92, 231,0.12)', padding: '2px 8px', borderRadius: '6px' }}>{club.category}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {club.avg_rating > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', color: '#A78BFA', fontWeight: 900 }}><Star size={9} fill="#A78BFA" />{club.avg_rating}</span>}
                  {club.distance != null && <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(108, 92, 231,0.6)', fontStyle: 'italic' }}>{club.distance}km</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
