import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Upload, FileAudio, Sparkles, Loader2, History, ChevronDown, ChevronUp, MessageSquare, BookOpen } from 'lucide-react';
import { API_URL } from '../../api';
import { formatDuration } from '../../utils';

export default function RecordingTab({ user }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFile, setRecordingFile] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingResult, setRecordingResult] = useState(null);
  const [isAnalyzingRecording, setIsAnalyzingRecording] = useState(false);
  const [pastRecordings, setPastRecordings] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedRecording, setExpandedRecording] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setHistoryLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/recordings?user_id=${user.id}`).then(r => r.ok ? r.json() : []),
      fetch(`${API_URL}/api/sessions?user_id=${user.id}`).then(r => r.ok ? r.json() : []),
    ]).then(([recs, sessions]) => {
      setPastRecordings(Array.isArray(recs) ? recs : []);
      setPastSessions(Array.isArray(sessions) ? sessions : []);
    }).catch(() => {}).finally(() => setHistoryLoading(false));
  }, [user?.id]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      setRecordingFile(null);
      setRecordingResult(null);
      setRecordingDuration(0);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
        setRecordingFile(file);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start(1000);
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    } catch {
      alert('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해 주세요.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleUploadRecording = async () => {
    if (!recordingFile) return;
    setIsAnalyzingRecording(true);
    setRecordingResult(null);
    const formData = new FormData();
    formData.append('file', recordingFile);
    if (user?.id) formData.append('user_id', user.id);
    try {
      const response = await fetch(`${API_URL}/api/recordings`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('분석 실패');
      const data = await response.json();
      setRecordingResult(data);
    } catch {
      alert('녹음 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzingRecording(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.625rem', letterSpacing: '-0.03em' }}>
          <Mic style={{ color: '#8C6B42' }} size={28} />
          녹음 분석
        </h2>
        <p style={{ color: '#9E8D7A', fontWeight: 700, fontSize: '0.875rem' }}>독서모임 대화를 직접 녹음하거나 파일을 업로드해 AI가 토론 내용을 분석합니다.</p>
      </div>

      <div style={{ border: '1px solid rgba(139,107,66,0.15)', borderRadius: '1.25rem', padding: '2rem', textAlign: 'center', background: isRecording ? 'rgba(220,74,60,0.03)' : 'rgba(139,107,66,0.03)', marginBottom: '1rem', transition: 'background 0.3s' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <motion.button
            onClick={isRecording ? stopRecording : startRecording}
            animate={isRecording ? { scale: [1, 1.07, 1], boxShadow: ['0 0 0 0 rgba(220,74,60,0.4)', '0 0 0 14px rgba(220,74,60,0)', '0 0 0 0 rgba(220,74,60,0)'] } : {}}
            transition={isRecording ? { duration: 1.4, repeat: Infinity } : {}}
            style={{ width: 72, height: 72, borderRadius: '50%', background: isRecording ? 'linear-gradient(135deg, #dc4a3c, #e06050)' : 'linear-gradient(135deg, #8C6B42, #C49456)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isRecording ? '0 4px 20px rgba(220,74,60,0.35)' : '0 4px 16px rgba(140,107,66,0.25)', transition: 'background 0.3s, box-shadow 0.3s' }}
          >
            {isRecording ? <Square size={26} color="white" fill="white" /> : <Mic size={28} color="white" />}
          </motion.button>

          {(isRecording || recordingDuration > 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: isRecording ? '#dc4a3c' : '#8C6B42', letterSpacing: '0.04em' }}>
                {formatDuration(recordingDuration)}
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: isRecording ? '#dc4a3c' : '#9E8D7A' }}>
                {isRecording ? '녹음 중 — 버튼을 눌러 정지' : '녹음 완료'}
              </span>
            </div>
          ) : (
            <p style={{ color: '#9E8D7A', fontSize: '0.875rem', fontWeight: 600 }}>버튼을 눌러 녹음을 시작하세요</p>
          )}

          {!isRecording && recordingDuration > 0 && (
            <button
              onClick={() => { setRecordingDuration(0); setRecordingFile(null); setRecordingResult(null); }}
              style={{ fontSize: '11px', color: '#9E8D7A', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              다시 녹음
            </button>
          )}
        </div>
      </div>

      <div
        onClick={() => !isRecording && document.getElementById('recording-file-input').click()}
        style={{ border: `1.5px dashed ${recordingFile && recordingDuration === 0 ? 'rgba(140,107,66,0.4)' : 'rgba(139,107,66,0.18)'}`, borderRadius: '0.875rem', padding: '0.75rem 1.25rem', textAlign: 'center', cursor: isRecording ? 'not-allowed' : 'pointer', background: recordingFile && recordingDuration === 0 ? 'rgba(140,107,66,0.05)' : 'transparent', transition: 'all 0.2s ease', marginBottom: '1.25rem', opacity: isRecording ? 0.45 : 1 }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!isRecording) { const f = e.dataTransfer.files[0]; if (f) { setRecordingFile(f); setRecordingDuration(0); setRecordingResult(null); } } }}
      >
        <input
          id="recording-file-input"
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={(e) => { setRecordingFile(e.target.files[0] || null); setRecordingDuration(0); setRecordingResult(null); }}
        />
        {recordingFile && recordingDuration === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <FileAudio size={15} style={{ color: '#8C6B42', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#A07840' }}>{recordingFile.name}</span>
            <span style={{ fontSize: '0.75rem', color: '#9E8D7A' }}>({(recordingFile.size / 1024 / 1024).toFixed(1)} MB)</span>
            <button onClick={(e) => { e.stopPropagation(); setRecordingFile(null); setRecordingResult(null); }} style={{ fontSize: '11px', color: '#9E8D7A', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginLeft: '0.25rem' }}>제거</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Upload size={13} style={{ color: '#BDB0A0' }} />
            <span style={{ fontSize: '0.8125rem', color: '#BDB0A0', fontWeight: 600 }}>파일 업로드 (MP3, WAV, OGG, WebM)</span>
          </div>
        )}
      </div>

      <button
        onClick={handleUploadRecording}
        disabled={!recordingFile || isAnalyzingRecording || isRecording}
        className="premium-button disabled:opacity-40"
        style={{ width: '100%', padding: '1rem', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', marginBottom: '2rem' }}
      >
        {isRecording ? (
          <><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} /><span>녹음 중</span></>
        ) : isAnalyzingRecording ? (
          <><Loader2 className="animate-spin" size={18} /><span>내용 정리 중...</span></>
        ) : (
          <><Sparkles size={18} /><span>대화내용 분석하기</span></>
        )}
      </button>

      {/* 이력 섹션 */}
      {user && (pastRecordings.length > 0 || pastSessions.length > 0) && (
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => setShowHistory(h => !h)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 1rem', background: 'rgba(139,107,66,0.05)', border: '1px solid rgba(139,107,66,0.15)', borderRadius: '0.875rem', cursor: 'pointer', marginBottom: showHistory ? '0.75rem' : 0, transition: 'background 0.15s' }}
          >
            <History size={14} style={{ color: '#8C6B42' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#8C6B42', flex: 1, textAlign: 'left' }}>
              분석 이력 {historyLoading ? '' : `(녹음 ${pastRecordings.length}건 · 대화 ${pastSessions.length}건)`}
            </span>
            {historyLoading ? <Loader2 size={14} className="animate-spin" style={{ color: '#9E8D7A' }} /> : showHistory ? <ChevronUp size={14} style={{ color: '#9E8D7A' }} /> : <ChevronDown size={14} style={{ color: '#9E8D7A' }} />}
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                  {/* 녹음 분석 이력 */}
                  {pastRecordings.length > 0 && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 900, color: '#8C6B42', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Mic size={10} /> 녹음 분석
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        {pastRecordings.map(rec => (
                          <div key={rec.id} style={{ border: '1px solid rgba(139,107,66,0.12)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                            <div onClick={() => setExpandedRecording(expandedRecording === rec.id ? null : rec.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', cursor: 'pointer', background: expandedRecording === rec.id ? 'rgba(140,107,66,0.06)' : 'transparent' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1C140E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {rec.filename || `녹음 #${rec.id}`}
                                </p>
                                <p style={{ fontSize: '10px', color: '#9E8D7A', marginTop: '1px' }}>
                                  {new Date(rec.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {expandedRecording === rec.id ? <ChevronUp size={13} style={{ color: '#9E8D7A', flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: '#9E8D7A', flexShrink: 0 }} />}
                            </div>
                            {expandedRecording === rec.id && (
                              <div style={{ borderTop: '1px solid rgba(139,107,66,0.08)', padding: '0.75rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                {rec.summary && <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#5C4F42' }}>{rec.summary}</p>}
                                {rec.key_topics?.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                                    {rec.key_topics.map((t, i) => (
                                      <span key={i} style={{ fontSize: '10px', fontWeight: 700, color: '#8C6B42', background: 'rgba(140,107,66,0.08)', border: '1px solid rgba(140,107,66,0.18)', padding: '2px 8px', borderRadius: '9999px' }}>{t}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Q&A 세션 이력 */}
                  {pastSessions.length > 0 && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 900, color: '#C49456', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <MessageSquare size={10} /> AI 대화 이력
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        {pastSessions.map(session => (
                          <div key={session.id} style={{ border: '1px solid rgba(196,148,86,0.15)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                            <div onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', cursor: 'pointer', background: expandedSession === session.id ? 'rgba(196,148,86,0.06)' : 'transparent' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1px' }}>
                                  <BookOpen size={10} style={{ color: '#C49456', flexShrink: 0 }} />
                                  <p style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1C140E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {session.resolved_title || session.book_title || '제목 없음'}
                                  </p>
                                </div>
                                <p style={{ fontSize: '10px', color: '#9E8D7A' }}>
                                  {new Date(session.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                                </p>
                              </div>
                              {expandedSession === session.id ? <ChevronUp size={13} style={{ color: '#9E8D7A', flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: '#9E8D7A', flexShrink: 0 }} />}
                            </div>
                            {expandedSession === session.id && session.book_analysis && (
                              <div style={{ borderTop: '1px solid rgba(196,148,86,0.1)', padding: '0.75rem 0.875rem' }}>
                                <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: '#5C4F42', maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                                  {session.book_analysis.slice(0, 400)}{session.book_analysis.length > 400 ? '…' : ''}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {recordingResult && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

          <div style={{ padding: '1.25rem', background: 'rgba(140,107,66,0.04)', border: '1px solid rgba(140,107,66,0.12)', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <div style={{ width: '2px', height: '0.875rem', background: 'linear-gradient(to bottom, #8C6B42, #C49456)', borderRadius: '9999px' }} />
              <h3 style={{ fontSize: '9px', fontWeight: 900, color: '#A07840', textTransform: 'uppercase', letterSpacing: '0.12em' }}>토론 요약</h3>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#7B6B55', fontWeight: 500 }}>{recordingResult.summary}</p>
          </div>

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
  );
}
