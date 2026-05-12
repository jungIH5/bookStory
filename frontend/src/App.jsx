import React, { useState } from 'react';
import { Users, Search, BookOpen, MessageSquare, Plus, MapPin, X, Sparkles, Loader2, Bookmark, Heart, MessageCircle, ChevronRight, User, MapIcon, Send, Mic, Upload, FileAudio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '';

const stripHtml = (str) => str?.replace(/<\/?[^>]+(>|$)/g, '') ?? '';

function App() {
  const [activeTab, setActiveTab] = useState('stack');
  const [viewMode, setViewMode] = useState('tower');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [analysisResult, setAnalysisResult] = useState('');
  const [questions, setQuestions] = useState({ thematic: [], perspective_shift: [] });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [readBooks, setReadBooks] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentBookPages, setCurrentBookPages] = useState(250);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('bookstory_user')) || null);

  const [regForm, setRegForm] = useState({ name: '', gender: '남성', age: 20, location: '', lat: null, lng: null });
  const [selectedClub, setSelectedClub] = useState(null);
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [clubForm, setClubForm] = useState({ name: '', description: '', category: '독서/기록', location: '', lat: null, lng: null, image: '' });
  const [isSavingClub, setIsSavingClub] = useState(false);
  const [joinedClubs, setJoinedClubs] = useState(new Set());
  const [isWritingPost, setIsWritingPost] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '', book_title: '' });
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const [recordingFile, setRecordingFile] = useState(null);
  const [isAnalyzingRecording, setIsAnalyzingRecording] = useState(false);
  const [recordingResult, setRecordingResult] = useState(null);
  const [voiceSampleUploading, setVoiceSampleUploading] = useState(false);

  const [tendencyResult, setTendencyResult] = useState(null);
  const [isFetchingTendency, setIsFetchingTendency] = useState(false);
  const [showTendencyModal, setShowTendencyModal] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [isFetchingRecs, setIsFetchingRecs] = useState(false);

  const [sessionId, setSessionId] = useState(null);
  const [sessionQA, setSessionQA] = useState([]);
  const [isConversing, setIsConversing] = useState(false);
  const [conversationInput, setConversationInput] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setActiveTab('search');
    try {
      const response = await fetch(`${API_URL}/api/books/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.items || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookClick = async (book) => {
    setSelectedBook(book);
    setIsAnalyzing(true);
    setAnalysisResult('');
    setQuestions({ thematic: [], perspective_shift: [] });
    try {
      const response = await fetch(`${API_URL}/api/books/analyze?title=${encodeURIComponent(stripHtml(book.title))}&author=${encodeURIComponent(book.author)}`);
      const data = await response.json();
      setAnalysisResult(data.analysis);
      setCurrentBookPages(data.pages || 250);
      setQuestions(data.questions || { thematic: [], perspective_shift: [] });
    } catch (error) {
      setAnalysisResult('도서 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  React.useEffect(() => {
    fetchReadBooks();
    fetchCommunityPosts();
  }, []);

  React.useEffect(() => {
    fetchClubs();
    fetchJoinedClubs();
  }, [user]);

  const fetchReadBooks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/books/read`);
      const data = await response.json();
      setReadBooks(data);
    } catch (error) { console.error('Failed to fetch books'); }
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const R = 6371;
    const dLat = (parseFloat(lat2) - parseFloat(lat1)) * Math.PI / 180;
    const dLon = (parseFloat(lon2) - parseFloat(lon1)) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(parseFloat(lat1) * Math.PI / 180) * Math.cos(parseFloat(lat2) * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
  };

  const fetchClubs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/clubs`);
      const data = await response.json();
      if (user && user.lat && user.lng) {
        const sorted = data.map(club => ({ ...club, distance: getDistance(user.lat, user.lng, club.lat, club.lng) })).sort((a, b) => a.distance - b.distance);
        setClubs(sorted);
      } else {
        setClubs(data);
      }
    } catch (error) { console.error('Failed to fetch clubs'); }
  };

  const fetchCommunityPosts = async () => {
    try {
      const uid = user?.id ? `?user_id=${user.id}` : '';
      const response = await fetch(`${API_URL}/api/community/posts${uid}`);
      const data = await response.json();
      setCommunityPosts(data);
    } catch (error) { console.error('Failed to fetch posts'); }
  };

  const fetchJoinedClubs = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${API_URL}/api/clubs/joined?user_id=${user.id}`);
      const data = await response.json();
      setJoinedClubs(new Set(data));
    } catch (error) { console.error('Failed to fetch joined clubs'); }
  };

  const searchLocation = (keyword, _type) => {
    if (!keyword.trim()) return setLocationSuggestions([]);
    setIsSearchingLocation(true);
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setLocationSuggestions(data);
      } else {
        setLocationSuggestions([]);
      }
      setIsSearchingLocation(false);
    });
  };

  const selectLocation = (item, type) => {
    const simplifiedAddr = item.address_name.split(' ').slice(1, 3).join(' ');
    if (type === 'reg') {
      setRegForm({ ...regForm, location: simplifiedAddr, lat: parseFloat(item.y), lng: parseFloat(item.x) });
    } else {
      setClubForm({ ...clubForm, location: simplifiedAddr, lat: parseFloat(item.y), lng: parseFloat(item.x) });
    }
    setLocationSuggestions([]);
  };

  const handleRegisterUser = async () => {
    if (!regForm.name || !regForm.location) return alert('이름과 지역을 입력해주세요.');
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data);
        localStorage.setItem('bookstory_user', JSON.stringify(data));
        window.location.reload();
      }
    } catch (error) { alert('가입 중 오류가 발생했습니다.'); }
  };

  const handleTestLogin = async () => {
    const testData = { name: '테스트유저', gender: '기타', age: 20, location: '서울 강남구', lat: 37.4979, lng: 127.0276 };
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data);
        localStorage.setItem('bookstory_user', JSON.stringify(data));
        window.location.reload();
      }
    } catch (error) {
      const fallback = { id: 'test-' + Date.now(), ...testData };
      setUser(fallback);
      localStorage.setItem('bookstory_user', JSON.stringify(fallback));
      window.location.reload();
    }
  };

  const handleRegisterBook = async (book) => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/books/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: book.title, author: book.author, image: book.image, publisher: book.publisher, isbn: book.isbn, pages: currentBookPages })
      });
      if (response.ok) {
        await fetchReadBooks();
        setSelectedBook(null);
        setActiveTab('stack');
        setViewMode('tower');
      }
    } catch (error) { alert('등록 중 오류가 발생했습니다.'); } finally { setIsSaving(false); }
  };

  const handleCreateClub = async () => {
    if (!clubForm.name || !clubForm.location) return alert('모집 정보를 모두 입력해주세요.');
    setIsSavingClub(true);
    try {
      const response = await fetch(`${API_URL}/api/clubs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...clubForm, image: clubForm.image || `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000)}?q=80&w=800` })
      });
      if (response.ok) {
        await fetchClubs();
        setIsCreatingClub(false);
        setClubForm({ name: '', description: '', category: '독서/기록', location: '', lat: null, lng: null, image: '' });
      }
    } catch (error) { alert('모임 개설 중 오류가 발생했습니다.'); } finally { setIsSavingClub(false); }
  };

  const handleJoinClub = async (clubId) => {
    if (!user) return alert('로그인이 필요합니다.');
    const isJoined = joinedClubs.has(clubId);
    try {
      if (isJoined) {
        await fetch(`${API_URL}/api/clubs/${clubId}/leave`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id })
        });
        setJoinedClubs(prev => { const s = new Set(prev); s.delete(clubId); return s; });
        if (selectedClub?.id === clubId) setSelectedClub(prev => ({ ...prev, member_count: prev.member_count - 1 }));
      } else {
        await fetch(`${API_URL}/api/clubs/${clubId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id })
        });
        setJoinedClubs(prev => new Set([...prev, clubId]));
        if (selectedClub?.id === clubId) setSelectedClub(prev => ({ ...prev, member_count: prev.member_count + 1 }));
      }
      await fetchClubs();
    } catch (error) { alert('오류가 발생했습니다.'); }
  };

  const handleLikePost = async (postId) => {
    if (!user) return;
    try {
      await fetch(`${API_URL}/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
      await fetchCommunityPosts();
    } catch (error) { console.error('Like error:', error); }
  };

  const handleWritePost = async () => {
    if (!postForm.title.trim() || !postForm.content.trim()) return alert('제목과 내용을 입력해주세요.');
    setIsSubmittingPost(true);
    try {
      const response = await fetch(`${API_URL}/api/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, ...postForm })
      });
      if (response.ok) {
        await fetchCommunityPosts();
        setIsWritingPost(false);
        setPostForm({ title: '', content: '', book_title: '' });
      }
    } catch (error) { alert('글 작성 중 오류가 발생했습니다.'); }
    finally { setIsSubmittingPost(false); }
  };

  const handleFetchTendency = async () => {
    if (!user) return alert('로그인이 필요합니다.');
    setIsFetchingTendency(true);
    try {
      const res = await fetch(`${API_URL}/api/tendency/${user.id}`);
      const data = await res.json();
      setTendencyResult(data);
      setShowTendencyModal(true);
    } catch { alert('성향 분석 중 오류가 발생했습니다.'); }
    finally { setIsFetchingTendency(false); }
  };

  const handleFetchRecommendations = async () => {
    if (!user) return;
    setIsFetchingRecs(true);
    try {
      const res = await fetch(`${API_URL}/api/recommendations/${user.id}`);
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch { console.error('추천 로드 실패'); }
    finally { setIsFetchingRecs(false); }
  };

  const handleUploadRecording = async () => {
    if (!recordingFile) return;
    setIsAnalyzingRecording(true);
    setRecordingResult(null);
    const formData = new FormData();
    formData.append('file', recordingFile);
    if (user?.id) formData.append('user_id', user.id);
    try {
      const response = await fetch(`${API_URL}/api/recordings`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('분석 실패');
      const data = await response.json();
      setRecordingResult(data);
    } catch (error) {
      alert('녹음 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzingRecording(false);
    }
  };

  const handleUploadVoiceSample = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setVoiceSampleUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}/voice-sample`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error();
      alert('목소리 샘플이 등록되었습니다.');
    } catch {
      alert('목소리 샘플 등록 중 오류가 발생했습니다.');
    } finally {
      setVoiceSampleUploading(false);
    }
  };

  const handleStartDiscussion = async () => {
    if (!questions.thematic.length) return;
    const firstQuestion = questions.thematic[0];
    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || null,
          book_title: stripHtml(selectedBook.title),
          book_author: selectedBook.author,
          book_analysis: analysisResult,
          first_question: firstQuestion,
        }),
      });
      const data = await response.json();
      setSessionId(data.session_id);
      setSessionQA([{ question: firstQuestion, answer: null, turn_order: 1 }]);
      setIsConversing(true);
    } catch (error) {
      alert('토론 세션 시작 중 오류가 발생했습니다.');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!conversationInput.trim() || !sessionId) return;
    setIsSubmittingAnswer(true);
    const answer = conversationInput.trim();
    setConversationInput('');
    setSessionQA(prev => prev.map((qa, i) =>
      i === prev.length - 1 ? { ...qa, answer } : qa
    ));
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, user_id: user?.id || null }),
      });
      const data = await response.json();
      setSessionQA(prev => [...prev, { question: data.next_question, answer: null, turn_order: data.turn }]);
    } catch (error) {
      alert('답변 제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  React.useEffect(() => {
    if (selectedClub && selectedClub.lat && selectedClub.lng) {
      setTimeout(() => {
        const container = document.getElementById('club-map');
        if (container) {
          const options = { center: new window.kakao.maps.LatLng(selectedClub.lat, selectedClub.lng), level: 3 };
          const map = new window.kakao.maps.Map(container, options);
          const marker = new window.kakao.maps.Marker({ position: new window.kakao.maps.LatLng(selectedClub.lat, selectedClub.lng) });
          marker.setMap(map);
        }
      }, 300);
    }
  }, [selectedClub]);

  const hexColors = ['#8C6B42', '#C49456', '#6B8C6B', '#B85C3A', '#5C7B6B', '#A67C52', '#7B8E5E', '#C4795A', '#8E7B6B', '#5C6B7A'];

  const navTabs = [
    { id: 'stack', label: '책쌓기', icon: <BookOpen size={15} /> },
    { id: 'clubs', label: '모임찾기', icon: <Users size={15} /> },
    { id: 'community', label: '커뮤니티', icon: <MessageSquare size={15} /> },
    { id: 'recording', label: '녹음 분석', icon: <Mic size={15} /> },
  ];

  return (
    <div className="min-h-screen" style={{ color: '#1C140E' }}>
      {/* Background blobs */}
      <div className="fixed pointer-events-none -z-10" style={{ top: '10%', left: '-5%', width: '500px', height: '500px', background: 'rgba(140,107,66,0.1)', filter: 'blur(160px)', borderRadius: '9999px' }} />
      <div className="fixed pointer-events-none -z-10" style={{ bottom: '10%', right: '-5%', width: '500px', height: '500px', background: 'rgba(196,148,86,0.1)', filter: 'blur(160px)', borderRadius: '9999px' }} />

      {/* STICKY HEADER */}
      <header className="app-header">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width: '2.25rem', height: '2.25rem', background: 'linear-gradient(135deg, #8C6B42, #C49456)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(140,107,66,0.35)' }}>
              <BookOpen size={17} color="white" />
            </div>
            <span className="font-black text-xl gradient-text">bookStory</span>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <label title="목소리 샘플 등록" style={{ cursor: 'pointer', width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(140,107,66,0.12)', border: '1px solid rgba(140,107,66,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {voiceSampleUploading ? <Loader2 className="animate-spin" size={13} style={{ color: '#8C6B42' }} /> : <Mic size={13} style={{ color: '#8C6B42' }} />}
                <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleUploadVoiceSample} disabled={voiceSampleUploading} />
              </label>
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'linear-gradient(135deg, #8C6B42, #C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '11px', flexShrink: 0 }}>
                  {user.name[0]}
                </div>
                <div className="sm:block hidden">
                  <p style={{ fontSize: '9px', color: '#8C6B42', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', lineHeight: 1 }}>Active Reader</p>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 800, lineHeight: 1.3, marginTop: '2px' }}>{user.name}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MAIN WRAPPER */}
      <div className="max-w-5xl mx-auto px-6">

        {/* SEARCH BAR */}
        <div style={{ paddingTop: '2rem', paddingBottom: '1.5rem' }}>
          <div className="relative">
            <input
              type="text"
              placeholder="책 제목, 저자를 검색하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setActiveTab('search')}
              onKeyDown={handleKeyDown}
              className="search-input w-full rounded-2xl font-bold outline-none"
              style={{ padding: '1.125rem 1rem 1.125rem 3.25rem', fontSize: '1rem', color: '#1C140E' }}
            />
            <Search style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: '#9E8D7A' }} size={20} />
            <div style={{ position: 'absolute', right: '1.1rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isSearching ? (
                <Loader2 className="animate-spin" size={18} style={{ color: '#8C6B42' }} />
              ) : (
                <kbd className="sm:flex hidden items-center gap-1 px-2 py-1 rounded-md" style={{ fontSize: '10px', color: '#9E8D7A', fontWeight: 700, background: 'rgba(139,107,66,0.07)', border: '1px solid rgba(139,107,66,0.15)' }}>↵ Enter</kbd>
              )}
            </div>
          </div>
        </div>

        {/* NAV TABS */}
        <div className="flex items-center justify-between mb-8" style={{ gap: '1rem' }}>
          <div className="nav-pill-group">
            {navTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-pill ${activeTab === tab.id ? 'nav-pill-active' : ''}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'stack' && (
            <div className="flex p-1 rounded-xl" style={{ background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)' }}>
              <button
                onClick={() => setViewMode('tower')}
                className="rounded-lg font-black transition-all"
                style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', background: viewMode === 'tower' ? 'white' : 'transparent', color: viewMode === 'tower' ? '#1C140E' : '#9E8D7A', boxShadow: viewMode === 'tower' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none' }}
              >
                쌓아보기
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="rounded-lg font-black transition-all"
                style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', background: viewMode === 'list' ? 'white' : 'transparent', color: viewMode === 'list' ? '#1C140E' : '#9E8D7A', boxShadow: viewMode === 'list' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none' }}
              >
                리스트
              </button>
            </div>
          )}
        </div>

        {/* MAIN CONTENT */}
        <main style={{ paddingBottom: '5rem' }}>

          {/* STACK TAB */}
          {activeTab === 'stack' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {viewMode === 'tower' ? (
                <div style={{ width: '100%', maxWidth: '460px', height: '70vh', maxHeight: '640px', minHeight: '380px', backgroundColor: '#2C1A10', borderRadius: '2rem', border: '1px solid rgba(139,107,66,0.1)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 32px 64px -16px rgba(0,0,0,0.7)', marginBottom: '2.5rem' }}>
                  <div style={{ width: '100%', flex: 1, overflowY: 'auto', display: 'block', position: 'relative' }}>
                    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', padding: '60px 16px 4px 16px' }}>
                      {readBooks && readBooks.length > 0 ? (
                        [...readBooks].map((book, idx) => {
                          const bookColor = hexColors[idx % 10];
                          return (
                            <div
                              key={book.id || idx}
                              className="hover:scale-[1.03] hover:brightness-110 group"
                              style={{ width: `${Math.min(96, 82 + (idx % 4) * 4)}%`, height: `${Math.max(34, (book.pages || 250) / 6)}px`, marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px 8px 8px 3px', backgroundColor: bookColor, backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(255,255,255,0.18) 2%, rgba(0,0,0,0.08) 4%, transparent 10%, transparent 90%, rgba(0,0,0,0.2) 100%)`, borderLeft: '5px solid rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.18)', borderBottom: '1px solid rgba(0,0,0,0.3)', boxShadow: '0 6px 8px -2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', position: 'relative', zIndex: idx + 1, flexShrink: 0 }}
                            >
                              <div style={{ position: 'absolute', left: '8px', top: '15%', bottom: '15%', width: '2px', backgroundColor: 'rgba(255,255,255,0.08)', filter: 'blur(0.5px)' }} />
                              <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '-0.01em', color: 'white', padding: '0 2rem', userSelect: 'none', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%', fontStyle: 'italic', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>
                                {book.title.replace(/<\/?[^>]+(>|$)/g, "")}
                              </span>
                              <div className="hidden group-hover:flex" style={{ position: 'absolute', top: '-52px', left: '50%', transform: 'translateX(-50%)', background: '#0f172a', border: '1px solid rgba(139,107,66,0.25)', padding: '6px 14px', borderRadius: '12px', fontSize: '11px', fontWeight: 900, zIndex: 200, whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', alignItems: 'center', gap: '8px' }}>
                                <span style={{ backgroundColor: bookColor, width: '8px', height: '8px', borderRadius: '9999px', display: 'inline-block' }} />
                                <span style={{ color: 'white' }}>{book.author}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ marginBottom: '8rem', textAlign: 'center' }}>
                          <div style={{ width: '64px', height: '64px', margin: '0 auto 1rem', borderRadius: '1.25rem', background: 'rgba(139,107,66,0.07)', border: '1px solid rgba(139,107,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={28} color="#7B6B55" />
                          </div>
                          <p style={{ fontWeight: 900, fontSize: '1rem', color: '#9E8D7A', marginBottom: '0.375rem' }}>당신만의 지식 타워를 세우세요</p>
                          <p style={{ fontSize: '0.8125rem', color: '#BDB0A0' }}>검색으로 책을 찾아 서재에 추가해보세요</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '22px', backgroundImage: 'linear-gradient(to bottom, #3d1a00, #1a0900)', borderRadius: '0 0 2rem 2rem', borderTop: '1px solid rgba(139,107,66,0.15)', boxShadow: '0 -4px 12px rgba(0,0,0,0.4)', position: 'relative', zIndex: 10 }}>
                    <div style={{ position: 'absolute', top: '1px', left: 0, right: 0, height: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }} />
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {readBooks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1.5rem', background: 'rgba(139,107,66,0.04)', border: '1px solid rgba(139,107,66,0.1)' }}>
                      <BookOpen size={36} style={{ margin: '0 auto 1rem', color: '#BDB0A0' }} />
                      <p style={{ color: '#9E8D7A', fontWeight: 700 }}>아직 기록된 책이 없습니다.</p>
                    </div>
                  )}
                  {readBooks.map(book => (
                    <div key={book.id} className="book-list-item group">
                      <img src={book.image} style={{ width: '3rem', height: '4.25rem', objectFit: 'cover', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', flexShrink: 0 }} alt="" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <h4 className="group-hover:text-amber-700 transition-colors" style={{ fontWeight: 900, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripHtml(book.title)}</h4>
                          <span style={{ fontSize: '9px', color: '#8C6B42', fontWeight: 900, background: 'rgba(140,107,66,0.1)', border: '1px solid rgba(140,107,66,0.2)', padding: '2px 8px', borderRadius: '6px', flexShrink: 0, letterSpacing: '0.05em' }}>
                            {new Date(book.read_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#9E8D7A', fontWeight: 700, marginBottom: '0.5rem' }}>{book.author}</p>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <span style={{ fontSize: '9px', color: '#9E8D7A', border: '1px solid rgba(139,107,66,0.12)', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(139,107,66,0.04)' }}>{book.pages || 250}p</span>
                          {book.publisher && <span style={{ fontSize: '9px', color: '#9E8D7A', border: '1px solid rgba(139,107,66,0.12)', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(139,107,66,0.04)' }}>{book.publisher}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 독서 성향 분석 버튼 */}
              {user && readBooks.length > 0 && (
                <div style={{ width: '100%', maxWidth: '460px', marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleFetchTendency}
                    disabled={isFetchingTendency}
                    style={{ flex: 1, padding: '0.75rem', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.2)', borderRadius: '0.875rem', color: '#A07840', fontWeight: 800, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s ease' }}
                  >
                    {isFetchingTendency ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                    내 독서 성향 분석
                  </button>
                  <button
                    onClick={handleFetchRecommendations}
                    disabled={isFetchingRecs}
                    style={{ flex: 1, padding: '0.75rem', background: 'rgba(196,148,86,0.08)', border: '1px solid rgba(196,148,86,0.2)', borderRadius: '0.875rem', color: '#C49456', fontWeight: 800, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s ease' }}
                  >
                    {isFetchingRecs ? <Loader2 className="animate-spin" size={14} /> : <BookOpen size={14} />}
                    추천 도서 보기
                  </button>
                </div>
              )}

              {/* 추천 도서 섹션 */}
              {recommendations.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', marginTop: '2rem' }}>
                  <div className="section-header" style={{ marginBottom: '1rem' }}>
                    <div className="section-accent" />
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1C140E' }}>당신을 위한 추천 도서</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                    {recommendations.map((book, i) => (
                      <div key={i} onClick={() => handleBookClick(book)} className="book-list-item group" style={{ cursor: 'pointer' }}>
                        {book.image ? (
                          <img src={book.image} style={{ width: '3rem', height: '4.25rem', objectFit: 'cover', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', flexShrink: 0 }} alt="" />
                        ) : (
                          <div style={{ width: '3rem', height: '4.25rem', borderRadius: '0.5rem', background: 'rgba(140,107,66,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={18} style={{ color: '#8C6B42' }} /></div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 className="group-hover:text-amber-700 transition-colors" style={{ fontWeight: 900, fontSize: '0.875rem', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</h4>
                          <p style={{ fontSize: '0.75rem', color: '#9E8D7A', fontWeight: 700, marginBottom: '0.375rem' }}>{book.author}</p>
                          <p style={{ fontSize: '11px', color: '#8C6B42', lineHeight: 1.5 }}>{book.reason}</p>
                        </div>
                        <ChevronRight size={14} style={{ color: '#BDB0A0', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* SEARCH RESULTS TAB */}
          {activeTab === 'search' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', marginTop: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '2rem 1.25rem', width: '100%' }}>
                {searchResults.map((book, index) => (
                  <div
                    key={index}
                    onClick={() => handleBookClick(book)}
                    className="premium-card group"
                    style={{ padding: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}
                  >
                    <div style={{ width: '100%', aspectRatio: '3/4', marginBottom: '0.875rem', overflow: 'hidden', borderRadius: '0.875rem', position: 'relative', boxShadow: '0 16px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(139,107,66,0.1)', background: '#EDE8E2' }}>
                      <img src={book.image} className="group-hover:scale-110 transition-transform duration-700" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      <div className="group-hover:opacity-100 opacity-0 transition-opacity" style={{ position: 'absolute', inset: 0, background: 'rgba(140,107,66,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Sparkles color="white" size={28} />
                      </div>
                    </div>
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <h4 style={{ fontWeight: 900, fontSize: '0.8125rem', lineHeight: 1.35, padding: '0 0.25rem', marginBottom: '0.25rem' }} className="line-clamp-2">{stripHtml(book.title)}</h4>
                      <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 0.5rem' }}>{book.author}</p>
                    </div>
                  </div>
                ))}
              </div>
              {searchResults.length === 0 && searchQuery && !isSearching && (
                <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: '2rem', background: 'rgba(139,107,66,0.04)', border: '1px solid rgba(139,107,66,0.1)', marginTop: '1rem' }}>
                  <Search size={36} style={{ margin: '0 auto 1rem', color: '#BDB0A0' }} />
                  <p style={{ color: '#9E8D7A', fontWeight: 700 }}>검색 결과가 없습니다.</p>
                  <p style={{ color: '#BDB0A0', fontSize: '0.8125rem', marginTop: '0.375rem' }}>다른 키워드로 검색해보세요.</p>
                </div>
              )}
              {searchResults.length === 0 && !searchQuery && !isSearching && (
                <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                  <Search size={48} style={{ margin: '0 auto 1rem', color: '#9E8D7A' }} />
                  <p style={{ color: '#BDB0A0', fontWeight: 700 }}>읽고 싶은 책을 검색해보세요</p>
                </div>
              )}
            </motion.div>
          )}

          {/* CLUBS TAB */}
          {activeTab === 'clubs' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '-0.03em' }}>
                    <Users style={{ color: '#8C6B42' }} size={32} />
                    독서 커뮤니티
                  </h2>
                  <p style={{ color: '#9E8D7A', fontWeight: 700, fontSize: '0.875rem' }}>지하철 한 정거장 거리의 이웃과 함께 책을 읽어보세요.</p>
                </div>
                <button onClick={() => setIsCreatingClub(true)} className="premium-button" style={{ fontSize: '0.8125rem', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <Plus size={17} />
                  모임 개설
                </button>
              </div>

              {user && (
                <div>
                  <div className="section-header">
                    <div className="section-accent" />
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1C140E' }}>내 주변 가까운 모임</h3>
                  </div>
                  <div className="custom-scroll" style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: '1.25rem', paddingBottom: '1.5rem', scrollSnapType: 'x mandatory', margin: '0 -1.5rem', padding: '0 1.5rem 1.5rem' }}>
                    {clubs.slice(0, 5).map((club) => (
                      <div
                        key={club.id}
                        onClick={() => setSelectedClub(club)}
                        className="premium-card group"
                        style={{ width: '280px', minWidth: '280px', height: '340px', display: 'flex', flexDirection: 'column', cursor: 'pointer', scrollSnapAlign: 'start', background: 'rgba(255,255,255,0.97)', flexShrink: 0 }}
                      >
                        <div style={{ width: '100%', height: '160px', position: 'relative', overflow: 'hidden', background: '#EDE8E2', flexShrink: 0 }}>
                          <img src={club.image} className="group-hover:scale-110 transition-transform duration-700" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} alt={club.name} />
                          <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 10 }}>
                            <div style={{ background: 'rgba(140,107,66,0.9)', backdropFilter: 'blur(8px)', color: 'white', padding: '3px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(139,107,66,0.25)' }}>
                              <MapPin size={9} />
                              {club.distance || 0}km
                            </div>
                          </div>
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,20,14,0.6), transparent)' }} />
                        </div>
                        <div style={{ padding: '1.1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <h3 className="group-hover:text-amber-700 transition-colors" style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.375rem' }}>{club.name}</h3>
                            <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>{club.description}</p>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontWeight: 900, borderTop: '1px solid rgba(139,107,66,0.1)', paddingTop: '0.875rem', marginTop: '0.5rem' }}>
                            <span style={{ color: '#9E8D7A', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{club.location}</span>
                            <span style={{ color: 'rgba(140,107,66,0.8)' }}>{club.member_count}명</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(139,107,66,0.1)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <div className="section-header" style={{ marginBottom: 0 }}>
                    <div className="section-accent" style={{ background: 'rgba(139,107,66,0.35)' }} />
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9E8D7A' }}>모든 독서 모임</h3>
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#BDB0A0' }}>총 {clubs.length}개 활동 중</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.875rem' }}>
                  {clubs.slice(5).map((club) => (
                    <div
                      key={club.id}
                      onClick={() => setSelectedClub(club)}
                      className="glass-card group"
                      style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', height: '130px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{ width: '3.25rem', height: '3.25rem', borderRadius: '0.875rem', overflow: 'hidden', border: '1px solid rgba(139,107,66,0.15)', flexShrink: 0, background: '#EDE8E2' }}>
                          <img src={club.image} className="w-full h-full grayscale group-hover:grayscale-0 transition-all" style={{ objectFit: 'cover' }} alt="" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 className="group-hover:text-amber-700 transition-colors" style={{ fontSize: '0.8125rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.name}</h4>
                          <p style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                            <MapPin size={9} /> {club.location}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(139,107,66,0.08)' }}>
                        <span style={{ fontSize: '9px', fontWeight: 900, color: '#9E8D7A', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(139,107,66,0.07)', border: '1px solid rgba(139,107,66,0.12)', padding: '2px 8px', borderRadius: '6px' }}>{club.category}</span>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(140,107,66,0.6)', fontStyle: 'italic' }}>{club.distance || 0}km</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* COMMUNITY TAB */}
          {activeTab === 'community' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.625rem', letterSpacing: '-0.03em' }}>
                    <MessageSquare style={{ color: '#8C6B42' }} size={28} />
                    지식 나눔 광장
                  </h2>
                  <p style={{ color: '#9E8D7A', fontWeight: 700, fontSize: '0.875rem' }}>책을 통해 더 넓은 세상을 만나는 곳입니다.</p>
                </div>
                <button onClick={() => setIsWritingPost(true)} style={{ padding: '0.625rem 1.25rem', background: 'rgba(139,107,66,0.07)', border: '1px solid rgba(139,107,66,0.15)', borderRadius: '0.75rem', fontSize: '0.8125rem', fontWeight: 800, color: '#7B6B55', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', transition: 'all 0.2s ease', flexShrink: 0 }}>
                  <Plus size={16} />
                  글쓰기
                </button>
              </div>

              <div style={{ borderTop: '1px solid rgba(139,107,66,0.1)' }}>
                {communityPosts.map((post) => (
                  <div
                    key={post.id}
                    className="group"
                    style={{ position: 'relative', padding: '1.75rem 0', borderBottom: '1px solid rgba(139,107,66,0.1)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2px', background: 'linear-gradient(to bottom, #8C6B42, #C49456)', opacity: 0, borderRadius: '0 2px 2px 0', transition: 'opacity 0.2s ease' }} className="group-hover:opacity-100" />
                    <div style={{ paddingLeft: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                        <span style={{ fontSize: '9px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(140,107,66,0.1)', border: '1px solid rgba(140,107,66,0.2)', padding: '2px 8px', borderRadius: '6px' }}>General</span>
                      </div>
                      <h3 className="group-hover:text-amber-700 transition-colors" style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '0.5rem', lineHeight: 1.3, letterSpacing: '-0.01em' }}>{post.title}</h3>
                      <p style={{ color: '#9E8D7A', lineHeight: 1.6, fontSize: '0.875rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                          <button onClick={() => handleLikePost(post.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, color: post.liked ? '#fb7185' : '#9E8D7A', cursor: 'pointer', background: 'none', border: 'none', transition: 'color 0.2s ease' }} className="hover:text-rose-400">
                            <Heart size={14} fill={post.liked ? '#fb7185' : 'none'} />
                            {post.likes}
                          </button>
                          <button style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, color: '#9E8D7A', cursor: 'pointer', background: 'none', border: 'none', transition: 'color 0.2s ease' }} className="hover:text-sky-400">
                            <MessageCircle size={14} />
                            {post.comments}
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.75rem' }}>
                          <div style={{ width: '1.625rem', height: '1.625rem', borderRadius: '9999px', background: 'linear-gradient(135deg, #8C6B42, #C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '9px' }}>
                            {(post.author || '?')[0]}
                          </div>
                          <span style={{ color: '#7B6B55', fontWeight: 700 }}>{post.author || '익명'}</span>
                          <span style={{ color: '#9E8D7A' }}>·</span>
                          <span style={{ color: '#BDB0A0', fontSize: '11px' }}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          {/* RECORDING TAB */}
          {activeTab === 'recording' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%' }}>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.625rem', letterSpacing: '-0.03em' }}>
                  <Mic style={{ color: '#8C6B42' }} size={28} />
                  녹음 분석
                </h2>
                <p style={{ color: '#9E8D7A', fontWeight: 700, fontSize: '0.875rem' }}>독서모임 녹음 파일을 업로드하면 AI가 토론 내용을 분석하고 다음 모임 질문을 생성합니다.</p>
              </div>

              {/* 업로드 영역 */}
              <div
                onClick={() => document.getElementById('recording-file-input').click()}
                style={{ border: `2px dashed ${recordingFile ? 'rgba(140,107,66,0.5)' : 'rgba(139,107,66,0.2)'}`, borderRadius: '1.25rem', padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer', background: recordingFile ? 'rgba(140,107,66,0.06)' : 'rgba(139,107,66,0.04)', transition: 'all 0.2s ease', marginBottom: '1.25rem' }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setRecordingFile(f); }}
              >
                <input
                  id="recording-file-input"
                  type="file"
                  accept="audio/*"
                  style={{ display: 'none' }}
                  onChange={(e) => setRecordingFile(e.target.files[0] || null)}
                />
                {recordingFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <FileAudio size={36} style={{ color: '#8C6B42' }} />
                    <p style={{ fontWeight: 900, fontSize: '1rem', color: '#A07840' }}>{recordingFile.name}</p>
                    <p style={{ fontSize: '0.8125rem', color: '#9E8D7A' }}>{(recordingFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    <button onClick={(e) => { e.stopPropagation(); setRecordingFile(null); setRecordingResult(null); }} style={{ fontSize: '11px', color: '#9E8D7A', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>파일 변경</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <Upload size={36} style={{ color: '#BDB0A0' }} />
                    <p style={{ fontWeight: 900, color: '#9E8D7A' }}>녹음 파일을 드래그하거나 클릭해서 업로드</p>
                    <p style={{ fontSize: '0.8125rem', color: '#BDB0A0' }}>MP3, MP4, WAV, OGG, WebM 지원</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleUploadRecording}
                disabled={!recordingFile || isAnalyzingRecording}
                className="premium-button disabled:opacity-40"
                style={{ width: '100%', padding: '1rem', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', marginBottom: '2rem' }}
              >
                {isAnalyzingRecording ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>전사 및 분석 중... (수 분 소요될 수 있습니다)</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>분석 시작하기</span>
                  </>
                )}
              </button>

              {/* 분석 결과 */}
              {recordingResult && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* 전사 텍스트 (화자 레이블 있으면 우선 표시) */}
                  <div style={{ padding: '1.25rem', background: 'rgba(139,107,66,0.04)', border: '1px solid rgba(139,107,66,0.12)', borderRadius: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                      <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #8C6B42, #C49456)', borderRadius: '9999px' }} />
                      <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#A07840', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        {recordingResult.labeled_transcript ? '화자별 전사 텍스트' : '전사 텍스트'}
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.8125rem', lineHeight: 1.75, color: '#9E8D7A', maxHeight: '10rem', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                      {recordingResult.labeled_transcript || recordingResult.transcript}
                    </p>
                  </div>

                  {/* 내 발언 (화자 식별 성공 시) */}
                  {recordingResult.user_contributions?.length > 0 && (
                    <div style={{ padding: '1.25rem', background: 'rgba(140,107,66,0.06)', border: '1px solid rgba(140,107,66,0.2)', borderRadius: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                        <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #818cf8, #8C6B42)', borderRadius: '9999px' }} />
                        <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#A07840', textTransform: 'uppercase', letterSpacing: '0.12em' }}>내 발언</h3>
                      </div>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {recordingResult.user_contributions.map((line, i) => (
                          <li key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                            <span style={{ flexShrink: 0, width: '1.25rem', height: '1.25rem', borderRadius: '9999px', background: 'rgba(140,107,66,0.15)', border: '1px solid rgba(140,107,66,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 900, color: '#A07840', marginTop: '2px' }}>{i + 1}</span>
                            <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#8C6B42', fontWeight: 500 }}>{line}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 요약 */}
                  <div style={{ padding: '1.25rem', background: 'rgba(140,107,66,0.04)', border: '1px solid rgba(140,107,66,0.12)', borderRadius: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                      <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #8C6B42, #C49456)', borderRadius: '9999px' }} />
                      <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#A07840', textTransform: 'uppercase', letterSpacing: '0.12em' }}>토론 요약</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#7B6B55', fontWeight: 500 }}>{recordingResult.summary}</p>
                  </div>

                  {/* 핵심 주제 */}
                  {recordingResult.key_topics?.length > 0 && (
                    <div style={{ padding: '1.25rem', background: 'rgba(139,107,66,0.04)', border: '1px solid rgba(139,107,66,0.12)', borderRadius: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                        <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #8C6B42, #C49456)', borderRadius: '9999px' }} />
                        <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#A07840', textTransform: 'uppercase', letterSpacing: '0.12em' }}>핵심 주제</h3>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {recordingResult.key_topics.map((topic, i) => (
                          <span key={i} style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#8C6B42', background: 'rgba(140,107,66,0.1)', border: '1px solid rgba(140,107,66,0.2)', padding: '4px 12px', borderRadius: '9999px' }}>{topic}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 후속 질문 */}
                  {recordingResult.followup_questions?.length > 0 && (
                    <div style={{ padding: '1.25rem', background: 'rgba(196,148,86,0.04)', border: '1px solid rgba(196,148,86,0.15)', borderRadius: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                        <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #C49456, #f59e0b)', borderRadius: '9999px' }} />
                        <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#C49456', textTransform: 'uppercase', letterSpacing: '0.12em' }}>다음 모임을 위한 질문</h3>
                      </div>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {recordingResult.followup_questions.map((q, i) => (
                          <li key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                            <span style={{ flexShrink: 0, width: '1.375rem', height: '1.375rem', borderRadius: '9999px', background: 'rgba(196,148,86,0.12)', border: '1px solid rgba(196,148,86,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 900, color: '#C49456', marginTop: '2px' }}>{i + 1}</span>
                            <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: '#3D2D1E', fontWeight: 500 }}>{q}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

        </main>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(139,107,66,0.1)', padding: '3rem 0' }}>
        <div className="max-w-5xl mx-auto px-6" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.875rem', alignItems: 'center' }}>
          <span className="font-black text-xl gradient-text">bookStory</span>
          <p style={{ color: '#BDB0A0', fontSize: '0.8125rem', fontWeight: 500 }}>© 2026 bookStory. Elevating your reading experience with Intelligence.</p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ width: '2.25rem', height: '2.25rem', background: 'rgba(139,107,66,0.07)', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(139,107,66,0.12)', transition: 'all 0.2s ease', color: '#BDB0A0' }} className="hover:bg-white\/10 hover:text-white">
              <Bookmark size={16} />
            </div>
            <div style={{ width: '2.25rem', height: '2.25rem', background: 'rgba(139,107,66,0.07)', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(139,107,66,0.12)', transition: 'all 0.2s ease', color: '#BDB0A0' }} className="hover:bg-white\/10 hover:text-white">
              <Users size={16} />
            </div>
          </div>
        </div>
      </footer>

      {/* REGISTRATION MODAL */}
      <AnimatePresence>
        {!user && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F4EF', padding: '1.5rem' }}>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '55%', height: '55%', background: 'rgba(140,107,66,0.18)', filter: 'blur(160px)', borderRadius: '9999px' }} />
              <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '55%', height: '55%', background: 'rgba(196,148,86,0.18)', filter: 'blur(160px)', borderRadius: '9999px' }} />
            </div>

            <motion.div
              initial={{ scale: 0.93, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              style={{ width: '100%', maxWidth: '420px', background: '#FEFCF9', backdropFilter: 'blur(24px)', border: '1px solid rgba(139,107,66,0.15)', borderRadius: '1.75rem', padding: '2.5rem', position: 'relative', zIndex: 10, boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ width: '4.5rem', height: '4.5rem', background: 'linear-gradient(135deg, #8C6B42, #C49456)', borderRadius: '1.25rem', margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(140,107,66,0.4)', transform: 'rotate(3deg)' }}>
                  <BookOpen size={36} color="white" />
                </div>
                <h2 className="font-black gradient-text" style={{ fontSize: '2rem', letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>bookStory</h2>
                <p style={{ color: '#9E8D7A', fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.6 }}>당신만의 독서 여정을 시작하기 위해<br />회원 정보를 입력해주세요.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="form-label">닉네임 또는 이름</label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={16} />
                    <input type="text" placeholder="어떻게 불러드릴까요?" value={regForm.name} onChange={(e) => setRegForm({...regForm, name: e.target.value})} className="form-input" style={{ paddingLeft: '2.75rem', color: '#1C140E' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  <div>
                    <label className="form-label">성별</label>
                    <select className="form-input appearance-none" style={{ color: '#1C140E' }} value={regForm.gender} onChange={(e) => setRegForm({...regForm, gender: e.target.value})}>
                      <option>남성</option>
                      <option>여성</option>
                      <option>기타</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">나이</label>
                    <input type="number" placeholder="20" value={regForm.age} onChange={(e) => setRegForm({...regForm, age: parseInt(e.target.value)})} className="form-input" style={{ color: '#1C140E' }} />
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <label className="form-label">주 활동 지역</label>
                  <div style={{ position: 'relative' }}>
                    <MapIcon style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={16} />
                    <input type="text" placeholder="동네나 역 이름 검색 (예: 합정역)" onChange={(e) => searchLocation(e.target.value, 'reg')} className="form-input" style={{ paddingLeft: '2.75rem', color: '#1C140E' }} />
                    {isSearchingLocation && <Loader2 style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={15} className="animate-spin" />}
                  </div>
                  {locationSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', zIndex: 1100, top: '100%', left: 0, right: 0, marginTop: '0.5rem', background: '#FEFCF9', border: '1px solid rgba(139,107,66,0.2)', borderRadius: '0.875rem', boxShadow: '0 16px 40px rgba(0,0,0,0.15)', maxHeight: '180px', overflowY: 'auto' }}>
                      {locationSuggestions.map((item, i) => (
                        <div key={i} onClick={() => { selectLocation(item, 'reg'); document.querySelector('input[placeholder="동네나 역 이름 검색 (예: 합정역)"]').value = item.place_name; }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(139,107,66,0.08)', transition: 'background 0.15s ease' }} className="hover:bg-white\/5">
                          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1C140E', marginBottom: '2px' }}>{item.place_name}</p>
                          <p style={{ fontSize: '10px', color: '#9E8D7A' }}>{item.address_name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {regForm.location && (
                    <div style={{ marginTop: '0.5rem', padding: '0.375rem 0.875rem', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.2)', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={11} style={{ color: '#8C6B42' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6B42' }}>선택됨: {regForm.location}</span>
                    </div>
                  )}
                </div>

                <button onClick={handleRegisterUser} className="premium-button" style={{ width: '100%', padding: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', marginTop: '0.5rem' }}>
                  <span>bookStory 시작하기</span>
                  <ChevronRight size={18} />
                </button>
              </div>

              <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                <button
                  onClick={handleTestLogin}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#BDB0A0', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0', transition: 'color 0.2s ease' }}
                  onMouseEnter={(e) => e.target.style.color = '#8C6B42'}
                  onMouseLeave={(e) => e.target.style.color = '#BDB0A0'}
                >
                  테스트 유저로 진입 →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE CLUB MODAL */}
      <AnimatePresence>
        {isCreatingClub && (
          <div className="modal-backdrop overflow-y-auto" onClick={() => setIsCreatingClub(false)}>
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
                <button onClick={() => setIsCreatingClub(false)} style={{ background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.12)', width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A', transition: 'all 0.2s ease' }} className="hover:bg-white\/10 hover:text-white"><X size={16} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                <div>
                  <label className="form-label">모임 이름</label>
                  <input className="form-input" style={{ color: '#1C140E' }} placeholder="예: 강남 심리학 독서회" value={clubForm.name} onChange={(e) => setClubForm({...clubForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">카테고리</label>
                  <select className="form-input appearance-none" style={{ color: '#1C140E' }} value={clubForm.category} onChange={(e) => setClubForm({...clubForm, category: e.target.value})}>
                    <option>독서/기록</option>
                    <option>소설/토론</option>
                    <option>인문/철학</option>
                    <option>자기계발</option>
                    <option>비즈니스</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">모임 설명</label>
                  <textarea className="form-input" style={{ height: '5.5rem', resize: 'none', color: '#1C140E' }} placeholder="어떤 활동을 하는 모임인지 알려주세요" value={clubForm.description} onChange={(e) => setClubForm({...clubForm, description: e.target.value})} />
                </div>
                <div style={{ position: 'relative' }}>
                  <label className="form-label">활동 지역</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" style={{ color: '#1C140E', paddingRight: '3rem' }} placeholder="동네, 역 이름 또는 장소명 (예: 합정역)" onChange={(e) => searchLocation(e.target.value, 'club')} />
                    <MapPin style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#8C6B42' }} size={16} />
                  </div>
                  {locationSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', zIndex: 1200, top: '100%', left: 0, right: 0, marginTop: '0.5rem', background: '#FEFCF9', border: '1px solid rgba(139,107,66,0.2)', borderRadius: '0.875rem', boxShadow: '0 16px 40px rgba(0,0,0,0.15)', maxHeight: '180px', overflowY: 'auto' }}>
                      {locationSuggestions.map((item, i) => (
                        <div key={i} onClick={() => { selectLocation(item, 'club'); document.querySelector('input[placeholder="동네, 역 이름 또는 장소명 (예: 합정역)"]').value = item.place_name; }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(139,107,66,0.08)', transition: 'background 0.15s ease' }} className="hover:bg-white\/5">
                          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1C140E', marginBottom: '2px' }}>{item.place_name}</p>
                          <p style={{ fontSize: '10px', color: '#9E8D7A' }}>{item.address_name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {clubForm.location && (
                    <div style={{ marginTop: '0.5rem', padding: '0.375rem 0.875rem', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.2)', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6B42' }}>선택됨: {clubForm.location}</span>
                    </div>
                  )}
                </div>

                <button onClick={handleCreateClub} disabled={isSavingClub} className="premium-button disabled:opacity-50" style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {isSavingClub ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  <span>모임 개설 완료</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLUB DETAIL MODAL */}
      <AnimatePresence>
        {selectedClub && (
          <div className="modal-backdrop overflow-y-auto" onClick={() => setSelectedClub(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content relative my-auto"
              style={{ maxWidth: '560px', padding: 0, overflow: 'hidden' }}
            >
              <div style={{ height: '11rem', position: 'relative' }}>
                <img src={selectedClub.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,20,14,0.75), transparent 60%)' }} />
                <button onClick={() => setSelectedClub(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', border: 'none', width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }} className="hover:bg-black\/60"><X size={16} /></button>
              </div>

              <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <span style={{ fontSize: '9px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.12em', background: 'rgba(140,107,66,0.12)', border: '1px solid rgba(140,107,66,0.2)', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', width: 'fit-content' }}>{selectedClub.category}</span>
                    <h2 style={{ fontSize: '1.375rem', fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.02em' }}>{selectedClub.name}</h2>
                    <p style={{ color: '#9E8D7A', fontSize: '0.8125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={11} /> {selectedClub.location}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p className="gradient-text-accent" style={{ fontSize: '1.5rem', fontWeight: 900, fontStyle: 'italic', lineHeight: 1 }}>{selectedClub.member_count}명</p>
                    <p style={{ fontSize: '9px', color: '#9E8D7A', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>Members</p>
                  </div>
                </div>

                <p style={{ color: '#7B6B55', lineHeight: 1.65, fontWeight: 500, fontSize: '0.875rem', background: 'rgba(139,107,66,0.05)', padding: '0.875rem 1rem', borderRadius: '0.875rem', border: '1px solid rgba(139,107,66,0.1)' }}>{selectedClub.description}</p>

                <div>
                  <h4 style={{ fontSize: '9px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem', paddingBottom: '0.625rem', borderBottom: '1px solid rgba(139,107,66,0.1)' }}>모임 위치</h4>
                  <div id="club-map" style={{ width: '100%', height: '9rem', borderRadius: '0.875rem', overflow: 'hidden', border: '1px solid rgba(139,107,66,0.15)', background: '#EDE8E2' }} />
                </div>

                <button
                  onClick={() => handleJoinClub(selectedClub.id)}
                  className="premium-button"
                  style={{ width: '100%', padding: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: joinedClubs.has(selectedClub.id) ? 'rgba(139,107,66,0.08)' : undefined, boxShadow: joinedClubs.has(selectedClub.id) ? 'none' : undefined }}
                >
                  <Users size={16} />
                  <span>{joinedClubs.has(selectedClub.id) ? '모임 탈퇴하기' : '모임 참여하기'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WRITE POST MODAL */}
      <AnimatePresence>
        {isWritingPost && (
          <div className="modal-backdrop overflow-y-auto" onClick={() => setIsWritingPost(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content relative my-auto"
              style={{ maxWidth: '520px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em' }}>글쓰기</h2>
                <button onClick={() => setIsWritingPost(false)} style={{ background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.12)', width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A' }} className="hover:bg-white\/10 hover:text-white"><X size={16} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">제목</label>
                  <input
                    className="form-input"
                    style={{ color: '#1C140E' }}
                    placeholder="어떤 이야기를 나누고 싶으신가요?"
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">관련 책 (선택)</label>
                  <input
                    className="form-input"
                    style={{ color: '#1C140E' }}
                    placeholder="관련 책 제목을 입력하세요"
                    value={postForm.book_title}
                    onChange={(e) => setPostForm({ ...postForm, book_title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">내용</label>
                  <textarea
                    className="form-input"
                    style={{ height: '8rem', resize: 'none', color: '#1C140E' }}
                    placeholder="생각, 질문, 감상을 자유롭게 나눠보세요."
                    value={postForm.content}
                    onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  />
                </div>
                <button onClick={handleWritePost} disabled={isSubmittingPost} className="premium-button disabled:opacity-50" style={{ width: '100%', padding: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {isSubmittingPost ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  <span>게시하기</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TENDENCY MODAL */}
      <AnimatePresence>
        {showTendencyModal && tendencyResult && (
          <div className="modal-backdrop overflow-y-auto" onClick={() => setShowTendencyModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content relative my-auto"
              style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                    <Sparkles size={13} style={{ color: '#8C6B42' }} />
                    <span style={{ fontSize: '9px', color: '#8C6B42', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>AI 독서 성향 분석</span>
                  </div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{user?.name}님의 독서 패턴</h2>
                </div>
                <button onClick={() => setShowTendencyModal(false)} style={{ background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.12)', width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A' }} className="hover:bg-white\/10 hover:text-white"><X size={16} /></button>
              </div>

              {tendencyResult.qa_count === 0 ? (
                <p style={{ color: '#9E8D7A', fontSize: '0.875rem', lineHeight: 1.7, textAlign: 'center', padding: '2rem 0' }}>{tendencyResult.tendency_summary}</p>
              ) : (
                <>
                  <div style={{ padding: '1rem', background: 'rgba(140,107,66,0.05)', border: '1px solid rgba(140,107,66,0.12)', borderRadius: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                      <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #8C6B42, #C49456)', borderRadius: '9999px' }} />
                      <span style={{ fontSize: '9px', fontWeight: 900, color: '#A07840', textTransform: 'uppercase', letterSpacing: '0.12em' }}>성향 요약</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#7B6B55' }}>{tendencyResult.tendency_summary}</p>
                  </div>

                  {tendencyResult.reading_lenses?.length > 0 && (
                    <div>
                      <p style={{ fontSize: '9px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.625rem' }}>자주 쓰는 관점</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {tendencyResult.reading_lenses.map((lens, i) => (
                          <span key={i} style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#8C6B42', background: 'rgba(140,107,66,0.1)', border: '1px solid rgba(140,107,66,0.2)', padding: '4px 12px', borderRadius: '9999px' }}>{lens}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {tendencyResult.strong_areas?.length > 0 && (
                      <div style={{ padding: '0.875rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '0.875rem' }}>
                        <p style={{ fontSize: '9px', fontWeight: 900, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>잘하는 영역</p>
                        {tendencyResult.strong_areas.map((a, i) => (
                          <p key={i} style={{ fontSize: '0.8125rem', color: '#7B6B55', lineHeight: 1.6, fontWeight: 500 }}>· {a}</p>
                        ))}
                      </div>
                    )}
                    {tendencyResult.growth_areas?.length > 0 && (
                      <div style={{ padding: '0.875rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '0.875rem' }}>
                        <p style={{ fontSize: '9px', fontWeight: 900, color: '#fcd34d', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>성장 가능 영역</p>
                        {tendencyResult.growth_areas.map((a, i) => (
                          <p key={i} style={{ fontSize: '0.8125rem', color: '#7B6B55', lineHeight: 1.6, fontWeight: 500 }}>· {a}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: '10px', color: '#BDB0A0', textAlign: 'right' }}>분석 기반: Q&A {tendencyResult.qa_count}개</p>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONVERSATION Q&A MODAL */}
      <AnimatePresence>
        {isConversing && selectedBook && (
          <div className="modal-backdrop overflow-y-auto" onClick={() => setIsConversing(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content relative my-auto"
              style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid rgba(139,107,66,0.1)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                    <MessageCircle size={13} style={{ color: '#C49456' }} />
                    <span style={{ fontSize: '9px', color: '#C49456', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>AI 토론 진행</span>
                  </div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{stripHtml(selectedBook.title)}</h2>
                </div>
                <button onClick={() => setIsConversing(false)} style={{ background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.12)', width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A' }} className="hover:bg-white\/10 hover:text-white"><X size={16} /></button>
              </div>

              {/* Q&A turns */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {sessionQA.map((turn, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {/* Question bubble */}
                    <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '9999px', background: 'linear-gradient(135deg, #8C6B42, #C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Sparkles size={10} color="white" />
                      </div>
                      <div style={{ flex: 1, background: 'rgba(140,107,66,0.07)', border: '1px solid rgba(140,107,66,0.15)', borderRadius: '0 0.875rem 0.875rem 0.875rem', padding: '0.75rem 1rem' }}>
                        <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#3D2D1E', fontWeight: 500 }}>{turn.question}</p>
                      </div>
                    </div>
                    {/* Answer bubble */}
                    {turn.answer && (
                      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
                        <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '9999px', background: '#EDE8E2', border: '1px solid rgba(139,107,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '9px', fontWeight: 900, color: '#7B6B55' }}>
                          {(user?.name || '나')[0]}
                        </div>
                        <div style={{ flex: 1, background: 'rgba(139,107,66,0.07)', border: '1px solid rgba(139,107,66,0.12)', borderRadius: '0.875rem 0 0.875rem 0.875rem', padding: '0.75rem 1rem' }}>
                          <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#7B6B55', fontWeight: 500 }}>{turn.answer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {isSubmittingAnswer && (
                  <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', paddingLeft: '2.375rem' }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: '#8C6B42' }} />
                    <span style={{ fontSize: '11px', color: '#9E8D7A', fontWeight: 700 }}>다음 질문 생성 중...</span>
                  </div>
                )}
              </div>

              {/* Answer input */}
              {sessionQA.length > 0 && sessionQA[sessionQA.length - 1].answer === null && !isSubmittingAnswer && (
                <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(139,107,66,0.1)' }}>
                  <textarea
                    value={conversationInput}
                    onChange={(e) => setConversationInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitAnswer(); } }}
                    placeholder="답변을 입력하세요... (Shift+Enter: 줄바꿈)"
                    className="form-input"
                    style={{ flex: 1, height: '5rem', resize: 'none', color: '#1C140E', fontSize: '0.8125rem' }}
                  />
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!conversationInput.trim()}
                    style={{ alignSelf: 'flex-end', width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: conversationInput.trim() ? 'linear-gradient(135deg, #8C6B42, #C49456)' : 'rgba(139,107,66,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: conversationInput.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s ease', flexShrink: 0 }}
                  >
                    <Send size={15} color="white" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOOK ANALYSIS MODAL */}
      <AnimatePresence>
        {selectedBook && (
          <div className="modal-backdrop overflow-y-auto" onClick={() => setSelectedBook(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content relative my-auto"
              style={{ boxShadow: '0 0 80px rgba(140,107,66,0.12), 0 40px 80px rgba(0,0,0,0.6)' }}
            >
              <button onClick={() => setSelectedBook(null)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,107,66,0.09)', border: 'none', borderRadius: '9999px', cursor: 'pointer', color: '#9E8D7A', transition: 'all 0.2s ease', zIndex: 10 }} className="hover:bg-red-500\/20 hover:text-red-400"><X size={16} /></button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.125rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(139,107,66,0.1)' }}>
                  <div style={{ width: '3.5rem', flexShrink: 0 }}>
                    <div style={{ aspectRatio: '2/3', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid rgba(139,107,66,0.15)' }}>
                      {selectedBook.image ? (
                        <img src={selectedBook.image} alt={selectedBook.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#EDE8E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={16} color="#8C6B42" /></div>
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.375rem' }}>
                      <Sparkles size={11} style={{ color: '#8C6B42' }} />
                      <span style={{ fontSize: '9px', color: '#8C6B42', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>AI Insight</span>
                    </div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 900, lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>{stripHtml(selectedBook.title)}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#9E8D7A' }}>{selectedBook.author}</span>
                      <span style={{ width: '3px', height: '3px', borderRadius: '9999px', background: 'rgba(139,107,66,0.3)', display: 'inline-block' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#9E8D7A' }}>{selectedBook.publisher}</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(140,107,66,0.04)', borderRadius: '0.875rem', border: '1px solid rgba(140,107,66,0.1)', minHeight: '6rem', position: 'relative' }}>
                  {isAnalyzing ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      <Loader2 className="animate-spin" size={20} style={{ color: '#8C6B42' }} />
                      <p className="animate-pulse" style={{ color: '#8C6B42', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>분석 중...</p>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                        <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #8C6B42, #C49456)', borderRadius: '9999px' }} />
                        <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#A07840', textTransform: 'uppercase', letterSpacing: '0.12em' }}>The Insight</h3>
                      </div>
                      <p style={{ fontSize: '0.8125rem', lineHeight: 1.7, color: '#7B6B55', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{analysisResult}</p>
                    </motion.div>
                  )}
                </div>

                {!isAnalyzing && questions.thematic.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* 주제 기반 질문 */}
                    <div style={{ padding: '1rem', background: 'rgba(140,107,66,0.04)', borderRadius: '0.875rem', border: '1px solid rgba(140,107,66,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #8C6B42, #C49456)', borderRadius: '9999px' }} />
                        <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#A07840', textTransform: 'uppercase', letterSpacing: '0.12em' }}>토론 질문</h3>
                      </div>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {questions.thematic.map((q, i) => (
                          <li key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                            <span style={{ flexShrink: 0, width: '1.25rem', height: '1.25rem', borderRadius: '9999px', background: 'rgba(140,107,66,0.15)', border: '1px solid rgba(140,107,66,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 900, color: '#8C6B42', marginTop: '1px' }}>{i + 1}</span>
                            <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#3D2D1E', fontWeight: 500 }}>{q}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 관점 전환 질문 */}
                    {questions.perspective_shift.length > 0 && (
                      <div style={{ padding: '1rem', background: 'rgba(196,148,86,0.04)', borderRadius: '0.875rem', border: '1px solid rgba(196,148,86,0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #C49456, #f59e0b)', borderRadius: '9999px' }} />
                          <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#C49456', textTransform: 'uppercase', letterSpacing: '0.12em' }}>관점 전환</h3>
                        </div>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                          {questions.perspective_shift.map((item, i) => (
                            <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span style={{ fontSize: '9px', fontWeight: 900, color: '#C49456', background: 'rgba(196,148,86,0.12)', border: '1px solid rgba(196,148,86,0.2)', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', width: 'fit-content', letterSpacing: '0.05em' }}>{item.perspective}</span>
                              <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#3D2D1E', fontWeight: 500 }}>{item.question}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}

                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button onClick={() => handleRegisterBook(selectedBook)} disabled={isSaving} className="premium-button disabled:opacity-50" style={{ flex: 1, padding: '0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {isSaving ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
                    <span>내 서재에 기록하기</span>
                  </button>
                  {!isAnalyzing && questions.thematic.length > 0 && (
                    <button onClick={handleStartDiscussion} style={{ flex: 1, padding: '0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(196,148,86,0.12)', border: '1px solid rgba(196,148,86,0.25)', borderRadius: '0.875rem', color: '#C49456', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                      <MessageCircle size={15} />
                      <span>토론 시작하기</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
