import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Users, Star, Loader2 } from 'lucide-react';

export default function ClubModal({
  club, user, joinedClubs,
  clubReviews, myRating, hoverRating, myReviewText, isSubmittingReview,
  onClose, onJoin, onSubmitReview,
  setMyRating, setHoverRating, setMyReviewText,
}) {
  useEffect(() => {
    if (club.lat && club.lng) {
      setTimeout(() => {
        const container = document.getElementById('club-map');
        if (container && window.kakao?.maps) {
          const options = { center: new window.kakao.maps.LatLng(club.lat, club.lng), level: 3 };
          const map = new window.kakao.maps.Map(container, options);
          const marker = new window.kakao.maps.Marker({ position: new window.kakao.maps.LatLng(club.lat, club.lng) });
          marker.setMap(map);
        }
      }, 300);
    }
  }, [club]);

  return (
    <div className="modal-backdrop overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-content relative my-auto"
        style={{ maxWidth: '560px', padding: 0, overflow: 'hidden' }}
      >
        <div style={{ height: '11rem', position: 'relative' }}>
          <img src={club.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,20,14,0.75), transparent 60%)' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', border: 'none', width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }} className="hover:bg-black\/60"><X size={16} /></button>
        </div>

        <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <span style={{ fontSize: '9px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.12em', background: 'rgba(140,107,66,0.12)', border: '1px solid rgba(140,107,66,0.2)', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', width: 'fit-content' }}>{club.category}</span>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.02em' }}>{club.name}</h2>
              <p style={{ color: '#9E8D7A', fontSize: '0.8125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={11} /> {club.location}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p className="gradient-text-accent" style={{ fontSize: '1.5rem', fontWeight: 900, fontStyle: 'italic', lineHeight: 1 }}>{club.member_count}명</p>
              <p style={{ fontSize: '9px', color: '#9E8D7A', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>Members</p>
              {club.avg_rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <Star size={12} fill="#C49456" color="#C49456" />
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#C49456' }}>{club.avg_rating}</span>
                  <span style={{ fontSize: '10px', color: '#BDB0A0' }}>({club.review_count || 0})</span>
                </div>
              )}
            </div>
          </div>

          <p style={{ color: '#7B6B55', lineHeight: 1.65, fontWeight: 500, fontSize: '0.875rem', background: 'rgba(139,107,66,0.05)', padding: '0.875rem 1rem', borderRadius: '0.875rem', border: '1px solid rgba(139,107,66,0.1)' }}>{club.description}</p>

          <div>
            <h4 style={{ fontSize: '9px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem', paddingBottom: '0.625rem', borderBottom: '1px solid rgba(139,107,66,0.1)' }}>모임 위치</h4>
            <div id="club-map" style={{ width: '100%', height: '9rem', borderRadius: '0.875rem', overflow: 'hidden', border: '1px solid rgba(139,107,66,0.15)', background: '#EDE8E2' }} />
          </div>

          <div style={{ borderTop: '1px solid rgba(139,107,66,0.08)', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '9px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.875rem' }}>모임 평점 & 리뷰</h4>

            {clubReviews.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem', maxHeight: '160px', overflowY: 'auto' }}>
                {clubReviews.map(rv => (
                  <div key={rv.id} style={{ padding: '0.625rem 0.875rem', background: 'rgba(139,107,66,0.04)', border: '1px solid rgba(139,107,66,0.1)', borderRadius: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <div style={{ width: '1.375rem', height: '1.375rem', borderRadius: '9999px', background: 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'white', fontWeight: 900 }}>{(rv.author_name || '?')[0]}</div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3D2D1E' }}>{rv.author_name}</span>
                      <div style={{ display: 'flex', gap: '1px' }}>
                        {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} fill={s <= rv.rating ? '#C49456' : 'none'} color={s <= rv.rating ? '#C49456' : 'rgba(139,107,66,0.3)'} />)}
                      </div>
                    </div>
                    {rv.review_text && <p style={{ fontSize: '0.75rem', color: '#7B6B55', lineHeight: 1.5 }}>{rv.review_text}</p>}
                  </div>
                ))}
              </div>
            )}

            {user && (
              <div style={{ background: 'rgba(196,148,86,0.04)', border: '1px solid rgba(196,148,86,0.15)', borderRadius: '0.875rem', padding: '0.875rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#A07840', marginBottom: '0.625rem' }}>내 평점 남기기</p>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '0.625rem' }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setMyRating(s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                      <Star size={20} fill={(hoverRating || myRating) >= s ? '#C49456' : 'none'} color={(hoverRating || myRating) >= s ? '#C49456' : 'rgba(139,107,66,0.3)'} />
                    </button>
                  ))}
                  {myRating > 0 && <span style={{ fontSize: '0.75rem', color: '#C49456', fontWeight: 800, marginLeft: '6px', alignSelf: 'center' }}>{myRating}점</span>}
                </div>
                <textarea
                  value={myReviewText}
                  onChange={e => setMyReviewText(e.target.value)}
                  placeholder="리뷰를 남겨주세요 (선택)"
                  className="form-input"
                  style={{ width: '100%', height: '4rem', resize: 'none', fontSize: '0.8125rem', color: '#1C140E', marginBottom: '0.625rem', boxSizing: 'border-box' }}
                />
                <button onClick={onSubmitReview} disabled={!myRating || isSubmittingReview}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.8125rem', fontWeight: 800, color: myRating ? '#fff' : '#BDB0A0', background: myRating ? 'linear-gradient(135deg,#8C6B42,#C49456)' : 'rgba(139,107,66,0.08)', border: 'none', borderRadius: '0.625rem', cursor: myRating ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', transition: 'all 0.2s' }}>
                  {isSubmittingReview ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />}
                  리뷰 등록
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onJoin(club.id)}
            className="premium-button"
            style={{ width: '100%', padding: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: joinedClubs.has(club.id) ? 'rgba(139,107,66,0.08)' : undefined, boxShadow: joinedClubs.has(club.id) ? 'none' : undefined }}
          >
            <Users size={16} />
            <span>{joinedClubs.has(club.id) ? '모임 탈퇴하기' : '모임 참여하기'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
