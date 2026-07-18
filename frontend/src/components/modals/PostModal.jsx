import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen, Heart, Loader2, Send, CornerDownRight, Trash2, Pencil, Search } from 'lucide-react';
import { renderMarkdown, stripHtml } from '../../utils';
import { API_URL } from '../../api';

const chipBtnStyle = (color) => ({
  padding: '0.3rem 0.75rem', background: `${color}15`, border: `1px solid ${color}40`,
  borderRadius: '9999px', fontSize: '11px', fontWeight: 800, color, cursor: 'pointer',
});

export default function PostModal({
  post, comments, user,
  commentInput, setCommentInput,
  replyingTo, setReplyingTo,
  replyInput, setReplyInput,
  replyingToMention, setReplyingToMention,
  isSubmittingComment,
  onClose, onLike, onSubmitComment, onSubmitReply, onDeletePost, onDeleteComment, onOpenUserLibrary, onBookTagAction,
}) {
  const [showBookEdit, setShowBookEdit] = useState(false);
  const [bookEditQuery, setBookEditQuery] = useState('');
  const [bookEditResults, setBookEditResults] = useState([]);
  const [isSearchingBookEdit, setIsSearchingBookEdit] = useState(false);
  const bookEditTimer = useRef(null);

  const isAuthor = user && post.user_id && Number(post.user_id) === Number(user.id);
  const needsBookTagReview = post.book_tag_source === 'ai' && !post.book_tag_confirmed;

  const searchBookEdit = (query) => {
    if (bookEditTimer.current) clearTimeout(bookEditTimer.current);
    if (!query.trim()) { setBookEditResults([]); return; }
    bookEditTimer.current = setTimeout(async () => {
      setIsSearchingBookEdit(true);
      try {
        const res = await fetch(`${API_URL}/api/books/search?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        setBookEditResults((data.items || []).slice(0, 5));
      } catch {} finally { setIsSearchingBookEdit(false); }
    }, 320);
  };
  return (
    <div className="modal-backdrop overflow-y-auto" onClick={() => { setReplyingTo(null); onClose(); }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 32 }}
        onClick={e => e.stopPropagation()}
        className="modal-content relative my-auto"
        style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {post.book_title && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.625rem', padding: '4px 10px 4px 8px', background: 'linear-gradient(135deg, rgba(140,107,66,0.1), rgba(196,148,86,0.08))', border: '1px solid rgba(140,107,66,0.2)', borderRadius: '8px' }}>
                <BookOpen size={11} style={{ color: '#8C6B42', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#8C6B42' }}>{post.book_title}</span>
                {needsBookTagReview && (
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#C49456' }}>· AI 추정</span>
                )}
              </div>
            )}
            {needsBookTagReview && isAuthor && onBookTagAction && (
              <div style={{ marginBottom: '0.75rem', padding: '0.625rem 0.875rem', background: 'rgba(196,148,86,0.06)', border: '1px solid rgba(196,148,86,0.25)', borderRadius: '0.75rem' }}>
                {!showBookEdit ? (
                  <>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#8C6B42', marginBottom: '0.5rem' }}>
                      🤖 AI가 이 글을 위 책에 대한 이야기로 추정했어요. 맞나요?
                    </p>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <button onClick={() => onBookTagAction('confirm')} style={chipBtnStyle('#16a34a')}>맞아요</button>
                      <button onClick={() => setShowBookEdit(true)} style={chipBtnStyle('#8C6B42')}>다른 책이에요</button>
                      <button onClick={() => onBookTagAction('dismiss')} style={chipBtnStyle('#9E8D7A')}>책 얘기 아니에요</button>
                    </div>
                  </>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} size={13} />
                      <input
                        value={bookEditQuery}
                        onChange={e => { setBookEditQuery(e.target.value); searchBookEdit(e.target.value); }}
                        placeholder="책 제목 검색..."
                        className="form-input"
                        style={{ height: '2.25rem', fontSize: '0.8125rem', color: '#1C140E', paddingLeft: '2.25rem' }}
                        autoFocus
                      />
                      {isSearchingBookEdit && <Loader2 size={13} className="animate-spin" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#BDB0A0' }} />}
                    </div>
                    {bookEditResults.length > 0 && (
                      <div style={{ marginTop: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '160px', overflowY: 'auto' }}>
                        {bookEditResults.map((b, i) => (
                          <div key={i}
                            onClick={() => { onBookTagAction('edit', b); setShowBookEdit(false); setBookEditQuery(''); setBookEditResults([]); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(139,107,66,0.1)', borderRadius: '0.5rem', cursor: 'pointer' }}
                          >
                            {b.image && <img src={b.image} alt="" style={{ width: '20px', height: '28px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }} />}
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#3D2D1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripHtml(b.title)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => { setShowBookEdit(false); setBookEditQuery(''); setBookEditResults([]); }} style={{ ...chipBtnStyle('#9E8D7A'), marginTop: '0.375rem' }}>취소</button>
                  </div>
                )}
              </div>
            )}
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>{post.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#9E8D7A' }}>
              <div
                onClick={() => post.user_id && onOpenUserLibrary && onOpenUserLibrary(post.user_id, post.author)}
                style={{ width: '1.625rem', height: '1.625rem', borderRadius: '9999px', background: 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '9px', cursor: post.user_id ? 'pointer' : 'default', overflow: 'hidden' }}
              >{post.author_image ? <img src={post.author_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (post.author || '?')[0]}</div>
              <span
                onClick={() => post.user_id && onOpenUserLibrary && onOpenUserLibrary(post.user_id, post.author)}
                style={{ fontWeight: 700, color: '#7B6B55', cursor: post.user_id ? 'pointer' : 'default', textDecoration: post.user_id ? 'underline' : 'none', textUnderlineOffset: '2px', textDecorationColor: 'rgba(139,107,66,0.3)' }}
              >{post.author || '익명'}</span>
              <span>·</span>
              <span style={{ fontSize: '11px' }}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(139,107,66,0.08)', border: '1px solid rgba(139,107,66,0.12)', width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E8D7A', flexShrink: 0 }}><X size={16} /></button>
        </div>

        <div style={{ background: 'rgba(139,107,66,0.03)', border: '1px solid rgba(139,107,66,0.1)', borderRadius: '0.875rem', padding: '1rem 1.125rem' }}>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.8, color: '#3D2D1E', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <button onClick={onLike}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 700, color: post.liked ? '#fb7185' : '#9E8D7A', cursor: 'pointer', background: post.liked ? 'rgba(251,113,133,0.08)' : 'rgba(139,107,66,0.06)', border: `1px solid ${post.liked ? 'rgba(251,113,133,0.25)' : 'rgba(139,107,66,0.15)'}`, borderRadius: '9999px', padding: '0.375rem 0.875rem', transition: 'all 0.2s' }}>
            <Heart size={14} fill={post.liked ? '#fb7185' : 'none'} />
            공감 {post.likes || 0}
          </button>
          {onDeletePost && user && post.user_id && Number(post.user_id) === Number(user.id) && (
            <button onClick={onDeletePost}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', cursor: 'pointer', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '9999px', padding: '0.375rem 0.875rem', transition: 'all 0.2s' }}>
              <Trash2 size={13} />
              삭제
            </button>
          )}
        </div>

        <div style={{ borderTop: '1px solid rgba(139,107,66,0.1)', paddingTop: '1rem' }}>
          <h4 style={{ fontSize: '9px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.875rem' }}>댓글 {comments.length}개</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem', marginBottom: '1rem' }}>
            {comments.filter(c => !c.parent_comment_id).map(comment => (
              <div key={comment.id}>
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '1.625rem', height: '1.625rem', borderRadius: '9999px', background: 'linear-gradient(135deg,#8C6B42,#C49456)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '9px', flexShrink: 0, overflow: 'hidden' }}>{comment.author_image ? <img src={comment.author_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (comment.author || '?')[0]}</div>
                  <div style={{ flex: 1, background: 'rgba(139,107,66,0.04)', border: '1px solid rgba(139,107,66,0.1)', borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '0.625rem 0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3D2D1E' }}>{comment.author}</span>
                      <span style={{ fontSize: '10px', color: '#BDB0A0' }}>{new Date(comment.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: '#5C4F42' }}>{comment.content}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem' }}>
                      {user && (
                        <button onClick={() => { const same = replyingTo === comment.id && !replyingToMention; setReplyingTo(same ? null : comment.id); setReplyingToMention(''); setReplyInput(''); }}
                          style={{ fontSize: '10px', color: '#9E8D7A', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}>
                          <CornerDownRight size={10} /> 답글
                        </button>
                      )}
                      {onDeleteComment && user && comment.user_id && Number(comment.user_id) === Number(user.id) && (
                        <button onClick={() => onDeleteComment(comment.id)}
                          style={{ fontSize: '10px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}>
                          <Trash2 size={10} /> 삭제
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {comments.filter(r => r.parent_comment_id === comment.id).map(reply => (
                  <div key={reply.id} style={{ marginTop: '0.5rem', marginLeft: '2.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                      <CornerDownRight size={12} style={{ color: '#BDB0A0', flexShrink: 0, marginTop: '6px' }} />
                      <div style={{ width: '1.375rem', height: '1.375rem', borderRadius: '9999px', background: 'rgba(196,148,86,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8C6B42', fontWeight: 900, fontSize: '9px', flexShrink: 0, overflow: 'hidden' }}>{reply.author_image ? <img src={reply.author_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (reply.author || '?')[0]}</div>
                      <div style={{ flex: 1, background: 'rgba(196,148,86,0.04)', border: '1px solid rgba(196,148,86,0.12)', borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '0.5rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3D2D1E' }}>{reply.author}</span>
                          <span style={{ fontSize: '10px', color: '#BDB0A0' }}>{new Date(reply.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: '#5C4F42' }}>
                          {reply.content.startsWith('@') ? (
                            <>
                              <span style={{ color: '#8C6B42', fontWeight: 700 }}>{reply.content.split(' ')[0]} </span>
                              {reply.content.slice(reply.content.indexOf(' ') + 1)}
                            </>
                          ) : reply.content}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                          {user && (
                            <button onClick={() => { setReplyingTo(comment.id); setReplyingToMention(`@${reply.author} `); setReplyInput(''); }}
                              style={{ fontSize: '10px', color: '#9E8D7A', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}>
                              <CornerDownRight size={10} /> 답글
                            </button>
                          )}
                          {onDeleteComment && user && reply.user_id && Number(reply.user_id) === Number(user.id) && (
                            <button onClick={() => onDeleteComment(reply.id)}
                              style={{ fontSize: '10px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}>
                              <Trash2 size={10} /> 삭제
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {replyingTo === comment.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', marginLeft: '2.25rem' }}>
                    {replyingToMention && (
                      <span style={{ fontSize: '10px', color: '#8C6B42', fontWeight: 700, paddingLeft: '0.25rem' }}>{replyingToMention}에게 답글</span>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        value={replyInput}
                        onChange={e => setReplyInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmitReply(comment.id); } }}
                        placeholder={replyingToMention ? `${replyingToMention}에게 답글...` : '답글을 입력하세요...'}
                        className="form-input"
                        style={{ flex: 1, height: '2.5rem', fontSize: '0.8125rem', color: '#1C140E' }}
                        autoFocus
                      />
                      <button onClick={() => onSubmitReply(comment.id)} disabled={!replyInput.trim() || isSubmittingComment}
                        style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: replyInput.trim() ? 'linear-gradient(135deg,#8C6B42,#C49456)' : 'rgba(139,107,66,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: replyInput.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
                        <Send size={13} color="white" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {comments.length === 0 && (
              <p style={{ textAlign: 'center', color: '#BDB0A0', fontSize: '0.8125rem', padding: '1rem 0' }}>첫 댓글을 남겨보세요!</p>
            )}
          </div>

          {user ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmitComment(); } }}
                placeholder="댓글을 입력하세요... (Enter로 등록)"
                className="form-input"
                style={{ flex: 1, height: '2.75rem', fontSize: '0.8125rem', color: '#1C140E' }}
              />
              <button onClick={onSubmitComment} disabled={!commentInput.trim() || isSubmittingComment}
                style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: commentInput.trim() ? 'linear-gradient(135deg,#8C6B42,#C49456)' : 'rgba(139,107,66,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: commentInput.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
                {isSubmittingComment ? <Loader2 size={14} className="animate-spin" color="white" /> : <Send size={14} color="white" />}
              </button>
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#BDB0A0', padding: '0.75rem', background: 'rgba(139,107,66,0.04)', borderRadius: '0.75rem' }}>댓글을 작성하려면 로그인이 필요합니다.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
