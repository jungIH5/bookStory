import React, { useState, useRef, useEffect } from 'react';
import { Users, Search, BookOpen, MessageSquare, Loader2, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from './api';
import { stripHtml, getDistance, getValidUserId } from './utils';

import StackTab from './components/tabs/StackTab';
import SearchTab from './components/tabs/SearchTab';
import ClubsTab from './components/tabs/ClubsTab';
import CommunityTab from './components/tabs/CommunityTab';
import RecordingTab from './components/tabs/RecordingTab';

import RegistrationModal from './components/RegistrationModal';
import BookModal from './components/modals/BookModal';
import ClubModal from './components/modals/ClubModal';
import CreateClubModal from './components/modals/CreateClubModal';
import WritePostModal from './components/modals/WritePostModal';
import TendencyModal from './components/modals/TendencyModal';
import ConversationModal from './components/modals/ConversationModal';
import PostModal from './components/modals/PostModal';

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

  const [regForm, setRegForm] = useState({ name: '', gender: '남성', age: 20, location: '', lat: null, lng: null });
  const [selectedClub, setSelectedClub] = useState(null);
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [clubForm, setClubForm] = useState({ name: '', description: '', category: '독서/기록', location: '', lat: null, lng: null, image: '' });
  const [isSavingClub, setIsSavingClub] = useState(false);
  const [joinedClubs, setJoinedClubs] = useState(new Set());
  const [isWritingPost, setIsWritingPost] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '', book_title: '' });
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

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
  const [toast, setToast] = useState({ show: false, message: '' });

  const [selectedPost, setSelectedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyInput, setReplyInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingToMention, setReplyingToMention] = useState('');

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

  useEffect(() => {
    fetchReadBooks();
    fetchCommunityPosts();
  }, [user?.id]);

  useEffect(() => {
    fetchClubs();
    fetchJoinedClubs();
  }, [user]);

  useEffect(() => {
    if (selectedClub) {
      fetchClubReviews(selectedClub.id);
      setMyRating(0);
      setMyReviewText('');
    }
  }, [selectedClub]);

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

  const fetchCommunityPosts = async () => {
    try {
      const numId = user?.id ? parseInt(user.id) : NaN;
      const uid = !isNaN(numId) && numId > 0 ? `?user_id=${numId}` : '';
      const response = await fetch(`${API_URL}/api/community/posts${uid}`);
      const data = await response.json();
      setCommunityPosts(Array.isArray(data) ? data : (Array.isArray(data?.posts) ? data.posts : []));
    } catch (error) { console.error('Failed to fetch posts'); }
  };

  const fetchJoinedClubs = async () => {
    if (!user?.id) return;
    try {
      const headers = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
      const response = await fetch(`${API_URL}/api/clubs/joined`, { headers });
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
    setActiveTab('search');
    try {
      const response = await fetch(`${API_URL}/api/books/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.items || []);
    } catch (error) { console.error('Search error:', error); }
    finally { setIsSearching(false); }
  };

  const handleBookClick = (book) => {
    setSelectedBook(book);
    setAnalysisResult(stripHtml(book.description || ''));
    setQuestions({ thematic: [], perspective_shift: [] });
    setIsAnalyzing(false);
  };

  const handleStackBookClick = (book) => {
    setSelectedBook({ ...book, description: '', fromStack: true });
    setAnalysisResult('');
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
        const stored = { ...data.user, token: data.token };
        setUser(stored);
        localStorage.setItem('bookstory_user', JSON.stringify(stored));
        window.location.reload();
      }
    } catch (error) { alert('가입 중 오류가 발생했습니다.'); }
  };

  const handleTestLogin = async () => {
    const cached = localStorage.getItem('bookstory_test_user');
    if (cached) {
      const parsed = JSON.parse(cached);
      const stored = (parsed?.user && parsed?.token && !parsed?.id)
        ? { ...parsed.user, token: parsed.token } : parsed;
      setUser(stored);
      localStorage.setItem('bookstory_user', JSON.stringify(stored));
      window.location.reload();
      return;
    }
    const testData = { name: '테스트유저', gender: '기타', age: 20, location: '서울 강남구', lat: 37.4979, lng: 127.0276 };
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      const data = await response.json();
      if (response.ok) {
        const stored = { ...data.user, token: data.token };
        setUser(stored);
        localStorage.setItem('bookstory_user', JSON.stringify(stored));
        localStorage.setItem('bookstory_test_user', JSON.stringify(stored));
        window.location.reload();
      }
    } catch (error) {
      const fallback = { id: 1, ...testData, token: null };
      setUser(fallback);
      localStorage.setItem('bookstory_user', JSON.stringify(fallback));
      localStorage.setItem('bookstory_test_user', JSON.stringify(fallback));
      window.location.reload();
    }
  };

  const handleRegisterBook = async (book) => {
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
    setToast({ show: true, message: `"${cleanTitle.slice(0, 16)}${cleanTitle.length > 16 ? '...' : ''}" 서재에 추가됐어요 📚` });
    try {
      const response = await fetch(`${API_URL}/api/books/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title, author: book.author, image: book.image,
          publisher: book.publisher, isbn: book.isbn, pages: currentBookPages,
          impression: bookImpression, is_public: bookImpressionPublic,
          user_id: getValidUserId(user),
        })
      });
      if (response.ok) {
        const data = await response.json();
        setReadBooks(prev => prev.map(b => b.id === tempId ? { ...data, title: stripHtml(data.title) } : b));
      }
    } catch (error) { console.error('Book save error:', error); }
    finally { setIsSaving(false); }
  };

  const handleSaveImpression = async () => {
    if (!selectedBook?.id || String(selectedBook.id).startsWith('temp-')) return;
    setIsSavingImpression(true);
    try {
      const res = await fetch(`${API_URL}/api/books/read/${selectedBook.id}/impression`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ impression: bookImpression, is_public: bookImpressionPublic })
      });
      if (res.ok) {
        const updated = await res.json();
        setReadBooks(prev => prev.map(b => b.id === selectedBook.id ? { ...b, ...updated, title: stripHtml(updated.title) } : b));
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
        await fetchClubs();
        setIsCreatingClub(false);
        setClubForm({ name: '', description: '', category: '독서/기록', location: '', lat: null, lng: null, image: '' });
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
        await fetch(`${API_URL}/api/clubs/${clubId}/leave`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...authH },
          body: JSON.stringify({ user_id: uid })
        });
        setJoinedClubs(prev => { const s = new Set(prev); s.delete(clubId); return s; });
        if (selectedClub?.id === clubId) setSelectedClub(prev => ({ ...prev, member_count: prev.member_count - 1 }));
      } else {
        await fetch(`${API_URL}/api/clubs/${clubId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authH },
          body: JSON.stringify({ user_id: uid })
        });
        setJoinedClubs(prev => new Set([...prev, clubId]));
        if (selectedClub?.id === clubId) setSelectedClub(prev => ({ ...prev, member_count: prev.member_count + 1 }));
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

  const handleWritePost = async (bookTitle) => {
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
          book_title: bookTitle || postForm.book_title,
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
    { id: 'clubs', label: '모임찾기', icon: <Users size={15} /> },
    { id: 'community', label: '커뮤니티', icon: <MessageSquare size={15} /> },
    { id: 'recording', label: '녹음 분석', icon: <Mic size={15} /> },
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
              >
                {tab.icon}
                <span>{tab.label}</span>
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
            />
          )}
          {activeTab === 'search' && (
            <SearchTab
              searchResults={searchResults}
              searchQuery={searchQuery}
              isSearching={isSearching}
              onBookClick={handleBookClick}
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
          {activeTab === 'community' && (
            <CommunityTab
              user={user}
              communityPosts={communityPosts}
              onOpenPost={openPostDetail}
              onLikePost={handleLikePost}
              onWritePost={() => setIsWritingPost(true)}
            />
          )}
          {activeTab === 'recording' && (
            <RecordingTab user={user} />
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
            onTestLogin={handleTestLogin}
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
          />
        )}
      </AnimatePresence>

      {/* Book analysis modal */}
      <AnimatePresence>
        {selectedBook && (
          <BookModal
            book={selectedBook}
            analysisResult={analysisResult}
            questions={questions}
            isAnalyzing={isAnalyzing}
            bookImpression={bookImpression}
            setBookImpression={setBookImpression}
            bookImpressionPublic={bookImpressionPublic}
            setBookImpressionPublic={setBookImpressionPublic}
            isSaving={isSaving}
            isSavingImpression={isSavingImpression}
            onClose={() => setSelectedBook(null)}
            onRegister={() => handleRegisterBook(selectedBook)}
            onLoadAnalysis={handleLoadAnalysis}
            onStartDiscussion={handleStartDiscussion}
            onSaveImpression={handleSaveImpression}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
