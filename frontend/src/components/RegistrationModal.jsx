import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, User, MapPin, ChevronRight, Loader2, MapIcon, LogIn, Lock } from 'lucide-react';
import { searchKakaoLocation } from '../utils';

export default function RegistrationModal({ regForm, setRegForm, onRegister, onLogin, onSetInitialPassword, onAdminLogin, onOAuthLogin }) {
  const [mode, setMode] = useState('login'); // 'register' | 'login' | 'set-password' | 'admin'
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupError, setSetupError] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const handleLogin = async () => {
    if (!loginName.trim() || !loginPassword) return;
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await onLogin(loginName.trim(), loginPassword, (err) => setLoginError(err), () => {
        setSetupPassword('');
        setSetupConfirm('');
        setSetupError('');
        setMode('set-password');
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterClick = () => {
    if (!regForm.password || regForm.password.length < 4) {
      return setRegisterError('비밀번호는 4자 이상 입력해주세요.');
    }
    if (regForm.password !== confirmPassword) {
      return setRegisterError('비밀번호가 일치하지 않습니다.');
    }
    setRegisterError('');
    onRegister((err) => setRegisterError(err));
  };

  const handleSetPassword = async () => {
    if (!setupPassword || setupPassword.length < 4) {
      return setSetupError('비밀번호는 4자 이상 입력해주세요.');
    }
    if (setupPassword !== setupConfirm) {
      return setSetupError('비밀번호가 일치하지 않습니다.');
    }
    setIsSettingPassword(true);
    setSetupError('');
    try {
      await onSetInitialPassword(loginName.trim(), setupPassword, (err) => setSetupError(err));
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!adminPassword) return;
    setIsAdminLoggingIn(true);
    setAdminError('');
    try {
      await onAdminLogin(adminPassword, (err) => setAdminError(err));
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  const handleLocationChange = (value) => {
    setRegForm({ ...regForm, location: value, lat: null, lng: null });
    searchKakaoLocation(value, setLocationSuggestions, setIsSearchingLocation);
  };

  const selectLocation = (item) => {
    const simplifiedAddr = item.address_name.split(' ').slice(1, 3).join(' ');
    setRegForm({ ...regForm, location: simplifiedAddr, lat: parseFloat(item.y), lng: parseFloat(item.x) });
    setLocationSuggestions([]);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F4EF', padding: '1.5rem', overflowY: 'auto' }}>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '55%', height: '55%', background: 'rgba(140,107,66,0.18)', filter: 'blur(160px)', borderRadius: '9999px' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '55%', height: '55%', background: 'rgba(196,148,86,0.18)', filter: 'blur(160px)', borderRadius: '9999px' }} />
      </div>

      <motion.div
        initial={{ scale: 0.93, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '420px', background: '#FEFCF9', backdropFilter: 'blur(24px)', border: '1px solid rgba(139,107,66,0.15)', borderRadius: '1.75rem', padding: '2.5rem', position: 'relative', zIndex: 10, boxShadow: '0 40px 80px rgba(0,0,0,0.6)', margin: 'auto' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '4.5rem', height: '4.5rem', background: 'linear-gradient(135deg, #8C6B42, #C49456)', borderRadius: '1.25rem', margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(140,107,66,0.4)', transform: 'rotate(3deg)' }}>
            <BookOpen size={36} color="white" />
          </div>
          <h2 className="font-black gradient-text" style={{ fontSize: '2rem', letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>bookStory</h2>
          <p style={{ color: '#9E8D7A', fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.6 }}>
            {mode === 'set-password' ? '처음 접속하는 계정을 위한 비밀번호 설정입니다.'
              : mode === 'admin' ? '관리자 비밀번호를 입력해주세요.'
              : mode === 'login' ? '기존 계정으로 로그인합니다.'
              : '당신만의 독서 여정을 시작하기 위해\n회원 정보를 입력해주세요.'}
          </p>
        </div>

        {/* 로그인 모드 */}
        {mode === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label">닉네임 또는 이름</label>
              <div style={{ position: 'relative' }}>
                <LogIn style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={16} />
                <input type="text" placeholder="가입할 때 사용한 이름을 입력하세요"
                  value={loginName}
                  onChange={(e) => { setLoginName(e.target.value); setLoginError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="form-input"
                  style={{ paddingLeft: '2.75rem', color: '#1C140E' }}
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="form-label">비밀번호</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={16} />
                <input type="password" placeholder="비밀번호를 입력하세요"
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="form-input"
                  style={{ paddingLeft: '2.75rem', color: '#1C140E' }}
                />
              </div>
              {loginError && <p style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, marginTop: '0.375rem' }}>{loginError}</p>}
            </div>
            <button onClick={handleLogin} disabled={!loginName.trim() || !loginPassword || isLoggingIn} className="premium-button disabled:opacity-50"
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem' }}>
              {isLoggingIn ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              로그인
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#9E8D7A', fontWeight: 600 }}>
              아직 계정이 없으신가요?{' '}
              <button onClick={() => { setMode('register'); setLoginError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C6B42', fontWeight: 800, padding: 0 }}>
                회원가입
              </button>
            </p>
          </div>
        )}

        {/* 비밀번호 미설정 레거시 계정용 — 최초 비밀번호 설정 */}
        {mode === 'set-password' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.8125rem', color: '#9E8D7A', fontWeight: 600, lineHeight: 1.5 }}>
              <strong style={{ color: '#8C6B42' }}>{loginName}</strong>님은 비밀번호 도입 이전에 만들어진 계정이에요.
              앞으로 사용할 비밀번호를 새로 설정해주세요.
            </p>
            <div>
              <label className="form-label">새 비밀번호</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={16} />
                <input type="password" placeholder="4자 이상 입력하세요"
                  value={setupPassword}
                  onChange={(e) => { setSetupPassword(e.target.value); setSetupError(''); }}
                  className="form-input"
                  style={{ paddingLeft: '2.75rem', color: '#1C140E' }}
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="form-label">새 비밀번호 확인</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={16} />
                <input type="password" placeholder="다시 한 번 입력하세요"
                  value={setupConfirm}
                  onChange={(e) => { setSetupConfirm(e.target.value); setSetupError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
                  className="form-input"
                  style={{ paddingLeft: '2.75rem', color: '#1C140E' }}
                />
              </div>
              {setupError && <p style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, marginTop: '0.375rem' }}>{setupError}</p>}
            </div>
            <button onClick={handleSetPassword} disabled={!setupPassword || !setupConfirm || isSettingPassword} className="premium-button disabled:opacity-50"
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem' }}>
              {isSettingPassword ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
              비밀번호 설정하고 로그인
            </button>
            <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E8D7A', fontSize: '0.8125rem', fontWeight: 700 }}>
              ← 로그인으로 돌아가기
            </button>
          </div>
        )}

        {/* 관리자 진입 */}
        {mode === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label">관리자 비밀번호</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={16} />
                <input type="password" placeholder="비밀번호를 입력하세요"
                  value={adminPassword}
                  onChange={(e) => { setAdminPassword(e.target.value); setAdminError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className="form-input"
                  style={{ paddingLeft: '2.75rem', color: '#1C140E' }}
                  autoFocus
                />
              </div>
              {adminError && <p style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, marginTop: '0.375rem' }}>{adminError}</p>}
            </div>
            <button onClick={handleAdminLogin} disabled={!adminPassword || isAdminLoggingIn} className="premium-button disabled:opacity-50"
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem' }}>
              {isAdminLoggingIn ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
              관리자로 진입
            </button>
            <button onClick={() => { setMode('login'); setAdminPassword(''); setAdminError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E8D7A', fontSize: '0.8125rem', fontWeight: 700 }}>
              ← 로그인으로 돌아가기
            </button>
          </div>
        )}

        {/* 회원가입 모드 */}
        {mode === 'register' && <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="form-label">닉네임 또는 이름</label>
            <div style={{ position: 'relative' }}>
              <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={16} />
              <input type="text" placeholder="어떻게 불러드릴까요?" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} className="form-input" style={{ paddingLeft: '2.75rem', color: '#1C140E' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div>
              <label className="form-label">비밀번호</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={16} />
                <input type="password" placeholder="4자 이상" value={regForm.password || ''} onChange={(e) => { setRegForm({ ...regForm, password: e.target.value }); setRegisterError(''); }} className="form-input" style={{ paddingLeft: '2.75rem', color: '#1C140E' }} />
              </div>
            </div>
            <div>
              <label className="form-label">비밀번호 확인</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={16} />
                <input type="password" placeholder="다시 입력" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setRegisterError(''); }} className="form-input" style={{ paddingLeft: '2.75rem', color: '#1C140E' }} />
              </div>
            </div>
            {registerError && <p style={{ gridColumn: '1 / -1', fontSize: '0.75rem', color: '#dc2626', fontWeight: 700 }}>{registerError}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div>
              <label className="form-label">성별</label>
              <select className="form-input appearance-none" style={{ color: '#1C140E' }} value={regForm.gender} onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}>
                <option>남성</option>
                <option>여성</option>
                <option>기타</option>
              </select>
            </div>
            <div>
              <label className="form-label">나이</label>
              <input type="number" placeholder="20" value={regForm.age} onChange={(e) => setRegForm({ ...regForm, age: parseInt(e.target.value) })} className="form-input" style={{ color: '#1C140E' }} />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <label className="form-label">주 활동 지역</label>
            <div style={{ position: 'relative' }}>
              <MapIcon style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={16} />
              <input type="text" placeholder="동네나 역 이름 검색 (예: 합정역, 마포구)" value={regForm.location} onChange={(e) => handleLocationChange(e.target.value)} className="form-input" style={{ paddingLeft: '2.75rem', color: '#1C140E' }} />
              {isSearchingLocation && <Loader2 style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={15} className="animate-spin" />}
            </div>
            {locationSuggestions.length > 0 && (
              <div style={{ position: 'absolute', zIndex: 1100, top: '100%', left: 0, right: 0, marginTop: '0.5rem', background: '#FEFCF9', border: '1px solid rgba(139,107,66,0.2)', borderRadius: '0.875rem', boxShadow: '0 16px 40px rgba(0,0,0,0.15)', maxHeight: '180px', overflowY: 'auto' }}>
                {locationSuggestions.map((item, i) => (
                  <div key={i} onClick={() => selectLocation(item)} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(139,107,66,0.08)', transition: 'background 0.15s ease' }} className="hover:bg-white\/5">
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1C140E', marginBottom: '2px' }}>{item.place_name}</p>
                    <p style={{ fontSize: '10px', color: '#9E8D7A' }}>{item.address_name}</p>
                  </div>
                ))}
              </div>
            )}
            {regForm.lat && regForm.lng && (
              <div style={{ marginTop: '0.5rem', padding: '0.375rem 0.875rem', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.2)', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={11} style={{ color: '#8C6B42' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6B42' }}>📍 위치 확인됨: {regForm.location}</span>
              </div>
            )}
          </div>

          <button onClick={handleRegisterClick} className="premium-button" style={{ width: '100%', padding: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', marginTop: '0.5rem' }}>
            <span>bookStory 시작하기</span>
            <ChevronRight size={18} />
          </button>

          {/* 소셜 로그인 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(139,107,66,0.15)' }} />
            <span style={{ fontSize: '11px', color: '#BDB0A0', fontWeight: 700, whiteSpace: 'nowrap' }}>또는 소셜 로그인</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(139,107,66,0.15)' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button
              onClick={() => onOAuthLogin?.('kakao')}
              style={{ flex: 1, padding: '0.75rem 0', background: '#FEE500', border: 'none', borderRadius: '0.875rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 900, color: '#191919', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3C6.48 3 2 6.69 2 11.25c0 2.93 1.87 5.51 4.69 6.97L5.5 22l4.54-2.37c.64.09 1.29.12 1.96.12 5.52 0 10-3.69 10-8.25S17.52 3 12 3z" fill="#191919"/></svg>
              카카오
            </button>
            <button
              onClick={() => onOAuthLogin?.('naver')}
              style={{ flex: 1, padding: '0.75rem 0', background: '#03C75A', border: 'none', borderRadius: '0.875rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ fontWeight: 900, fontSize: '14px', lineHeight: 1 }}>N</span>
              네이버
            </button>
            <button
              onClick={() => onOAuthLogin?.('google')}
              style={{ flex: 1, padding: '0.75rem 0', background: 'white', border: '1px solid rgba(139,107,66,0.2)', borderRadius: '0.875rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 900, color: '#1C140E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              구글
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#9E8D7A', fontWeight: 600 }}>
            이미 계정이 있으신가요?{' '}
            <button onClick={() => { setMode('login'); setRegisterError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C6B42', fontWeight: 800, padding: 0 }}>
              로그인
            </button>
          </p>
        </div>}  {/* end register mode */}

        {(mode === 'login' || mode === 'register') && (
          <div style={{ textAlign: 'right', marginTop: '1rem' }}>
            <button
              onClick={() => { setMode('admin'); setAdminPassword(''); setAdminError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#BDB0A0', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0', transition: 'color 0.2s ease' }}
              onMouseEnter={(e) => e.target.style.color = '#8C6B42'}
              onMouseLeave={(e) => e.target.style.color = '#BDB0A0'}
            >
              관리자 유저로 진입 →
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
