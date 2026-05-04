# CHANGELOG

## [현재] — 전체 리빌드 완료 + 성향 분석/추천 추가

---

### Phase 0 — 기반 정리

**버그 수정 및 환경 정리**

- `frontend/src/App.jsx`
  - `http://localhost:5001` 하드코딩 → `import.meta.env.VITE_API_URL` 환경변수로 교체 (Docker 환경 URL 버그 수정)
  - `fetchReadBooks`, `fetchClubs`, `handleRegisterUser`, `handleRegisterBook`, `handleCreateClub` 등 5곳에서 single quote → 백틱으로 수정 (URL 보간 미작동 버그)
  - `dangerouslySetInnerHTML` 제거, `stripHtml()` 유틸 함수로 대체 (Naver API HTML 태그 XSS 방지)
- `frontend/vite.config.js` — 로컬 개발용 프록시 추가 (`/api` → `localhost:5001`)
- `backend/.env.example` 신규 생성 (템플릿)
- `backend/.env` — `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `ANTHROPIC_API_KEY` 키 추가

---

### Phase 1 — 핵심 기능 MVP

**AI 모델 전환 (Gemini → Claude)**

- `/api/books/analyze` 엔드포인트를 Claude API로 교체
- 응답 구조 변경: `analysis` + `pages` + `questions.thematic` + `questions.perspective_shift`

**관점 전환 질문 (Perspective Shift)**

- 주제 기반 질문 3개 + 관점 전환 질문 2개를 단일 Claude 호출로 생성
- 관점 전환: 과학/물리학, 경제학, 역사적 맥락, 타 문화권, 저자 반대 논리 등 6가지 렌즈 중 선택

**커뮤니티 기능 구현**

- `posts`, `post_likes`, `comments` 테이블 추가
- `GET /api/community/posts` — 좋아요 수, 댓글 수, 내가 좋아요 눌렀는지 포함
- `POST /api/community/posts` — 글 작성
- `POST /api/community/posts/:id/like` — 좋아요 토글
- 프론트엔드: 글쓰기 모달, 하트 filled/unfilled 상태, 날짜 표시

**독서모임 참여 기능**

- `club_members` 테이블 추가
- `POST /api/clubs/:id/join`, `DELETE /api/clubs/:id/leave`, `GET /api/clubs/joined`
- 프론트엔드: 모임 상세 모달에 참여/탈퇴 토글 버튼

---

### Phase 2 — LangGraph 전환

**백엔드를 Node.js/Express → Python FastAPI + LangGraph으로 완전 교체**

디렉토리 신규 생성: `agent/`

```
agent/
├── main.py              # FastAPI 진입점, lifespan으로 DB 풀 초기화
├── state.py             # LangGraph State TypedDict 정의
├── db.py                # psycopg2 ThreadedConnectionPool + 테이블 초기화
├── routers/             # FastAPI 라우터
│   ├── books.py         # 책 검색, 분석, 서재 CRUD
│   ├── clubs.py         # 모임 CRUD + 참여/탈퇴
│   ├── community.py     # 커뮤니티 글/좋아요
│   └── users.py         # 유저 등록
├── graphs/
│   └── book_analysis.py # 책 분석 LangGraph 그래프
├── nodes/
│   ├── fetch_blog_reviews.py      # Naver Blog API 호출
│   ├── validate_reviews.py        # 리뷰 품질 판단 + 조건부 엣지 라우팅 함수
│   ├── analyze_and_questions.py   # Claude: 분석 + 주제 질문 생성
│   └── generate_shift_questions.py # Claude: 관점 전환 질문 생성
├── requirements.txt
└── Dockerfile
```

**책 분석 LangGraph 그래프 구조**

```
START
  → fetch_blog_reviews   (Naver Blog API, 재시도 시 키워드 변형)
  → validate_reviews     (리뷰 품질 판단)
      ├─ insufficient & retry_count < 2 → fetch_blog_reviews (재시도)
      └─ sufficient → analyze_and_questions
                          → generate_shift_questions
                              → END
```

핵심 개념: StateGraph, 조건부 엣지(add_conditional_edges), 노드(partial state dict 반환)

**docker-compose.yml**

- `backend` 서비스 → `agent` 서비스로 교체
- `env_file: ./backend/.env` 공유

---

### Phase 3 — 대화형 Q&A

**ConversationState 정의**

`state.py`에 `QATurn`, `ConversationState` TypedDict 추가

**대화형 Q&A LangGraph 그래프**

```
START
  → analyze_user_answer   (Claude: 답변에서 사용자 관점 추출)
  → generate_followup     (Claude: 관점 기반 개인화 후속 질문 생성)
  → END
```

**세션 API**

- `POST /api/sessions` — 토론 세션 생성, 첫 질문 저장
- `POST /api/sessions/:id/answer` — 답변 제출 → 그래프 실행 → 후속 질문 반환
- `GET /api/sessions/:id` — 세션 전체 Q&A 이력 조회

**DB 추가**: `reading_sessions`, `session_qa` 테이블

**프론트엔드**

- 분석 모달에 "토론 시작하기" 버튼 추가
- 채팅 형식의 Q&A 모달: AI 질문 버블 / 사용자 답변 버블 / 텍스트 입력창 / Enter 전송

---

### Phase 4 — 녹음 분석

**RecordingState 정의**

`state.py`에 `RecordingState` TypedDict 추가

**녹음 분석 LangGraph 그래프**

```
START
  → transcribe_audio          (OpenAI Whisper API: 음성 → 텍스트)
  → analyze_discussion        (Claude: 토론 요약 + 핵심 주제 추출)
  → generate_recording_questions (Claude: 다음 모임 후속 질문 4개 생성)
  → END
```

**녹음 API**

- `POST /api/recordings` — 오디오 파일 업로드 (multipart/form-data), Whisper 전사 후 Claude 분석, 결과 DB 저장
- `GET /api/recordings/:id` — 분석 결과 조회

**DB 추가**: `recordings`, `recording_analyses` 테이블

**프론트엔드**

- "녹음 분석" 탭 추가 (4번째 탭)
- 드래그앤드롭 + 클릭 파일 업로드 (MP3, MP4, WAV, OGG, WebM 지원)
- 분석 결과 화면: 전사 텍스트, 토론 요약, 핵심 주제 태그, 다음 모임 후속 질문

**의존성 추가**: `openai>=1.0.0`, `python-multipart>=0.0.9`

**환경변수 추가**: `OPENAI_API_KEY` (Whisper API 사용)

---

### Phase 4 추가 — 화자 분리 (Speaker Diarization)

**pyannote.audio 기반 화자 분리**

- `agent/nodes/diarize_speakers.py` — pyannote/speaker-diarization-3.1 모델로 화자 구간 추출
  - 싱글턴 패턴으로 모델 1회 로드 후 재사용 (`_pipeline` 모듈 전역)
  - `asyncio.to_thread()` 로 CPU-bound 작업을 스레드 풀에서 실행 (이벤트 루프 블로킹 방지)
- `agent/nodes/identify_user_speaker.py` — 등록된 목소리 샘플과 화자 임베딩 코사인 유사도 비교
  - pyannote/embedding 모델로 각 화자 클립 임베딩 추출 (`Inference` 클래스)
  - pydub으로 화자별 오디오 클립 추출 (~10초), scipy로 코사인 유사도 계산, 임계값 0.5
  - Whisper 세그먼트와 pyannote 세그먼트를 시간 overlap으로 정렬 → "나: ..." 레이블 전사 생성
- `RecordingState` 업데이트: `transcript_segments`, `diarized_segments`, `user_speaker_label`, `labeled_transcript`, `user_contributions` 필드 추가

**녹음 분석 그래프 5노드로 확장**

```
START
  → transcribe_audio          (Whisper verbose_json + timestamp_granularities)
  → diarize_speakers          (pyannote: 화자 구간 분리)
  → identify_user_speaker     (임베딩 코사인 유사도로 본인 화자 식별)
  → analyze_discussion        (화자 레이블 적용 전사 텍스트로 Claude 분석)
  → generate_recording_questions
  → END
```

**목소리 샘플 등록 API**

- `POST /api/users/{user_id}/voice-sample` — 오디오 파일 업로드, `uploads/voice_samples/user_{id}.{ext}`에 저장, DB 업데이트
- `users` 테이블에 `voice_sample VARCHAR(500)` 컬럼 추가

**Dockerfile 업데이트**

- `libsndfile1`, `ffmpeg` 시스템 패키지 추가
- torch/torchaudio CPU 전용 먼저 설치 (`--index-url https://download.pytorch.org/whl/cpu`, ~4GB 절감)

**의존성 추가**: `pyannote.audio>=3.1.0`, `scipy>=1.11.0`, `soundfile>=0.12.0`, `pydub>=0.25.0`

**환경변수 추가**: `HUGGINGFACE_TOKEN` (pyannote 모델 다운로드 — huggingface.co에서 약관 동의 필요)

**프론트엔드**

- 헤더 유저 프로필 옆 마이크 아이콘 버튼 → 클릭 시 오디오 파일 선택 → `POST /api/users/:id/voice-sample` 업로드
- 녹음 분석 결과 화면에 "화자별 전사 텍스트" (`labeled_transcript`) 우선 표시
- 화자 식별 성공 시 "내 발언" 섹션 (`user_contributions`) 별도 표시

---

### Phase 3 추가 — 독서 성향 분석 + 책 추천

**독서 성향 분석 LangGraph 그래프**

```
START
  → analyze_tendency  (Claude: Q&A 이력에서 독서 성향 패턴 추출)
  → END
```

- `GET /api/tendency/:user_id` — 사용자의 누적 Q&A 최대 50개를 분석해 성향 리포트 반환
- 리포트 구성: 성향 요약 / 자주 쓰는 관점 키워드 / 잘하는 영역 / 성장 가능 영역
- 프론트엔드: 책쌓기 탭 "내 독서 성향 분석" 버튼 → 모달 (그린/옐로 2열 카드)

**책 추천 LangGraph 그래프**

```
START
  → extract_preferences     (Claude: 읽은 책 목록에서 취향 요약 + 검색 키워드 추출)
  → search_book_candidates  (Naver Book API: 키워드 3개로 후보 최대 15권 수집, 읽은 책 제외)
  → rank_recommendations    (Claude: 취향과 후보 비교해 4권 선정 + 추천 이유)
  → END
```

- `GET /api/recommendations/:user_id` — 서재 기반 맞춤 도서 4권 추천
- 프론트엔드: 책쌓기 탭 "추천 도서 보기" 버튼 → 하단 인라인 섹션 (클릭 시 분석 모달 연동)

**state.py 추가**: `TendencyState`, `RecommendationState` TypedDict

---

## 현재 전체 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/api/books/search` | 책 검색 (Naver) |
| GET | `/api/books/analyze` | 책 분석 + 질문 생성 (LangGraph) |
| GET | `/api/books/read` | 서재 목록 |
| POST | `/api/books/read` | 서재에 책 추가 |
| GET | `/api/clubs` | 모임 목록 |
| POST | `/api/clubs` | 모임 개설 |
| GET | `/api/clubs/joined` | 내가 참여한 모임 목록 |
| POST | `/api/clubs/:id/join` | 모임 참여 |
| DELETE | `/api/clubs/:id/leave` | 모임 탈퇴 |
| GET | `/api/community/posts` | 커뮤니티 글 목록 |
| POST | `/api/community/posts` | 글 작성 |
| POST | `/api/community/posts/:id/like` | 좋아요 토글 |
| POST | `/api/users` | 유저 등록 |
| POST | `/api/sessions` | 토론 세션 생성 |
| POST | `/api/sessions/:id/answer` | 답변 제출 + 후속 질문 |
| GET | `/api/sessions/:id` | 세션 Q&A 이력 |
| POST | `/api/recordings` | 녹음 업로드 + 분석 |
| GET | `/api/recordings/:id` | 분석 결과 조회 |
| GET | `/api/tendency/:user_id` | 독서 성향 분석 |
| GET | `/api/recommendations/:user_id` | 맞춤 도서 추천 |

---

## 전체 DB 스키마 (현재)

```sql
users               -- 유저 (이름, 성별, 나이, 위치, 좌표)
read_books          -- 서재 (책 메타데이터 + 읽은 날짜)
clubs               -- 독서모임 (위치, 카테고리, 인원)
club_members        -- 모임 참여 (club_id, user_id)
posts               -- 커뮤니티 글
post_likes          -- 좋아요 (user_id, post_id)
comments            -- 댓글
reading_sessions    -- AI 토론 세션
session_qa          -- 세션 Q&A 이력 (질문, 답변, 순서)
recordings          -- 녹음 파일 메타 + 전사 텍스트
recording_analyses  -- 녹음 분석 결과 (요약, 주제, 후속 질문)
```
