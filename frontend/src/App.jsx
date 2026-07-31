import React, { useState, useRef, useEffect } from 'react';
import { Search, BookOpen, MessageSquare, Loader2, Mic, LogOut, Timer, UserPlus, Waves, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from './api';
import { stripHtml, getDistance, getValidUserId } from './utils';

import StackTab from './components/tabs/StackTab';
import SearchTab from './components/tabs/SearchTab';
import ClubsTab from './components/tabs/ClubsTab';
import CommunityTab from './components/tabs/CommunityTab';
import DiveTab from './components/tabs/DiveTab';
import RecordingTab from './components/tabs/RecordingTab';
import TimerTab from './components/tabs/TimerTab';
import AdminTab from './components/tabs/AdminTab';

import RegistrationModal from './components/RegistrationModal';
import BookModal from './components/modals/BookModal';
import ClubModal from './components/modals/ClubModal';
import CreateClubModal from './components/modals/CreateClubModal';
import WritePostModal from './components/modals/WritePostModal';
import TendencyModal from './components/modals/TendencyModal';
import ConversationModal from './components/modals/ConversationModal';
import PostModal from './components/modals/PostModal';
import ProfileModal from './components/modals/ProfileModal';
import ReadingTimer from './components/ReadingTimer';
import TimerCompleteModal from './components/modals/TimerCompleteModal';
import PendingTimeConfirmModal from './components/modals/PendingTimeConfirmModal';
import UserLibraryModal from './components/modals/UserLibraryModal';
import CreateDiveRoomModal from './components/modals/CreateDiveRoomModal';
import DiveRoomModal from './components/modals/DiveRoomModal';

function App() {
  const [activeTab, setActiveTab] = useState('stack');
  const [viewMode, setViewMode] = useState('tower');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [isFetchingMoreSearch, setIsFetchingMoreSearch] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [analysisResult, setAnalysisResult] = useState('');
  const [questions, setQuestions] = useState({ thematic: [], perspective_shift: [] });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [readBooks, setReadBooks] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentBookPages, setCurrentBookPages] = useState(250);
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('bookstory_user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.user && parsed.token && !parsed.id) {
        const migrated = { ...parsed.user, token: parsed.token };
        localStorage.setItem('bookstory_user', JSON.stringify(migrated));
        return migrated;
      }
      return parsed;
    } catch { return null; }
  });

  const [regForm, setRegForm] = useState({ name: '', password: '', gender: '남성', age: 20, location: '', lat: null, lng: null });
  const [selectedClub, setSelectedClub] = useState(null);
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [clubForm, setClubForm] = useState({ name: '', description: '', category: '독서/기록', location: '', lat: null, lng: null, image: '' });
  const [isSavingClub, setIsSavingClub] = useState(false);
  const [joinedClubs, setJoinedClubs] = useState(new Set());
  const [isWritingPost, setIsWritingPost] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '', book_title: '' });
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const [voiceSampleUploading, setVoiceSampleUploading] = useState(false);

  const [showProfile, setShowProfile] = useState(false);

  const [timerBook, setTimerBook] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerWidgetHidden, setTimerWidgetHidden] = useState(false);
  const timerRef = useRef(null);
  const [showTimerComplete, setShowTimerComplete] = useState(false);
  const [pendingTimeConfirmations, setPendingTimeConfirmations] = useState([]);
  const [userLibrary, setUserLibrary] = useState(null); // { userId, userName }
  const [friendRequests, setFriendRequests] = useState([]);
  const [diveRooms, setDiveRooms] = useState([]);
  const [isFetchingRooms, setIsFetchingRooms] = useState(false);
  const [isCreatingDiveRoom, setIsCreatingDiveRoom] = useState(false);
  const [selectedDiveRoom, setSelectedDiveRoom] = useState(null);
  const [activeDiveRoom, setActiveDiveRoom] = useState(null);

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
  const [toast, setToast] = useState({ show: false, message: '' });

  const [selectedPost, setSelectedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyInput, setReplyInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingToMention, setReplyingToMention] = useState('');
  const [communityPage, setCommunityPage] = useState(1);
  const [communityHasMore, setCommunityHasMore] = useState(false);
  const [isFetchingMorePosts, setIsFetchingMorePosts] = useState(false);

  const [clubReviews, setClubReviews] = useState([]);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [myReviewText, setMyReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [bookImpression, setBookImpression] = useState('');
  const [bookImpressionPublic, setBookImpressionPublic] = useState(true);
  const [isSavingImpression, setIsSavingImpression] = useState(false);

  useEffect(() => {
    if (toast.show) {
      const t = setTimeout(() => setToast({ show: false, message: '' }), 2800);
      return () => clearTimeout(t);
    }
  }, [toast.show]);

  useEffect(() => {
    if (selectedBook) {
      setBookImpression(selectedBook.impression || '');
      setBookImpressionPublic(selectedBook.is_public !== false);
    }
  }, [selectedBook]);

  // OAuth 콜백 처리 (소셜 로그인 후 code 파라미터 감지)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const provider = sessionStorage.getItem('oauth_provider');
    if (!code || !provider) return;
    sessionStorage.removeItem('oauth_provider');
    window.history.replaceState({}, '', window.location.pathname);
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/${provider}/callback?code=${encodeURIComponent(code)}`, { method: 'POST' });
        if (!res.ok) throw new Error((await res.json()).detail || '오류');
        const data = await res.json();
        const toStore = { ...data.user, token: data.token };
        setUser(toStore);
        localStorage.setItem('bookstory_user', JSON.stringify(toStore));
        const pName = provider === 'kakao' ? '카카오' : provider === 'naver' ? '네이버' : '구글';
        setToast({ show: true, message: `${pName}로 로그인되었습니다!` });
      } catch (e) {
        setToast({ show: true, message: `소셜 로그인 실패: ${e.message}` });
      }
    })();
  }, []);

  useEffect(() => {
    fetchReadBooks();
    fetchCommunityPosts();
    fetchDiveRooms();
  }, [user?.id]);

  useEffect(() => {
    const iv = setInterval(fetchDiveRooms, 20000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!user?.token) { setActiveDiveRoom(null); return; }
    fetchActiveDiveRoom();
    const iv = setInterval(fetchActiveDiveRoom, 30000);
    return () => clearInterval(iv);
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token) { setPendingTimeConfirmations([]); return; }
    fetchPendingTimeConfirmations();
  }, [user?.token]);

  useEffect(() => {
    fetchClubs();
    fetchJoinedClubs();
  }, [user]);

  useEffect(() => {
    if (!user?.token) return;
    fetchFriendRequests();
    const iv = setInterval(fetchFriendRequests, 15000);
    return () => clearInterval(iv);
  }, [user?.token]);

  useEffect(() => {
    if (selectedClub) {
      fetchClubReviews(selectedClub.id);
      setMyRating(0);
      setMyReviewText('');
    }
  }, [selectedClub]);

  const fetchDiveRooms = async () => {
    setIsFetchingRooms(true);
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms`);
      if (res.ok) setDiveRooms(await res.json());
    } catch {} finally { setIsFetchingRooms(false); }
  };

  const fetchActiveDiveRoom = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/active`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) setActiveDiveRoom(await res.json());
    } catch {}
  };

  const fetchPendingTimeConfirmations = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_URL}/api/dive/pending-confirmations`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) setPendingTimeConfirmations(await res.json());
    } catch {}
  };

  const handleConfirmPendingTime = async (roomId, seconds) => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms/${roomId}/confirm-time`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds }),
      });
      if (res.ok) setToast({ show: true, message: '독서 시간이 기록됐어요' });
    } catch {} finally {
      setPendingTimeConfirmations(prev => prev.filter(p => p.room_id !== roomId));
    }
  };

  const handleCreateDiveRoom = async (formData) => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_URL}/api/dive/rooms`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, host_name: user.name }),
      });
      if (res.ok) {
        setIsCreatingDiveRoom(false);
        await fetchDiveRooms();
        setToast({ show: true, message: '독서 모임이 개설됐어요 🌊' });
      } else {
        const err = await res.json();
        setToast({ show: true, message: err.detail || '개설 실패. 다시 시도해주세요.' });
      }
    } catch { setToast({ show: true, message: '개설 중 오류가 발생했습니다.' }); }
  };

  const fetchReadBooks = async () => {
    try {
      const uid = getValidUserId(user);
      const query = uid ? `?user_id=${uid}` : '';
      const response = await fetch(`${API_URL}/api/books/read${query}`);
      const data = await response.json();
      setReadBooks(data);
    } catch (error) { console.error('Failed to fetch books'); }
  };

  const fetchClubs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/clubs`);
      const data = await response.json();
      if (user && user.lat && user.lng) {
        const sorted = data
          .map(club => ({ ...club, distance: getDistance(user.lat, user.lng, club.lat, club.lng) }))
          .sort((a, b) => a.distance - b.distance);
        setClubs(sorted);
      } else {
        setClubs(data);
      }
    } catch (error) { console.error('Failed to fetch clubs'); }
  };

  const fetchCommunityPosts = async (page = 1, append = false) => {
    try {
      const numId = user?.id ? parseInt(user.id) : NaN;
      const uid = !isNaN(numId) && numId > 0 ? `user_id=${numId}&` : '';
      const response = await fetch(`${API_URL}/api/community/posts?${uid}page=${page}&limit=20`);
      const data = await response.json();
      const posts = Array.isArray(data) ? data : (Array.isArray(data?.posts) ? data.posts : []);
      const total = data?.total || posts.length;
      if (append) {
        setCommunityPosts(prev => [...prev, ...posts]);
      } else {
        setCommunityPosts(posts);
      }
      setCommunityPage(page);
      setCommunityHasMore(page * 20 < total);
    } catch (error) { console.error('Failed to fetch posts'); }
  };

  const handleLoadMorePosts = async () => {
    setIsFetchingMorePosts(true);
    await fetchCommunityPosts(communityPage + 1, true);
    setIsFetchingMorePosts(false);
  };

  const fetchJoinedClubs = async () => {
    if (!user?.id) return;
    try {
      const uid = getValidUserId(user);
      if (!uid) return;
      const response = await fetch(`${API_URL}/api/clubs/joined?user_id=${uid}`);
      if (!response.ok) return;
      const data = await response.json();
      setJoinedClubs(new Set(data));
    } catch (error) { console.error('Failed to fetch joined clubs'); }
  };

  const fetchPostComments = async (postId) => {
    try {
      const res = await fetch(`${API_URL}/api/community/posts/${postId}/comments`);
      const data = await res.json();
      setPostComments(Array.isArray(data) ? data : []);
    } catch { setPostComments([]); }
  };

  const fetchClubReviews = async (clubId) => {
    try {
      const res = await fetch(`${API_URL}/api/clubs/${clubId}/reviews`);
      const data = await res.json();
      setClubReviews(Array.isArray(data) ? data : []);
    } catch { setClubReviews([]); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setSearchPage(1);
    setSearchHasMore(false);
    setActiveTab('search');
    try {
      const response = await fetch(`${API_URL}/api/books/search?query=${encodeURIComponent(searchQuery)}&page=1`);
      const data = await response.json();
      setSearchResults(data.items || []);
      setSearchHasMore(!!data.has_more);
    } catch (error) { console.error('Search error:', error); }
    finally { setIsSearching(false); }
  };

  const handleLoadMoreSearch = async () => {
    if (!searchQuery.trim() || isFetchingMoreSearch || !searchHasMore) return;
    const nextPage = searchPage + 1;
    setIsFetchingMoreSearch(true);
    try {
      const response = await fetch(`${API_URL}/api/books/search?query=${encodeURIComponent(searchQuery)}&page=${nextPage}`);
      const data = await response.json();
      setSearchResults(prev => [...prev, ...(data.items || [])]);
      setSearchPage(nextPage);
      setSearchHasMore(!!data.has_more);
    } catch (error) { console.error('Search load-more error:', error); }
    finally { setIsFetchingMoreSearch(false); }
  };

  const handleBookClick = (book) => {
    setSelectedBook(book);
    setAnalysisResult(stripHtml(book.description || ''));
    setQuestions({ thematic: [], perspective_shift: [] });
    setIsAnalyzing(false);
  };

  const handleStackBookClick = (book) => {
    setSelectedBook({ ...book, fromStack: true });
    setAnalysisResult(stripHtml(book.description || ''));
    setCurrentBookPages(book.pages || 250);
    setQuestions({ thematic: [], perspective_shift: [] });
    setIsAnalyzing(false);
  };

  const handleLoadAnalysis = async () => {
    if (!selectedBook || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_URL}/api/books/analyze?title=${encodeURIComponent(stripHtml(selectedBook.title))}&author=${encodeURIComponent(selectedBook.author)}`);
      const data = await response.json();
      setAnalysisResult(data.analysis);
      setCurrentBookPages(data.pages || 250);
      setQuestions(data.questions || { thematic: [], perspective_shift: [] });
    } catch (error) { console.error('Analysis error:', error); }
    finally { setIsAnalyzing(false); }
  };

  const handleRegisterUser = async (onError) => {
    if (!regForm.name || !regForm.location) return alert('이름과 지역을 입력해주세요.');
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      const data = await response.json();
      if (response.ok) {
        const stored = { ...data.user, token: data.token };
        setUser(stored);
        localStorage.setItem('bookstory_user', JSON.stringify(stored));
        window.location.reload();
      } else {
        onError?.(typeof data.detail === 'string' ? data.detail : '가입 중 오류가 발생했습니다.');
      }
    } catch (error) { onError?.('서버에 연결할 수 없습니다.'); }
  };

  const handleLoginUser = async (name, password, onError, onNeedsSetup) => {
    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      if (response.ok) {
        const data = await response.json();
        const stored = { ...data.user, token: data.token };
        setUser(stored);
        localStorage.setItem('bookstory_user', JSON.stringify(stored));
        window.location.reload();
      } else if (response.status === 409) {
        onNeedsSetup?.();
      } else {
        const data = await response.json().catch(() => ({}));
        onError?.(typeof data.detail === 'string' ? data.detail : '로그인에 실패했습니다.');
      }
    } catch {
      onError?.('서버에 연결할 수 없습니다.');
    }
  };

  const handleSetInitialPassword = async (name, password, onError) => {
    try {
      const response = await fetch(`${API_URL}/api/users/set-initial-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await response.json();
      if (response.ok) {
        const stored = { ...data.user, token: data.token };
        setUser(stored);
        localStorage.setItem('bookstory_user', JSON.stringify(stored));
        window.location.reload();
      } else {
        onError?.(typeof data.detail === 'string' ? data.detail : '비밀번호 설정에 실패했습니다.');
      }
    } catch {
      onError?.('서버에 연결할 수 없습니다.');
    }
  };

  const handleAdminLogin = async (password, onError) => {
    try {
      const response = await fetch(`${API_URL}/api/users/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (response.ok) {
        const stored = { ...data.user, token: data.token };
        setUser(stored);
        localStorage.setItem('bookstory_user', JSON.stringify(stored));
        window.location.reload();
      } else {
        onError?.(typeof data.detail === 'string' ? data.detail : '관리자 로그인에 실패했습니다.');
      }
    } catch {
      onError?.('서버에 연결할 수 없습니다.');
    }
  };

  const handleRegisterBook = async (book) => {
    if (!user?.token) {
      setToast({ show: true, message: '로그인이 필요합니다. 다시 로그인해주세요.' });
      return;
    }
    setIsSaving(true);
    const tempId = `temp-${Date.now()}`;
    const cleanTitle = stripHtml(book.title);
    const optimistic = {
      id: tempId,
      title: cleanTitle,
      author: book.author,
      image: book.image,
      publisher: book.publisher,
      isbn: book.isbn,
      pages: currentBookPages,
      read_at: new Date().toISOString(),
      impression: bookImpression,
      is_public: bookImpressionPublic,
    };
    setReadBooks(prev => [optimistic, ...prev]);
    setSelectedBook(null);
    setActiveTab('stack');
    setViewMode('tower');
    try {
      const response = await fetch(`${API_URL}/api/books/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({
          title: book.title, author: book.author, image: book.image,
          publisher: book.publisher, isbn: book.isbn, pages: currentBookPages,
          description: stripHtml(book.description || ''),
          impression: bookImpression, is_public: bookImpressionPublic,
        })
      });
      if (response.ok) {
        const data = await response.json();
        setReadBooks(prev => prev.map(b => b.id === tempId ? { ...data, title: stripHtml(data.title) } : b));
        setToast({ show: true, message: `"${cleanTitle.slice(0, 16)}${cleanTitle.length > 16 ? '...' : ''}" 서재에 추가됐어요.` });
      } else {
        setReadBooks(prev => prev.filter(b => b.id !== tempId));
        setToast({ show: true, message: response.status === 401 ? '로그인이 만료됐습니다. 다시 로그인해주세요.' : '저장 실패. 다시 시도해주세요.' });
      }
    } catch (error) {
      setReadBooks(prev => prev.filter(b => b.id !== tempId));
      console.error('Book save error:', error);
    } finally { setIsSaving(false); }
  };

  const handleUpdatePages = async (bookId, pages) => {
    if (!user?.token) return;
    setReadBooks(prev => prev.map(b => b.id === bookId ? { ...b, pages } : b));
    await fetch(`${API_URL}/api/books/read/${bookId}/pages`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages }),
    });
  };

  const handleDeleteBook = async (bookId) => {
    if (String(bookId).startsWith('temp-')) {
      setReadBooks(prev => prev.filter(b => b.id !== bookId));
      return;
    }
    const snapshot = readBooks;
    setReadBooks(prev => prev.filter(b => b.id !== bookId));
    try {
      const authH = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
      const res = await fetch(`${API_URL}/api/books/read/${bookId}`, { method: 'DELETE', headers: authH });
      if (!res.ok) {
        setReadBooks(snapshot);
        setToast({ show: true, message: '삭제 실패: 권한이 없습니다.' });
        return;
      }
    } catch (e) {
      setReadBooks(snapshot);
      console.error('Book delete error:', e);
      return;
    }
    setToast({ show: true, message: '서재에서 삭제됐어요.' });
  };

  const handleSaveImpression = async () => {
    if (!selectedBook?.id || String(selectedBook.id).startsWith('temp-')) return;
    setIsSavingImpression(true);
    try {
      const authH = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
      if (currentBookPages > 0 && currentBookPages !== selectedBook.pages) {
        await fetch(`${API_URL}/api/books/read/${selectedBook.id}/pages`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authH },
          body: JSON.stringify({ pages: currentBookPages }),
        });
        setReadBooks(prev => prev.map(b => b.id === selectedBook.id ? { ...b, pages: currentBookPages } : b));
      }
      const res = await fetch(`${API_URL}/api/books/read/${selectedBook.id}/impression`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({ impression: bookImpression, is_public: bookImpressionPublic })
      });
      if (res.ok) {
        const updated = await res.json();
        setReadBooks(prev => prev.map(b => b.id === selectedBook.id ? { ...b, ...updated, pages: currentBookPages, title: stripHtml(updated.title) } : b));
        setToast({ show: true, message: '감상평이 저장됐어요.' });
        setSelectedBook(null);
      }
    } catch {} finally { setIsSavingImpression(false); }
  };

  const handleCreateClub = async () => {
    if (!clubForm.name || !clubForm.location) return alert('모집 정보를 모두 입력해주세요.');
    setIsSavingClub(true);
    try {
      const authH = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
      const response = await fetch(`${API_URL}/api/clubs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({ ...clubForm, image: clubForm.image || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=800', creator_id: getValidUserId(user) })
      });
      if (response.ok) {
        const created = await response.json();
        setJoinedClubs(prev => new Set([...prev, created.id]));
        await fetchClubs();
        setIsCreatingClub(false);
        setClubForm({ name: '', description: '', category: '독서/기록', location: '', lat: null, lng: null, image: '' });
        setToast({ show: true, message: '모임이 개설됐어요. 자동으로 가입되었습니다.' });
      }
    } catch (error) { alert('모임 개설 중 오류가 발생했습니다.'); }
    finally { setIsSavingClub(false); }
  };

  const handleJoinClub = async (clubId) => {
    if (!user) return alert('로그인이 필요합니다.');
    const uid = getValidUserId(user);
    if (!uid) return alert('유효하지 않은 계정입니다. 다시 로그인해주세요.');
    const isJoined = joinedClubs.has(clubId);
    const authH = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
    try {
      if (isJoined) {
        const res = await fetch(`${API_URL}/api/clubs/${clubId}/leave`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...authH },
          body: JSON.stringify({ user_id: uid })
        });
        if (!res.ok) return alert('탈퇴 중 오류가 발생했습니다.');
        setJoinedClubs(prev => { const s = new Set(prev); s.delete(clubId); return s; });
        if (selectedClub?.id === clubId) setSelectedClub(prev => ({ ...prev, member_count: prev.member_count - 1 }));
        setToast({ show: true, message: '모임에서 탈퇴했어요.' });
      } else {
        const res = await fetch(`${API_URL}/api/clubs/${clubId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authH },
          body: JSON.stringify({ user_id: uid })
        });
        if (!res.ok) return alert('가입 중 오류가 발생했습니다.');
        setJoinedClubs(prev => new Set([...prev, clubId]));
        if (selectedClub?.id === clubId) setSelectedClub(prev => ({ ...prev, member_count: prev.member_count + 1 }));
        setToast({ show: true, message: '모임에 가입했어요!' });
      }
      await fetchClubs();
    } catch (error) { alert('오류가 발생했습니다.'); }
  };

  const handleLikePost = async (postId) => {
    if (!user) return;
    const numId = parseInt(user.id);
    if (isNaN(numId) || numId <= 0) return;
    setCommunityPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked: !p.liked, likes: p.liked ? Math.max(0, (p.likes || 1) - 1) : (p.likes || 0) + 1 }
        : p
    ));
    const authH = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
    try {
      await fetch(`${API_URL}/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({ user_id: numId })
      });
      fetchCommunityPosts();
    } catch (error) { console.error('Like error:', error); }
  };

  const handleWritePost = async (selectedBook) => {
    const contentText = postForm.content.replace(/<[^>]+>/g, '').trim();
    if (!postForm.title.trim() || !contentText) return alert('제목과 내용을 입력해주세요.');
    setIsSubmittingPost(true);
    const authH = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
    try {
      const response = await fetch(`${API_URL}/api/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({
          user_id: getValidUserId(user),
          title: postForm.title,
          content: postForm.content,
          book_title: selectedBook ? selectedBook.title : postForm.book_title,
          book_isbn: selectedBook?.isbn || '',
          book_image: selectedBook?.image || '',
        })
      });
      if (response.ok) {
        await fetchCommunityPosts();
        setIsWritingPost(false);
        setPostForm({ title: '', content: '', book_title: '' });
        setToast({ show: true, message: '게시물이 등록됐어요 ✍️' });
      }
    } catch (error) { alert('글 작성 중 오류가 발생했습니다.'); }
    finally { setIsSubmittingPost(false); }
  };

  const handleBookTagAction = async (action, book) => {
    if (!user?.token || !selectedPost) return;
    try {
      const res = await fetch(`${API_URL}/api/community/posts/${selectedPost.id}/book-tag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(action === 'edit'
          ? { action, book_title: stripHtml(book.title), book_isbn: book.isbn || '', book_image: book.image || '' }
          : { action }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedPost(prev => prev ? { ...prev, ...updated } : prev);
        setCommunityPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
      }
    } catch {}
  };

  const handleSubmitComment = async () => {
    if (!commentInput.trim() || !user) return;
    setIsSubmittingComment(true);
    const authH = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
    try {
      await fetch(`${API_URL}/api/community/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({ content: commentInput.trim(), user_id: getValidUserId(user) })
      });
      await fetchPostComments(selectedPost.id);
      setCommentInput('');
      fetchCommunityPosts();
    } catch {}
    finally { setIsSubmittingComment(false); }
  };

  const handleSubmitReply = async (parentId) => {
    if (!replyInput.trim() || !user) return;
    setIsSubmittingComment(true);
    const content = replyingToMention ? `${replyingToMention}${replyInput.trim()}` : replyInput.trim();
    const authH = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
    try {
      await fetch(`${API_URL}/api/community/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({ content, user_id: getValidUserId(user), parent_comment_id: parentId })
      });
      await fetchPostComments(selectedPost.id);
      setReplyInput('');
      setReplyingTo(null);
      setReplyingToMention('');
      fetchCommunityPosts();
    } catch {}
    finally { setIsSubmittingComment(false); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!user?.token) return;
    const authH = { Authorization: `Bearer ${user.token}` };
    await fetch(`${API_URL}/api/community/posts/${selectedPost.id}/comments/${commentId}`, {
      method: 'DELETE', headers: authH,
    });
    await fetchPostComments(selectedPost.id);
    fetchCommunityPosts();
  };

  const handleSubmitReview = async () => {
    if (!myRating || !user) return;
    setIsSubmittingReview(true);
    const authH = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
    try {
      await fetch(`${API_URL}/api/clubs/${selectedClub.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({ user_id: getValidUserId(user), rating: myRating, review_text: myReviewText })
      });
      await fetchClubReviews(selectedClub.id);
      const refreshed = await (await fetch(`${API_URL}/api/clubs`)).json();
      const updated = refreshed.find(c => c.id === selectedClub.id);
      if (updated) setSelectedClub(prev => ({ ...prev, avg_rating: updated.avg_rating, review_count: updated.review_count }));
      setMyRating(0);
      setMyReviewText('');
      setToast({ show: true, message: '리뷰가 등록됐어요 ⭐' });
    } catch {}
    finally { setIsSubmittingReview(false); }
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

  const handleStartDiscussion = async () => {
    if (!questions.thematic.length) return;
    const firstQuestion = questions.thematic[0];
    try {
      // 로그인 상태이고 DB에 없는 책이면 먼저 서재에 등록
      let readBookId = selectedBook?.id || null;
      if (user?.token && selectedBook && !readBookId) {
        const authH = { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' };
        const res = await fetch(`${API_URL}/api/books/read`, {
          method: 'POST', headers: authH,
          body: JSON.stringify({ title: stripHtml(selectedBook.title), author: selectedBook.author || '', image: selectedBook.image || '', isbn: selectedBook.isbn || '', publisher: selectedBook.publisher || '', status: 'reading' }),
        });
        if (res.ok) {
          const newBook = await res.json();
          readBookId = newBook.id;
          setReadBooks(prev => [newBook, ...prev]);
        }
      }
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || null,
          read_book_id: readBookId,
          book_title: selectedBook ? stripHtml(selectedBook.title) : null,
          book_analysis: analysisResult,
          first_question: firstQuestion,
        }),
      });
      const data = await response.json();
      setSessionId(data.session_id);
      setSessionQA([{ question: firstQuestion, answer: null, turn_order: 1 }]);
      setIsConversing(true);
    } catch (error) { alert('토론 세션 시작 중 오류가 발생했습니다.'); }
  };

  const handleSubmitAnswer = async () => {
    if (!conversationInput.trim() || !sessionId) return;
    setIsSubmittingAnswer(true);
    const answer = conversationInput.trim();
    setConversationInput('');
    setSessionQA(prev => prev.map((qa, i) => i === prev.length - 1 ? { ...qa, answer } : qa));
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, user_id: user?.id || null }),
      });
      const data = await response.json();
      setSessionQA(prev => [...prev, { question: data.next_question, answer: null, turn_order: data.turn }]);
    } catch (error) { alert('답변 제출 중 오류가 발생했습니다.'); }
    finally { setIsSubmittingAnswer(false); }
  };

  const handleStartTimer = (book) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerBook({ ...book, startedAt: new Date().toISOString().split('T')[0] });
    setTimerSeconds(0);
    setTimerRunning(true);
    setTimerWidgetHidden(false);
    timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
  };

  const handlePauseTimer = () => {
    clearInterval(timerRef.current);
    setTimerRunning(false);
  };

  const handleResumeTimer = () => {
    setTimerRunning(true);
    timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
  };

  const handleStopTimer = () => {
    // 바로 종료 처리하지 않고 일시정지만 한다 — 완독/읽는중 팝업을 닫거나 취소해도
    // 시간이 사라지지 않고 그대로 이어서 읽을 수 있도록.
    clearInterval(timerRef.current);
    setTimerRunning(false);
    if (timerSeconds >= 10) setShowTimerComplete(true);
  };

  const handleCancelTimerComplete = () => {
    // 팝업만 닫고, 타이머는 일시정지 상태 그대로 유지 (시간 보존, 재개 가능)
    setShowTimerComplete(false);
  };

  const handleTimerComplete = async (finished) => {
    const book = timerBook;
    const seconds = timerSeconds;
    setShowTimerComplete(false);
    setTimerBook(null);
    setTimerSeconds(0);
    setTimerRunning(false);
    if (!user?.token || !book) return;
    const authH = { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' };
    try {
      // 서재에서 책 찾기 (제목 매칭)
      const existingBook = readBooks.find(b => stripHtml(b.title) === book.title);
      let readBookId;
      if (existingBook) {
        readBookId = existingBook.id;
        const res = await fetch(`${API_URL}/api/books/read/${existingBook.id}/status`, {
          method: 'PATCH', headers: authH,
          body: JSON.stringify({ status: finished ? 'finished' : 'reading' }),
        });
        if (res.ok) {
          const updated = await res.json();
          setReadBooks(prev => prev.map(b => b.id === existingBook.id ? { ...b, status: updated.status } : b));
        }
      } else {
        // 서재에 없으면 새로 등록 (읽는 중 또는 완독)
        const res = await fetch(`${API_URL}/api/books/read`, {
          method: 'POST', headers: authH,
          body: JSON.stringify({ title: book.title, author: book.author || '', image: book.image || '', isbn: book.isbn || '', publisher: book.publisher || '', status: finished ? 'finished' : 'reading' }),
        });
        if (res.ok) {
          const newBook = await res.json();
          readBookId = newBook.id;
          setReadBooks(prev => [newBook, ...prev]);
        } else if (res.status === 401) {
          setToast({ show: true, message: '로그인이 만료됐습니다. 다시 로그인해주세요.' });
          return;
        }
      }
      // 독서 로그 저장 (read_book_id 기반)
      if (readBookId) {
        await fetch(`${API_URL}/api/reading/log`, {
          method: 'POST', headers: authH,
          body: JSON.stringify({ read_book_id: readBookId, duration_seconds: seconds, started_reading_at: book.startedAt || null }),
        });
      }
      setToast({ show: true, message: finished ? `완독 완료! ${book.title}` : `독서 기록 저장 완료!` });
    } catch (e) { console.error('Timer complete error:', e); }
  };

  const handleUpdateProfile = async (updates) => {
    if (!user?.id || !user?.token) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        const stored = { ...updated, token: user.token };
        setUser(stored);
        localStorage.setItem('bookstory_user', JSON.stringify(stored));
        setToast({ show: true, message: '프로필이 업데이트됐어요.' });
        setShowProfile(false);
      }
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('bookstory_user');
    window.location.reload();
  };

  const handleOAuthLogin = (provider) => {
    const ids = {
      kakao: import.meta.env.VITE_KAKAO_CLIENT_ID,
      naver: import.meta.env.VITE_NAVER_CLIENT_ID,
      google: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    };
    const clientId = ids[provider];
    if (!clientId) {
      setToast({ show: true, message: `${provider} 로그인은 아직 준비 중입니다.` });
      return;
    }
    sessionStorage.setItem('oauth_provider', provider);
    const redirect = encodeURIComponent(window.location.origin);
    if (provider === 'kakao') {
      window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirect}&response_type=code`;
    } else if (provider === 'naver') {
      window.location.href = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirect}&state=bookstory`;
    } else if (provider === 'google') {
      window.location.href = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=email%20profile`;
    }
  };

  const fetchFriendRequests = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_URL}/api/friends/requests`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) setFriendRequests(await res.json());
    } catch {}
  };

  const handleAcceptFriend = async (friendshipId) => {
    if (!user?.token) return;
    try {
      await fetch(`${API_URL}/api/friends/${friendshipId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setFriendRequests(prev => prev.filter(r => r.id !== friendshipId));
      setToast({ show: true, message: '친구 요청을 수락했습니다!' });
    } catch {}
  };

  const handleRejectFriend = async (friendshipId) => {
    if (!user?.token) return;
    try {
      await fetch(`${API_URL}/api/friends/${friendshipId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setFriendRequests(prev => prev.filter(r => r.id !== friendshipId));
    } catch {}
  };

  const handleDeletePost = async (postId) => {
    setCommunityPosts(prev => prev.filter(p => p.id !== postId));
    setSelectedPost(null);
    setPostComments([]);
    try {
      const authH = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
      await fetch(`${API_URL}/api/community/posts/${postId}`, {
        method: 'DELETE',
        headers: authH,
      });
    } catch (e) { console.error('Post delete error:', e); }
    setToast({ show: true, message: '게시물이 삭제됐어요 🗑️' });
  };

  const handleUploadVoiceSample = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setVoiceSampleUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const authH = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
      const res = await fetch(`${API_URL}/api/users/${user.id}/voice-sample`, { method: 'POST', headers: authH, body: formData });
      if (!res.ok) throw new Error();
      alert('목소리 샘플이 등록되었습니다.');
    } catch { alert('목소리 샘플 등록 중 오류가 발생했습니다.'); }
    finally { setVoiceSampleUploading(false); }
  };

  const openPostDetail = async (post) => {
    setSelectedPost(post);
    setCommentInput('');
    setReplyingTo(null);
    setReplyInput('');
    await fetchPostComments(post.id);
  };

  const navTabs = [
    { id: 'stack', label: '책쌓기', icon: <BookOpen size={15} /> },
    { id: 'board', label: '게시판', icon: <MessageSquare size={15} /> },
    { id: 'community', label: '독서모임', icon: <Waves size={15} /> },
    // 'recording' 탭: 백엔드 녹음 분석 기능이 이미지 용량 절감을 위해 비활성화되어 있어 임시로 숨김.
    // 다시 켤 때 이 줄만 복원하면 됨: { id: 'recording', label: '녹음 분석', icon: <Mic size={15} /> },
    { id: 'timer', label: '독서 타이머', icon: <Timer size={15} />, dot: !!timerBook },
  ];

  return (
    <div className="min-h-screen" style={{ color: '#1C140E' }}>
      <div className="fixed pointer-events-none -z-10" style={{ top: '10%', left: '-5%', width: '500px', height: '500px', background: 'rgba(140,107,66,0.1)', filter: 'blur(160px)', borderRadius: '9999px' }} />
      <div className="fixed pointer-events-none -z-10" style={{ bottom: '10%', right: '-5%', width: '500px', height: '500px', background: 'rgba(196,148,86,0.1)', filter: 'blur(160px)', borderRadius: '9999px' }} />

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
              {friendRequests.length > 0 && (
                <button
                  onClick={() => setUserLibrary({ userId: user.id, userName: user.name, showFriendRequests: true })}
                  title="친구 요청"
                  style={{ position: 'relative', cursor: 'pointer', width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <UserPlus size={13} style={{ color: '#8C6B42' }} />
                  <span style={{ position: 'absolute', top: '-3px', right: '-3px', width: '14px', height: '14px', borderRadius: '9999px', background: '#C49456', color: 'white', fontSize: '9px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white' }}>
                    {friendRequests.length}
                  </span>
                </button>
              )}
              {user.is_admin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  title="관리자 페이지"
                  style={{ cursor: 'pointer', width: '2rem', height: '2rem', borderRadius: '9999px', background: activeTab === 'admin' ? 'rgba(140,107,66,0.2)' : 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <ShieldCheck size={13} style={{ color: '#8C6B42' }} />
                </button>
              )}
            <div
                onClick={() => setUserLibrary({ userId: user.id, userName: user.name })}
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)', cursor: 'pointer', transition: 'background 0.2s' }}
                title="내 서재 보기"
              >
                <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'linear-gradient(135deg, #8C6B42, #C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '11px', flexShrink: 0, overflow: 'hidden' }}>
                  {user.profile_image ? <img src={user.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.name[0]}
                </div>
                <div className="sm:block hidden">
                  <p style={{ fontSize: '9px', color: '#8C6B42', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', lineHeight: 1 }}>Active Reader</p>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 800, lineHeight: 1.3, marginTop: '2px' }}>{user.name}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="로그아웃"
                style={{ cursor: 'pointer', width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(140,107,66,0.08)'; e.currentTarget.style.borderColor = 'rgba(140,107,66,0.18)'; }}
              >
                <LogOut size={13} style={{ color: '#9E8D7A' }} />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6">
        <div style={{ paddingTop: '2rem', paddingBottom: '1.5rem' }}>
          <div className="relative">
            <input
              type="text"
              placeholder="책 제목, 저자를 검색하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setActiveTab('search')}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
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

        <div className="flex items-center justify-between mb-8" style={{ gap: '1rem' }}>
          <div className="nav-pill-group">
            {navTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-pill ${activeTab === tab.id ? 'nav-pill-active' : ''}`}
                style={{ position: 'relative' }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.dot && (
                  <span style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', borderRadius: '9999px', background: '#C49456', boxShadow: '0 0 6px rgba(196,148,86,0.8)' }} />
                )}
              </button>
            ))}
          </div>

          {activeTab === 'stack' && (
            <div className="flex p-1 rounded-xl" style={{ background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.15)' }}>
              <button onClick={() => setViewMode('tower')} className="rounded-lg font-black transition-all" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', background: viewMode === 'tower' ? 'white' : 'transparent', color: viewMode === 'tower' ? '#1C140E' : '#9E8D7A', boxShadow: viewMode === 'tower' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none' }}>쌓아보기</button>
              <button onClick={() => setViewMode('list')} className="rounded-lg font-black transition-all" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', background: viewMode === 'list' ? 'white' : 'transparent', color: viewMode === 'list' ? '#1C140E' : '#9E8D7A', boxShadow: viewMode === 'list' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none' }}>리스트</button>
            </div>
          )}
        </div>

        <main style={{ paddingBottom: '5rem' }}>
          {activeTab === 'stack' && (
            <StackTab
              user={user}
              readBooks={readBooks}
              viewMode={viewMode}
              recommendations={recommendations}
              isFetchingTendency={isFetchingTendency}
              isFetchingRecs={isFetchingRecs}
              onBookClick={handleBookClick}
              onStackBookClick={handleStackBookClick}
              onFetchTendency={handleFetchTendency}
              onFetchRecommendations={handleFetchRecommendations}
              onDeleteBook={handleDeleteBook}
              onUpdatePages={user ? handleUpdatePages : null}
            />
          )}
          {activeTab === 'search' && (
            <SearchTab
              searchResults={searchResults}
              searchQuery={searchQuery}
              isSearching={isSearching}
              onBookClick={handleBookClick}
              hasMore={searchHasMore}
              isFetchingMore={isFetchingMoreSearch}
              onLoadMore={handleLoadMoreSearch}
            />
          )}
          {activeTab === 'clubs' && (
            <ClubsTab
              user={user}
              clubs={clubs}
              joinedClubs={joinedClubs}
              onSelectClub={setSelectedClub}
              onCreateClub={() => setIsCreatingClub(true)}
            />
          )}
          {activeTab === 'board' && (
            <CommunityTab
              user={user}
              communityPosts={communityPosts}
              hasMore={communityHasMore}
              isFetchingMore={isFetchingMorePosts}
              onOpenPost={openPostDetail}
              onLikePost={handleLikePost}
              onWritePost={() => {
                if (!user) { setToast({ show: true, message: '로그인이 필요합니다.' }); return; }
                setIsWritingPost(true);
              }}
              onLoadMore={handleLoadMorePosts}
              onOpenUserLibrary={(userId, userName) => setUserLibrary({ userId, userName })}
            />
          )}
          {activeTab === 'community' && (
            <DiveTab
              user={user}
              diveRooms={diveRooms}
              isFetchingRooms={isFetchingRooms}
              onCreateRoom={() => {
                if (!user) { setToast({ show: true, message: '로그인이 필요합니다.' }); return; }
                setIsCreatingDiveRoom(true);
              }}
              onOpenRoom={setSelectedDiveRoom}
              onOpenUserLibrary={(userId, userName) => setUserLibrary({ userId, userName })}
            />
          )}
          {activeTab === 'recording' && (
            <RecordingTab user={user} />
          )}
          {activeTab === 'timer' && (
            <TimerTab
              user={user}
              readBooks={readBooks}
              timerBook={timerBook}
              timerSeconds={timerSeconds}
              timerRunning={timerRunning}
              onStart={handleStartTimer}
              onPause={handlePauseTimer}
              onResume={handleResumeTimer}
              onStop={handleStopTimer}
              widgetHidden={timerWidgetHidden}
              onToggleWidget={() => setTimerWidgetHidden(h => !h)}
            />
          )}
          {activeTab === 'admin' && user?.is_admin && (
            <AdminTab user={user} />
          )}
        </main>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'rgba(28,20,14,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(139,107,66,0.3)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Registration modal */}
      <AnimatePresence>
        {!user && (
          <RegistrationModal
            regForm={regForm}
            setRegForm={setRegForm}
            onRegister={handleRegisterUser}
            onLogin={handleLoginUser}
            onSetInitialPassword={handleSetInitialPassword}
            onAdminLogin={handleAdminLogin}
            onOAuthLogin={handleOAuthLogin}
          />
        )}
      </AnimatePresence>

      {/* Create club modal */}
      <AnimatePresence>
        {isCreatingClub && (
          <CreateClubModal
            clubForm={clubForm}
            setClubForm={setClubForm}
            isSavingClub={isSavingClub}
            onClose={() => setIsCreatingClub(false)}
            onCreate={handleCreateClub}
          />
        )}
      </AnimatePresence>

      {/* Club detail modal */}
      <AnimatePresence>
        {selectedClub && (
          <ClubModal
            club={selectedClub}
            user={user}
            joinedClubs={joinedClubs}
            clubReviews={clubReviews}
            myRating={myRating}
            hoverRating={hoverRating}
            myReviewText={myReviewText}
            isSubmittingReview={isSubmittingReview}
            onClose={() => setSelectedClub(null)}
            onJoin={handleJoinClub}
            onSubmitReview={handleSubmitReview}
            setMyRating={setMyRating}
            setHoverRating={setHoverRating}
            setMyReviewText={setMyReviewText}
          />
        )}
      </AnimatePresence>

      {/* Write post modal */}
      <AnimatePresence>
        {isWritingPost && (
          <WritePostModal
            postForm={postForm}
            setPostForm={setPostForm}
            isSubmitting={isSubmittingPost}
            onClose={() => { setIsWritingPost(false); setPostForm({ title: '', content: '', book_title: '' }); }}
            onSubmit={handleWritePost}
          />
        )}
      </AnimatePresence>

      {/* Tendency modal */}
      <AnimatePresence>
        {showTendencyModal && tendencyResult && (
          <TendencyModal
            tendencyResult={tendencyResult}
            userName={user?.name || ''}
            onClose={() => setShowTendencyModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Conversation Q&A modal */}
      <AnimatePresence>
        {isConversing && selectedBook && (
          <ConversationModal
            selectedBook={selectedBook}
            sessionQA={sessionQA}
            conversationInput={conversationInput}
            setConversationInput={setConversationInput}
            isSubmittingAnswer={isSubmittingAnswer}
            onClose={() => setIsConversing(false)}
            onSubmitAnswer={handleSubmitAnswer}
            user={user}
          />
        )}
      </AnimatePresence>

      {/* Post detail modal */}
      <AnimatePresence>
        {selectedPost && (
          <PostModal
            post={selectedPost}
            comments={postComments}
            user={user}
            commentInput={commentInput}
            setCommentInput={setCommentInput}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            replyInput={replyInput}
            setReplyInput={setReplyInput}
            replyingToMention={replyingToMention}
            setReplyingToMention={setReplyingToMention}
            isSubmittingComment={isSubmittingComment}
            onClose={() => { setSelectedPost(null); setPostComments([]); }}
            onLike={() => {
              handleLikePost(selectedPost.id);
              setSelectedPost(prev => ({ ...prev, liked: !prev.liked, likes: prev.liked ? (prev.likes || 1) - 1 : (prev.likes || 0) + 1 }));
            }}
            onSubmitComment={handleSubmitComment}
            onSubmitReply={handleSubmitReply}
            onDeletePost={() => handleDeletePost(selectedPost.id)}
            onDeleteComment={handleDeleteComment}
            onOpenUserLibrary={(userId, userName) => setUserLibrary({ userId, userName })}
            onBookTagAction={handleBookTagAction}
          />
        )}
      </AnimatePresence>

      {/* Book analysis modal */}
      <AnimatePresence>
        {selectedBook && (
          <BookModal
            book={selectedBook}
            token={user?.token}
            analysisResult={analysisResult}
            questions={questions}
            isAnalyzing={isAnalyzing}
            bookImpression={bookImpression}
            setBookImpression={setBookImpression}
            bookImpressionPublic={bookImpressionPublic}
            setBookImpressionPublic={setBookImpressionPublic}
            currentBookPages={currentBookPages}
            setCurrentBookPages={setCurrentBookPages}
            isSaving={isSaving}
            isSavingImpression={isSavingImpression}
            timerBook={timerBook}
            onClose={() => setSelectedBook(null)}
            onRegister={() => handleRegisterBook(selectedBook)}
            onLoadAnalysis={handleLoadAnalysis}
            onStartDiscussion={handleStartDiscussion}
            onSaveImpression={handleSaveImpression}
            onDeleteBook={() => { handleDeleteBook(selectedBook.id); setSelectedBook(null); }}
            onStartTimer={user ? handleStartTimer : null}
          />
        )}
      </AnimatePresence>

      {/* Reading timer */}
      <AnimatePresence>
        {timerBook && !timerWidgetHidden && (
          <ReadingTimer
            book={timerBook}
            seconds={timerSeconds}
            isRunning={timerRunning}
            onPause={handlePauseTimer}
            onResume={handleResumeTimer}
            onStop={handleStopTimer}
            onHide={() => setTimerWidgetHidden(true)}
          />
        )}
      </AnimatePresence>

      {/* User library modal */}
      <AnimatePresence>
        {userLibrary && (
          <UserLibraryModal
            userId={userLibrary.userId}
            userName={userLibrary.userName}
            currentUserId={user?.id}
            token={user?.token}
            friendRequests={userLibrary.showFriendRequests ? friendRequests : []}
            onAcceptFriend={handleAcceptFriend}
            onRejectFriend={handleRejectFriend}
            onClose={() => setUserLibrary(null)}
            onEditProfile={userLibrary.userId === user?.id ? () => { setUserLibrary(null); setShowProfile(true); } : undefined}
            currentAiPersona={user?.ai_persona}
            onUpdatePersona={(personaId) => handleUpdateProfile({ ai_persona: personaId })}
          />
        )}
      </AnimatePresence>

      {/* Timer complete modal */}
      <AnimatePresence>
        {showTimerComplete && timerBook && (
          <TimerCompleteModal
            book={timerBook}
            seconds={timerSeconds}
            onFinished={() => handleTimerComplete(true)}
            onStillReading={() => handleTimerComplete(false)}
            onCancel={handleCancelTimerComplete}
          />
        )}
      </AnimatePresence>

      {/* 방치된 채 자동 종료된 다이브룸 세션의 독서시간 확인 */}
      <AnimatePresence>
        {pendingTimeConfirmations.length > 0 && (
          <PendingTimeConfirmModal
            item={pendingTimeConfirmations[0]}
            onConfirm={(seconds) => handleConfirmPendingTime(pendingTimeConfirmations[0].room_id, seconds)}
            onDismiss={() => setPendingTimeConfirmations(prev => prev.slice(1))}
          />
        )}
      </AnimatePresence>

      {/* Create dive room modal */}
      <AnimatePresence>
        {isCreatingDiveRoom && (
          <CreateDiveRoomModal
            user={user}
            onClose={() => setIsCreatingDiveRoom(false)}
            onCreate={handleCreateDiveRoom}
          />
        )}
      </AnimatePresence>

      {/* Dive room detail modal — 명시적으로 연 방(selectedDiveRoom) 또는 새로고침 후에도
          여전히 활성 참여 중인 방(activeDiveRoom, 최소화 위젯으로 복원)을 보여준다 */}
      <AnimatePresence>
        {(selectedDiveRoom || activeDiveRoom) && (
          <DiveRoomModal
            room={selectedDiveRoom || activeDiveRoom}
            user={user}
            startMinimized={!selectedDiveRoom}
            onClose={() => { setSelectedDiveRoom(null); setActiveDiveRoom(null); }}
            onJoin={() => { fetchDiveRooms(); fetchActiveDiveRoom(); }}
            onLeave={() => { fetchDiveRooms(); fetchActiveDiveRoom(); }}
            onDelete={() => { fetchDiveRooms(); fetchActiveDiveRoom(); }}
            onStatusChange={() => { fetchDiveRooms(); fetchActiveDiveRoom(); }}
            onOpenUserLibrary={(userId, userName) => setUserLibrary({ userId, userName })}
            onSwitchToPersonal={(book) => { handleStartTimer(book); setActiveTab('timer'); }}
          />
        )}
      </AnimatePresence>

      {/* Profile modal */}
      <AnimatePresence>
        {showProfile && user && (
          <ProfileModal
            user={user}
            onClose={() => setShowProfile(false)}
            onSave={handleUpdateProfile}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
