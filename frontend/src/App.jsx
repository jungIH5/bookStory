import React, { useState } from 'react';
import { Users, Search, BookOpen, MessageSquare, Plus, MapPin, X, Sparkles, Loader2, Bookmark, Camera, Heart, MessageCircle, ChevronRight, Hash, User, MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [activeTab, setActiveTab] = useState('stack'); 
  const [viewMode, setViewMode] = useState('tower'); // 'tower' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [readBooks, setReadBooks] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentBookPages, setCurrentBookPages] = useState(250);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('bookstory_user')) || null);

  const [regForm, setRegForm] = useState({
    name: '',
    gender: '남성',
    age: 20,
    location: '',
    lat: null,
    lng: null
  });

  const [selectedClub, setSelectedClub] = useState(null);
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [clubForm, setClubForm] = useState({
    name: '', description: '', category: '독서/기록', location: '', lat: null, lng: null, image: ''
  });
  const [isSavingClub, setIsSavingClub] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setActiveTab('search'); // Switch to search tab when searching
    try {
      const response = await fetch(`http://localhost:5001/api/books/search?query=${encodeURIComponent(searchQuery)}`);
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
    try {
      const response = await fetch(`http://localhost:5001/api/books/analyze?title=${encodeURIComponent(book.title.replace(/<\/?[^>]+(>|$)/g, ""))}&author=${encodeURIComponent(book.author)}`);
      const data = await response.json();
      setAnalysisResult(data.analysis);
      setCurrentBookPages(data.pages || 250);
    } catch (error) {
      setAnalysisResult('도서 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleSearch(); };

  React.useEffect(() => { 
    fetchReadBooks(); 
    fetchCommunityPosts();
  }, []);

  React.useEffect(() => {
    fetchClubs();
  }, [user]); // Re-fetch and sort when user changes (e.g. after login/reg)

  const fetchReadBooks = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/books/read');
      const data = await response.json();
      setReadBooks(data);
    } catch (error) { console.error('Failed to fetch books'); }
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const R = 6371; // km
    const dLat = (parseFloat(lat2) - parseFloat(lat1)) * Math.PI / 180;
    const dLon = (parseFloat(lon2) - parseFloat(lon1)) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(parseFloat(lat1) * Math.PI / 180) * Math.cos(parseFloat(lat2) * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  const fetchClubs = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/clubs');
      const data = await response.json();
      
      // If user exists, sort by distance
      if (user && user.lat && user.lng) {
        const sorted = data.map(club => ({
          ...club,
          distance: getDistance(user.lat, user.lng, club.lat, club.lng)
        })).sort((a, b) => a.distance - b.distance);
        setClubs(sorted);
      } else {
        setClubs(data);
      }
    } catch (error) { console.error('Failed to fetch clubs'); }
  };

  const fetchCommunityPosts = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/community/posts');
      const data = await response.json();
      setCommunityPosts(data);
    } catch (error) { console.error('Failed to fetch posts'); }
  };

  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const searchLocation = (keyword, type) => {
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
    const simplifiedAddr = item.address_name.split(' ').slice(1, 3).join(' '); // e.g., "마포구 합정동"
    if (type === 'reg') {
      setRegForm({ 
        ...regForm, 
        location: simplifiedAddr, 
        lat: parseFloat(item.y), 
        lng: parseFloat(item.x) 
      });
    } else {
      setClubForm({ 
        ...clubForm, 
        location: simplifiedAddr, 
        lat: parseFloat(item.y), 
        lng: parseFloat(item.x) 
      });
    }
    setLocationSuggestions([]);
  };

  const handleRegisterUser = async () => {
    if (!regForm.name || !regForm.location) return alert('이름과 지역을 입력해주세요.');
    try {
      const response = await fetch('http://localhost:5001/api/users', {
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

  const openAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: (data) => {
        const fullAddr = data.sigungu + ' ' + data.bname;
        // Search coords using Kakao Map Geocoder
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(data.address, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            setRegForm({ 
              ...regForm, 
              location: fullAddr,
              lat: parseFloat(result[0].y),
              lng: parseFloat(result[0].x)
            });
          } else {
            setRegForm({ ...regForm, location: fullAddr });
          }
        });
      }
    }).open();
  };

  const handleRegisterBook = async (book) => {
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:5001/api/books/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          image: book.image,
          publisher: book.publisher,
          isbn: book.isbn,
          pages: currentBookPages
        })
      });
      if (response.ok) {
        await fetchReadBooks();
        setSelectedBook(null);
        setActiveTab('stack');
        setViewMode('tower');
      }
    } catch (error) { alert('등록 중 오류가 발생했습니다.'); } finally { setIsSaving(false); }
  };

  const openClubAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: (data) => {
        const fullAddr = data.address;
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(fullAddr, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            setClubForm({ 
              ...clubForm, 
              location: data.sigungu + ' ' + data.bname,
              lat: parseFloat(result[0].y),
              lng: parseFloat(result[0].x)
            });
          }
        });
      }
    }).open();
  };

  const handleCreateClub = async () => {
    if (!clubForm.name || !clubForm.location) return alert('모집 정보를 모두 입력해주세요.');
    setIsSavingClub(true);
    try {
      const response = await fetch('http://localhost:5001/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...clubForm,
          image: clubForm.image || `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000)}?q=80&w=800`
        })
      });
      if (response.ok) {
        await fetchClubs();
        setIsCreatingClub(false);
        setClubForm({ name: '', description: '', category: '독서/기록', location: '', lat: null, lng: null, image: '' });
      }
    } catch (error) { alert('모임 개설 중 오류가 발생했습니다.'); } finally { setIsSavingClub(false); }
  };

  const handleJoinClub = async (clubId) => {
    alert('참여 신청이 완료되었습니다! 모임장과 곧 연결해 드릴게요.');
  };

  // Kakao Map Effect for Detail Modal
  React.useEffect(() => {
    if (selectedClub && selectedClub.lat && selectedClub.lng) {
      setTimeout(() => {
        const container = document.getElementById('club-map');
        if (container) {
          const options = {
            center: new window.kakao.maps.LatLng(selectedClub.lat, selectedClub.lng),
            level: 3
          };
          const map = new window.kakao.maps.Map(container, options);
          const markerPosition  = new window.kakao.maps.LatLng(selectedClub.lat, selectedClub.lng); 
          const marker = new window.kakao.maps.Marker({ position: markerPosition });
          marker.setMap(map);
        }
      }, 300); // Wait for modal animation
    }
  }, [selectedClub]);

  const stackColors = [
    'bg-indigo-500', 'bg-pink-500', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 
    'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-purple-500', 'bg-teal-500'
  ];

  return (
    <div className="min-h-screen p-6 md:p-12 text-slate-100 flex flex-col items-center">
      {/* Background decoration */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-pink-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* SEARCH BAR (Sketch Top) */}
      <div className="w-full max-w-5xl mb-10 relative group">
        <input 
          type="text" 
          placeholder="책 검색하기" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setActiveTab('search')}
          onKeyPress={handleKeyPress}
          className="w-full bg-slate-900/60 border border-white/20 rounded-2xl py-6 px-16 text-xl font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all shadow-2xl backdrop-blur-md"
        />
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
          <Camera className="text-slate-500 hover:text-white cursor-pointer transition-colors" size={24} />
          {isSearching && <Loader2 className="animate-spin text-indigo-400" size={20} />}
        </div>
      </div>

      {/* Main Navigation (Sketch Tabs) */}
      <div className="w-full max-w-5xl flex items-center justify-between gap-4 mb-10">
        <div className="flex gap-2">
          {[
            { id: 'clubs', label: '모임찾기', icon: <Users size={18} /> },
            { id: 'community', label: '커뮤니티', icon: <MessageSquare size={18} /> },
            { id: 'stack', label: '책쌓기', icon: <BookOpen size={18} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 border transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-slate-900 border-white shadow-xl' 
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* User Info / Profile Button */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
           <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs">
              {user?.name[0]}
           </div>
           <div className="hidden md:block">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Active Reader</p>
              <p className="text-sm font-black">{user?.name}</p>
           </div>
        </div>
        
        {/* View Toggle (Sub-Tabs for Stack) */}
        {activeTab === 'stack' && (
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setViewMode('tower')}
              className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'tower' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              쌓아보기
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              리스트형보기
            </button>
          </div>
        )}
      </div>

      <main className="w-full max-w-5xl">
        {/* STACK TAB (Default) */}
        {activeTab === 'stack' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex flex-col items-center"
          >
            {viewMode === 'tower' ? (
              <div 
                className="mx-auto" 
                style={{ 
                  width: '100%', 
                  maxWidth: '480px', 
                  height: '70vh', 
                  maxHeight: '650px',
                  minHeight: '400px',
                  backgroundColor: '#0a0f1e', 
                  borderRadius: '2.5rem',
                  border: '3px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6)',
                  marginBottom: '40px'
                }}
              >
                {/* Scrollable Book Tower Area */}
                <div 
                  className="w-full flex-1" 
                  style={{ 
                    overflowY: 'auto', 
                    display: 'block', // Use block for the scrollable container
                    position: 'relative'
                  }}
                >
                  <div 
                    style={{ 
                      minHeight: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      padding: '60px 15px 4px 15px' 
                    }}
                  >
                    {readBooks && readBooks.length > 0 ? (
                      [...readBooks].map((book, idx) => {
                        const hexColors = ['#6366f1', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#0ea5e9', '#a855f7', '#14b8a6'];
                        const bookColor = hexColors[idx % 10];
                        return (
                          <div
                            key={book.id || idx}
                            className="hover:scale-[1.03] hover:brightness-110 group"
                            style={{ 
                              width: `${Math.min(96, 82 + (idx % 4) * 4)}%`,
                              height: `${Math.max(34, (book.pages || 250) / 6)}px`,
                              marginBottom: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '3px 8px 8px 3px',
                              backgroundColor: bookColor,
                              backgroundImage: `linear-gradient(90deg, 
                                rgba(0,0,0,0.4) 0%, 
                                rgba(255,255,255,0.2) 2%, 
                                rgba(0,0,0,0.1) 4%, 
                                transparent 10%, 
                                transparent 90%, 
                                rgba(0,0,0,0.2) 100%)`,
                              borderLeft: '5px solid rgba(0,0,0,0.3)',
                              borderTop: '1px solid rgba(255,255,255,0.2)',
                              borderBottom: '1px solid rgba(0,0,0,0.3)',
                              boxShadow: '0 6px 8px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                              cursor: 'pointer',
                              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                              position: 'relative',
                              zIndex: idx + 1,
                              flexShrink: 0
                            }}
                          >
                             {/* Page highlights on edges */}
                             <div style={{ position: 'absolute', left: '8px', top: '15%', bottom: '15%', width: '2px', backgroundColor: 'rgba(255,255,255,0.1)', filter: 'blur(0.5px)' }} />
                             
                             <span className="text-[12px] font-black tracking-tight text-white px-8 select-none uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] truncate max-w-[85%] italic">
                                {book.title.replace(/<\/?[^>]+(>|$)/g, "")}
                             </span>
                             
                             {/* Floating Book Detail Tag */}
                             <div className="hidden group-hover:flex absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900 border-2 border-white/20 px-4 py-2 rounded-2xl text-[11px] font-black z-[200] whitespace-nowrap shadow-2xl items-center gap-3 scale-110">
                                <span style={{ backgroundColor: bookColor }} className="w-3 h-3 rounded-full shadow-inner" />
                                <span className="text-white">{book.author}</span>
                             </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="mb-40 text-center color-[#475569]">
                         <Sparkles size={48} style={{ margin: '0 auto 20px', opacity: 0.3 }} />
                         <p className="font-black text-xl tracking-wider text-slate-400">당신만의 지식 타워를 세우세요</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Heavy Wooden Shelf Floor (Fixed at bottom) */}
                <div style={{ 
                  width: '100%', 
                  height: '24px', 
                  backgroundImage: 'linear-gradient(to bottom, #451a03, #1a0a01)',
                  borderRadius: '0 0 2.5rem 2.5rem', 
                  borderTop: '2px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 -4px 10px rgba(0,0,0,0.3)',
                  position: 'relative',
                  zIndex: 10
                }}>
                   <div style={{ position: 'absolute', top: '1px', left: 0, right: 0, height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                </div>
              </div>


            ) : (
              <div className="w-full space-y-3">
                {readBooks.map(book => (
                  <div key={book.id} className="glass-card p-4 flex items-center gap-4 border border-white/5 hover:bg-white/5 transition-all group rounded-2xl">
                     <img src={book.image} className="w-14 h-20 object-cover rounded-lg shadow-xl" alt="" />
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-black text-base group-hover:text-indigo-400 transition-colors truncate" dangerouslySetInnerHTML={{ __html: book.title }}></h4>
                          <span className="text-[9px] text-indigo-400 font-black tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase">
                            {new Date(book.read_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold mb-2">{book.author}</p>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] text-slate-400 border border-white/10 px-2 py-0.5 rounded-full">{book.pages || 250}p</span>
                           <span className="text-[9px] text-slate-400 border border-white/10 px-2 py-0.5 rounded-full">{book.publisher}</span>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}


        {/* SEARCH RESULTS TAB */}
        {activeTab === 'search' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full mt-10">
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                gap: '2.5rem 1.5rem',
                width: '100%'
              }}
            >
              {searchResults.map((book, index) => (
                <div 
                  key={index}
                  onClick={() => handleBookClick(book)}
                  className="premium-card p-3 cursor-pointer group flex flex-col items-center"
                  style={{ minWidth: 0 }}
                >
                  <div className="w-full aspect-[3/4] mb-4 overflow-hidden rounded-2xl relative shadow-2xl border border-white/5 bg-slate-800">
                    <img 
                      src={book.image} 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      alt="" 
                    />
                    <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Sparkles className="text-white" size={32} />
                    </div>
                  </div>
                  <div className="w-full text-center space-y-1">
                    <h4 className="font-black text-sm leading-tight px-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: book.title }}></h4>
                    <p className="text-[11px] text-slate-500 font-bold truncate px-2">{book.author}</p>
                  </div>
                </div>
              ))}
            </div>
            {searchResults.length === 0 && searchQuery && !isSearching && (
              <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-white/5">
                <p className="text-slate-500 font-bold">검색 결과가 없습니다.</p>
              </div>
            )}
          </motion.div>
        )}
        {/* CLUBS TAB */}
        {activeTab === 'clubs' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-16">
             {/* Header with Search/Action */}
             <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-4xl font-black mb-2 flex items-center gap-4 italic tracking-tighter">
                      <Users className="text-indigo-400" size={40} />
                      독서 커뮤니티
                   </h2>
                   <p className="text-slate-500 font-bold ml-1">지하철 한 정거장 거리의 이웃과 함께 책을 읽어보세요.</p>
                </div>
                <button 
                  onClick={() => setIsCreatingClub(true)}
                  className="premium-button text-sm px-8 py-3.5 flex items-center gap-2"
                >
                   <Plus size={20} />
                   모임 개설하기
                </button>
             </div>

             {/* Section 1: Nearest Clubs */}
             {user && (
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                     <h3 className="text-xl font-black uppercase tracking-widest text-white italic">🏃‍♂️ 내 주변 가장 가까운 모임</h3>
                  </div>
                  <div className="flex flex-nowrap overflow-x-auto gap-6 pb-8 -mx-4 px-4 snap-x snap-mandatory custom-scroll">
                     {clubs.slice(0, 5).map((club) => (
                       <div 
                         key={club.id} 
                         onClick={() => setSelectedClub(club)}
                         className="premium-card overflow-hidden group border-white/5 hover:border-indigo-500/50 transition-all flex flex-col cursor-pointer bg-slate-900/60 shrink-0 snap-start shadow-2xl"
                         style={{ width: '300px', height: '360px', minWidth: '300px' }}
                       >
                          <div className="w-full relative overflow-hidden bg-slate-800 shrink-0" style={{ height: '180px' }}>
                             <img 
                               src={club.image} 
                               className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90 group-hover:opacity-100" 
                               alt={club.name} 
                               style={{ height: '100%', width: '100%' }}
                             />
                             <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                                <div className="bg-indigo-600/90 text-white px-3 py-1 rounded-lg text-[10px] font-black shadow-2xl flex items-center gap-1.5 backdrop-blur-md border border-white/10">
                                   <MapPin size={10} />
                                   {club.distance || 0}km
                                </div>
                             </div>
                             <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-90" />
                          </div>
                          <div className="p-5 flex-1 flex flex-col justify-between">
                             <div className="space-y-2">
                                <h3 className="text-sm font-black group-hover:text-indigo-400 transition-colors uppercase italic truncate tracking-tight text-white mb-0">{club.name}</h3>
                                <p className="text-[11px] text-slate-500 font-bold line-clamp-2 leading-relaxed h-[36px] overflow-hidden">{club.description}</p>
                             </div>
                             <div className="flex justify-between items-center text-[10px] font-black italic tracking-widest border-t border-white/5 pt-4">
                                <span className="text-slate-500 uppercase truncate max-w-[120px]">{club.location}</span>
                                <span className="text-indigo-400/80">{club.member_count} MBRS</span>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
             )}

             {/* Section 2: All Clubs */}
             <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                   <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-slate-700 rounded-full" />
                      <h3 className="text-xl font-black uppercase tracking-widest text-slate-400 italic">📢 모든 독서 모임 목록</h3>
                   </div>
                   <p className="text-xs font-bold text-slate-600">총 {clubs.length}개의 모임이 활동 중입니다.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-70 hover:opacity-100 transition-opacity">
                   {clubs.slice(5).map((club) => (
                     <div 
                       key={club.id} 
                       onClick={() => setSelectedClub(club)}
                       className="glass-card p-5 hover:bg-white/5 transition-all flex flex-col justify-between border-white/5 cursor-pointer group h-[140px]"
                     >
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-slate-800">
                              <img 
                                src={club.image} 
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" 
                                alt="" 
                              />
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-black truncate group-hover:text-indigo-400 transition-colors">{club.name}</h4>
                              <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1 mt-1">
                                 <MapPin size={10} /> {club.location}
                              </p>
                           </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                           <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">{club.category}</span>
                           <span className="text-[10px] font-black text-indigo-500/70 italic">{club.distance || 0}km away</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </motion.div>
        )}
        {/* COMMUNITY TAB */}
        {activeTab === 'community' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-10">
             <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                      <MessageSquare className="text-indigo-400" size={32} />
                      지식 나눔 광장
                   </h2>
                   <p className="text-slate-500 font-bold">책을 통해 더 넓은 세상을 만나는 곳입니다.</p>
                </div>
                <button className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                   <Plus size={18} />
                   글쓰기
                </button>
             </div>

             <div className="space-y-4">
                {communityPosts.map((post) => (
                  <div key={post.id} className="glass-card p-8 border-white/5 hover:bg-white/5 transition-all group flex flex-col md:flex-row gap-6 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <MessageSquare size={120} />
                     </div>
                     <div className="flex-1 space-y-4 relative z-10">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                             <Hash size={14} className="text-indigo-400" />
                             <span className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">General Discussion</span>
                          </div>
                          <h3 className="text-2xl font-black group-hover:text-indigo-400 transition-colors">{post.title}</h3>
                          <p className="text-slate-400 font-medium leading-relaxed line-clamp-2">{post.content}</p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                           <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                 <Heart size={16} className="text-rose-500/60" />
                                 {post.likes}
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                 <MessageCircle size={16} className="text-sky-500/60" />
                                 {post.comments}
                              </div>
                           </div>
                           <div className="flex items-center gap-3 text-xs font-bold">
                              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                 {post.author[0]}
                              </div>
                              <span className="text-slate-300">{post.author}</span>
                              <span className="text-slate-600 ml-2">{new Date(post.date).toLocaleDateString()}</span>
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </motion.div>
        )}
      </main>

      {/* Registration Modal Overlay */}
      <AnimatePresence>
        {!user && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950 p-6"
          >
            {/* Background design for login */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
               <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full" />
               <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-600/20 blur-[150px] rounded-full" />
            </div>

            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg glass-card p-10 relative z-10 border-white/10"
            >
              <div className="text-center mb-10 space-y-3">
                 <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl rotate-3 mb-6">
                    <BookOpen size={40} className="text-white" />
                 </div>
                 <h2 className="text-4xl font-black italic tracking-tighter">bookStory</h2>
                 <p className="text-slate-400 font-bold">당신만의 독서 여정을 시작하기 위해<br/>회원 정보를 입력해주세요.</p>
              </div>

              <div className="space-y-6">
                 {/* Name Input */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-2">닉네임 또는 이름</label>
                    <div className="relative">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                       <input 
                          type="text" 
                          placeholder="어떻게 불러드릴까요?"
                          value={regForm.name}
                          onChange={(e) => setRegForm({...regForm, name: e.target.value})}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:ring-2 ring-indigo-500 outline-none transition-all font-bold"
                       />
                    </div>
                 </div>

                 {/* Gender & Age Row */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-2">성별</label>
                       <select 
                          className="w-full bg-slate-900 border border-white/10 rounded-xl py-4 px-4 focus:ring-2 ring-indigo-500 outline-none transition-all font-bold appearance-none"
                          value={regForm.gender}
                          onChange={(e) => setRegForm({...regForm, gender: e.target.value})}
                       >
                          <option>남성</option>
                          <option>여성</option>
                          <option>기타</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-2">나이</label>
                       <input 
                          type="number" 
                          placeholder="20"
                          value={regForm.age}
                          onChange={(e) => setRegForm({...regForm, age: parseInt(e.target.value)})}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl py-4 px-4 focus:ring-2 ring-indigo-500 outline-none transition-all font-bold"
                       />
                    </div>
                 </div>

                 {/* Location Search */}
                 <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-2 font-black">주 활동 지역 (검색어 입력)</label>
                    <div className="relative">
                       <MapIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                       <input 
                          type="text" 
                          placeholder="동네나 역 이름 검색 (예: 합정역)"
                          onChange={(e) => searchLocation(e.target.value, 'reg')}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:ring-2 ring-indigo-500 outline-none transition-all font-bold"
                       />
                       {isSearchingLocation && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="animate-spin text-slate-500" size={16}/></div>}
                    </div>

                    {/* Suggestions Dropdown */}
                    {locationSuggestions.length > 0 && (
                      <div className="absolute z-[1100] top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto overflow-x-hidden">
                        {locationSuggestions.map((item, i) => (
                          <div 
                            key={i} 
                            onClick={() => {
                               selectLocation(item, 'reg');
                               document.querySelector('input[placeholder="동네나 역 이름 검색 (예: 합정역)"]').value = item.place_name;
                            }}
                            className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                          >
                            <p className="text-sm font-bold text-white mb-0.5">{item.place_name}</p>
                            <p className="text-[10px] text-slate-500">{item.address_name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {regForm.location && (
                      <div className="mt-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-2">
                        <MapPin size={12} className="text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-400">선택됨: {regForm.location}</span>
                      </div>
                    )}
                 </div>

                 <button 
                    onClick={handleRegisterUser}
                    className="w-full premium-button py-5 text-lg flex items-center justify-center gap-3 mt-4"
                  >
                    <span>bookStory 시작하기</span>
                    <ChevronRight size={20} />
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-40 text-center border-t border-white/5 py-16 space-y-4">
        <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">bookStory</h2>
        <p className="text-slate-500 font-medium">© 2026 bookStory. Elevating your reading experience with Intelligence.</p>
        <div className="flex justify-center gap-6 pt-4">
          <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-slate-400 hover:text-white">
            <Bookmark size={20} />
          </div>
          <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-slate-400 hover:text-white">
            <Users size={20} />
          </div>
        </div>
      </footer>

      {/* Create Club Modal */}
      <AnimatePresence>
        {isCreatingClub && (
          <div className="modal-backdrop overflow-y-auto" onClick={() => setIsCreatingClub(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content relative my-auto shadow-2xl"
              style={{ maxWidth: '500px' }}
            >
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black italic">모임 개설하기</h2>
                  <button onClick={() => setIsCreatingClub(false)} className="text-slate-500 hover:text-white"><X /></button>
               </div>
               
               <div className="space-y-5">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">모임 이름</label>
                     <input 
                        className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 ring-indigo-500 outline-none transition-all font-bold"
                        placeholder="예: 강남 심리학 독서회"
                        value={clubForm.name}
                        onChange={(e) => setClubForm({...clubForm, name: e.target.value})}
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">카테고리</label>
                     <select 
                        className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 ring-indigo-500 outline-none transition-all font-bold"
                        value={clubForm.category}
                        onChange={(e) => setClubForm({...clubForm, category: e.target.value})}
                     >
                        <option>독서/기록</option>
                        <option>소설/토론</option>
                        <option>인문/철학</option>
                        <option>자기계발</option>
                        <option>비즈니스</option>
                     </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">모임 설명</label>
                     <textarea 
                        className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 ring-indigo-500 outline-none transition-all font-bold h-24"
                        placeholder="어떤 활동을 하는 모임인지 알려주세요"
                        value={clubForm.description}
                        onChange={(e) => setClubForm({...clubForm, description: e.target.value})}
                     />
                  </div>
                  <div className="space-y-1.5 relative">
                     <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 font-black">활동 지역 (검색어 입력)</label>
                     <div className="relative">
                        <input 
                           className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 ring-indigo-500 outline-none transition-all font-bold"
                           placeholder="동네, 역 이름 또는 장소명 (예: 합정역)"
                           onChange={(e) => searchLocation(e.target.value, 'club')}
                        />
                        <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                     </div>
                     
                     {/* Suggestions Dropdown for Club */}
                     {locationSuggestions.length > 0 && (
                       <div className="absolute z-[1200] top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                         {locationSuggestions.map((item, i) => (
                           <div 
                             key={i} 
                             onClick={() => {
                                selectLocation(item, 'club');
                                document.querySelector('input[placeholder="동네, 역 이름 또는 장소명 (예: 합정역)"]').value = item.place_name;
                             }}
                             className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                           >
                             <p className="text-sm font-bold text-white mb-0.5">{item.place_name}</p>
                             <p className="text-[10px] text-slate-500">{item.address_name}</p>
                           </div>
                         ))}
                       </div>
                     )}
                     {clubForm.location && (
                       <div className="mt-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-2">
                         <span className="text-xs font-bold text-indigo-400">선택됨: {clubForm.location}</span>
                       </div>
                     )}
                  </div>
                  
                  <button 
                    onClick={handleCreateClub}
                    disabled={isSavingClub}
                    className="w-full premium-button py-4 mt-4 flex items-center justify-center gap-2"
                  >
                     {isSavingClub ? <Loader2 className="animate-spin" /> : <Plus />}
                     <span>모임 개설 완료</span>
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Club Detail Modal */}
      <AnimatePresence>
        {selectedClub && (
          <div className="modal-backdrop overflow-y-auto" onClick={() => setSelectedClub(null)}>
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 40 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 40 }}
               onClick={(e) => e.stopPropagation()}
               className="modal-content relative my-auto shadow-2xl p-0 overflow-hidden"
               style={{ maxWidth: '600px' }}
            >
               <div className="h-48 relative">
                  <img src={selectedClub.image} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                  <button onClick={() => setSelectedClub(null)} className="absolute top-4 right-4 bg-black/40 p-2 rounded-full text-white hover:bg-black/60"><X size={18}/></button>
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-black rounded uppercase tracking-widest border border-indigo-500/20">{selectedClub.category}</span>
                        <h2 className="text-2xl font-black">{selectedClub.name}</h2>
                        <p className="text-slate-500 text-sm font-bold flex items-center gap-1">
                           <MapPin size={12} /> {selectedClub.location}
                        </p>
                     </div>
                     <div className="text-right">
                        <p className="text-indigo-400 font-black text-xl italic">{selectedClub.member_count}명</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Members</p>
                     </div>
                  </div>

                  <p className="text-slate-300 leading-relaxed font-medium bg-white/5 p-4 rounded-xl border border-white/5">{selectedClub.description}</p>
                  
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest py-1 border-b border-white/5">모임 위치 파악</h4>
                     <div id="club-map" className="w-full h-40 rounded-xl overflow-hidden border border-white/10 bg-slate-900" />
                  </div>

                  <button 
                    onClick={() => handleJoinClub(selectedClub.id)}
                    className="w-full premium-button py-4 mt-2 flex items-center justify-center gap-2"
                  >
                     <Users size={18} />
                     <span>모임 참여하기</span>
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Analysis Modal */}
      <AnimatePresence>
        {selectedBook && (
          <div className="modal-backdrop overflow-y-auto" onClick={() => setSelectedBook(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content relative my-auto shadow-[0_0_80px_rgba(99,102,241,0.15)]"
            >
              <button 
                onClick={() => setSelectedBook(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-all text-slate-400 z-10"
              >
                <X size={20} />
              </button>

              <div className="space-y-6">
                {/* Modal Header: Thumbnail and Basic Info */}
                <div className="flex items-center gap-5 border-b border-white/5 pb-5">
                  <div className="w-14 shrink-0">
                    <div className="aspect-[2/3] rounded-md overflow-hidden shadow-lg border border-white/10">
                      {selectedBook.image ? (
                        <img src={selectedBook.image} alt={selectedBook.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <BookOpen size={16} className="text-slate-600" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-indigo-400 font-black mb-0.5">
                      <Sparkles size={12} />
                      <span className="tracking-[0.15em] text-[9px] uppercase opacity-70">AI Insight Platform</span>
                    </div>
                    <h2 className="text-lg font-black leading-tight tracking-tight" dangerouslySetInnerHTML={{ __html: selectedBook.title }}></h2>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-slate-400">{selectedBook.author}</span>
                       <span className="w-1 h-1 rounded-full bg-white/10" />
                       <span className="text-[10px] font-bold text-slate-500">{selectedBook.publisher}</span>
                    </div>
                  </div>
                </div>

                {/* Modal Content: Analysis & Actions */}
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 min-h-[100px] relative">
                    {isAnalyzing ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-indigo-500" size={20} />
                        <p className="text-indigo-400 text-[10px] font-bold animate-pulse">데이터 분석 중...</p>
                      </div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                         <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                            <h3 className="text-[11px] font-black text-indigo-300 uppercase tracking-wider">The Insight</h3>
                         </div>
                        <p className="text-[13px] leading-relaxed text-slate-300 font-medium whitespace-pre-wrap">{analysisResult}</p>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => handleRegisterBook(selectedBook)}
                      disabled={isSaving}
                      className="premium-button flex-1 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 text-xs shadow-lg"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                      <span>내 서재에 기록하기</span>
                    </button>
                    <button className="px-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 font-bold transition-all text-xs">
                       상세보기
                    </button>
                  </div>
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
