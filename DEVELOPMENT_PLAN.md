# bookStory 개발 계획

---

## Phase 0 — 기반 정리

현재 동작하지 않는 부분을 먼저 잡는다.

### 수정 목록

**[backend/index.js]**
- `GEMINI_API_KEY` → `ANTHROPIC_API_KEY` 로 전환
- 280번째 줄 중복 `/api/clubs` GET 라우트 제거
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` `.env` 항목 추가

**[backend/.env.example 신규 생성]**
```
DATABASE_URL=
ANTHROPIC_API_KEY=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
PORT=5001
```

**[frontend/src/App.jsx]**
- 전체 `http://localhost:5001` → `import.meta.env.VITE_API_URL` 로 교체
- `dangerouslySetInnerHTML` 제거, HTML 태그 strip 유틸 함수로 대체

**[frontend/vite.config.js]**
- dev server proxy 추가 (`/api` → `localhost:5001`)

---

## Phase 1 — 핵심 기능 MVP

### 1-1. AI 모델 전환 (Gemini → Claude)

`/api/books/analyze` 엔드포인트를 Claude API로 교체.

```
[기존 플로우]
책 제목/저자 → Naver 블로그 검색 → Gemini 프롬프트 → 분석 텍스트 + 페이지수

[변경 플로우]
책 제목/저자 → Naver 블로그 검색 → Claude 프롬프트 → 분석 + 질문 세트
```

응답 구조 변경:
```json
{
  "analysis": "책의 핵심 분석 텍스트",
  "pages": 320,
  "questions": {
    "thematic": [
      "책 주제에서 나온 질문 1",
      "책 주제에서 나온 질문 2",
      "독자 경험을 연결하는 질문"
    ],
    "perspective_shift": [
      "완전히 다른 관점의 질문 1",
      "완전히 다른 관점의 질문 2"
    ]
  }
}
```

### 1-2. 관점 전환 질문 (Perspective Shift)

Claude에게 두 가지 질문 세트를 생성하도록 프롬프트를 구성한다.

**주제 기반 질문 (Thematic Questions)**
- 책의 핵심 개념, 철학, 저자의 메시지를 중심으로
- 독자 자신의 삶과 연결하는 질문 포함

**관점 전환 질문 (Perspective Shift Questions)**
- 책이 다루는 시대/장르/관점과 완전히 다른 렌즈를 적용
- 적용 가능한 렌즈 예시:
  - 과학/물리학적 시각
  - 경제학/행동경제학적 시각
  - 역사적 맥락 전환 (이 책이 다른 시대였다면?)
  - 타 문화권 시각
  - 반대 주장 (저자와 정반대 입장)
  - 실용주의적 시각 (이게 실제 삶에 적용된다면?)

Claude 프롬프트 구조:
```
책: {제목} ({저자})
블로그 서평 자료: {reviews}

[질문 1 - 주제 기반]
이 책의 핵심 시사 포인트와 철학적 논점을 바탕으로,
독서모임에서 깊은 토론을 이끌 수 있는 질문 3개를 생성해줘.
마지막 질문은 독자 자신의 경험과 연결되어야 해.

[질문 2 - 관점 전환]
이 책의 익숙한 해석 프레임에서 완전히 벗어나서,
전혀 예상치 못한 시각(과학, 경제, 역사, 반대 논리 등)으로
접근하는 질문 2개를 생성해줘.
각 질문 앞에 어떤 관점인지 한 줄로 명시해줘.
```

### 1-3. 프론트엔드 - 질문 UI

책 분석 모달에 질문 섹션 추가:

```
[분석 모달 구조]
├── 책 기본 정보 (표지, 제목, 저자)
├── AI 분석 텍스트 (핵심 의미)
├── 토론 질문 섹션
│   ├── 주제 기반 질문 (리스트)
│   └── 관점 전환 질문 (다른 색상으로 구분, 관점 레이블 표시)
└── [내 서재에 기록하기] 버튼
```

### 1-4. 커뮤니티 구현

**DB 스키마 추가:**
```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  book_title VARCHAR(300),
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id),
  user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_likes (
  user_id INTEGER REFERENCES users(id),
  post_id INTEGER REFERENCES posts(id),
  PRIMARY KEY (user_id, post_id)
);
```

**추가 API 엔드포인트:**
```
POST   /api/community/posts          글 작성
GET    /api/community/posts/:id      글 상세
POST   /api/community/posts/:id/like 좋아요 토글
POST   /api/community/posts/:id/comments  댓글 작성
```

### 1-5. 모임 참여 기능

**DB 스키마 추가:**
```sql
CREATE TABLE club_members (
  id SERIAL PRIMARY KEY,
  club_id INTEGER REFERENCES clubs(id),
  user_id INTEGER REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(club_id, user_id)
);
```

**추가 API 엔드포인트:**
```
POST   /api/clubs/:id/join    참여 신청
DELETE /api/clubs/:id/leave   탈퇴
GET    /api/clubs/:id/members 멤버 목록
```

---

## Phase 2 — LangGraph 전환

백엔드를 Python FastAPI + LangGraph로 전환한다. Node.js 백엔드는 이 단계에서 대체된다.

### 디렉토리 구조

```
bookStory/
├── frontend/              # 변경 없음 (React)
├── backend/               # Node.js → 레거시, 이후 제거
├── agent/                 # 신규: Python FastAPI + LangGraph
│   ├── main.py            # FastAPI 앱 진입점
│   ├── routers/
│   │   ├── books.py       # /api/books/* 라우터
│   │   ├── clubs.py       # /api/clubs/* 라우터
│   │   └── community.py   # /api/community/* 라우터
│   ├── graphs/
│   │   ├── book_analysis.py      # 책 분석 그래프
│   │   ├── question_gen.py       # 질문 생성 그래프
│   │   └── conversation.py       # 대화형 Q&A 그래프 (Phase 3)
│   ├── nodes/             # LangGraph 노드 함수들
│   │   ├── fetch_book_info.py
│   │   ├── fetch_blog_reviews.py
│   │   ├── validate_reviews.py
│   │   ├── analyze_themes.py
│   │   ├── generate_questions.py
│   │   └── generate_shift_questions.py
│   ├── state.py           # LangGraph State 타입 정의
│   ├── db.py              # DB 연결 (asyncpg + Supabase)
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml     # agent 서비스 추가
└── README.md
```

### 책 분석 그래프 (book_analysis.py)

```python
# State 구조
class BookAnalysisState(TypedDict):
    title: str
    author: str
    book_info: dict          # Naver Book API 결과
    blog_reviews: list[str]  # Naver Blog API 결과
    review_quality: str      # "sufficient" | "insufficient"
    retry_count: int
    themes: list[str]        # 추출된 핵심 주제
    analysis: str            # 분석 텍스트
    thematic_questions: list[str]
    shift_questions: list[dict]  # {"perspective": "...", "question": "..."}
    pages: int

# 그래프 구조
START
  → fetch_book_info_node      # Naver Book API
  → fetch_blog_reviews_node   # Naver Blog API
  → validate_reviews_node     # 리뷰 충분한지 판단
      ↓ insufficient (retry_count < 2)
      → fetch_blog_reviews_node  # 재검색 (키워드 변형)
      ↓ sufficient
  → analyze_themes_node       # Claude: 핵심 주제 추출
  → generate_questions_node   # Claude: 주제 기반 질문 생성
  → generate_shift_node       # Claude: 관점 전환 질문 생성
END
```

**조건부 엣지 (핵심 LangGraph 개념):**
```python
def should_retry_reviews(state: BookAnalysisState) -> str:
    if state["review_quality"] == "insufficient" and state["retry_count"] < 2:
        return "retry"
    return "proceed"

graph.add_conditional_edges(
    "validate_reviews_node",
    should_retry_reviews,
    {"retry": "fetch_blog_reviews_node", "proceed": "analyze_themes_node"}
)
```

### 대화형 Q&A 그래프 (conversation.py) — Phase 3 예정

```python
class ConversationState(TypedDict):
    book_title: str
    questions_asked: list[str]
    user_answers: list[str]
    user_perspective_profile: dict  # 누적된 관점 패턴
    next_question: str
    turn_count: int
    should_end: bool

# 그래프 구조
START
  → present_question_node     # 질문 제시
  → collect_answer_node       # 유저 답변 수신
  → analyze_answer_node       # 답변에서 관점/경험 추출
  → update_profile_node       # 유저 프로필 업데이트
  → decide_continue_node      # 계속할지 종료할지 판단
      ↓ continue
      → generate_next_question_node  # 이전 답변 기반 다음 질문
      → present_question_node
      ↓ end
END
```

### docker-compose.yml 변경

```yaml
services:
  frontend:
    # 변경 없음

  agent:                     # backend → agent로 교체
    build:
      context: ./agent
    ports:
      - "5001:5001"
    volumes:
      - ./agent:/app
    env_file:
      - ./agent/.env
```

---

## Phase 3 — 개인화 + 모임 기능

### 독서 성향 분석

유저가 Q&A를 통해 쌓은 답변 데이터를 주기적으로 분석한다.

```
누적 답변 데이터
  ↓
[성향 분석 노드]   ← Claude: 답변 패턴에서 독서 성향 추출
  ↓
성향 리포트 생성
  - 주로 어떤 렌즈로 책을 읽는지
  - 자주 연결하는 주제 영역
  - 관점 전환이 잘 되는 영역 vs 어려운 영역
```

### 책 추천 그래프

```
START
  → analyze_reading_history_node   # 읽은 책 목록 분석
  → extract_preference_node        # 취향/패턴 추출
  → search_books_node              # Naver Book API
  → rank_recommendations_node      # Claude: 관련성 랭킹
END
```

---

## Phase 4 — 녹음 분석

### 기술 구성

| 기능 | 라이브러리/API |
|------|---------------|
| STT (음성→텍스트) | OpenAI Whisper API 또는 Naver Clova Speech |
| 화자 분리 | pyannote.audio (오픈소스) |
| 대화 분석 | LangGraph + Claude |

### 화자 분리 전략

1. 유저가 앱에서 본인 목소리 샘플 10초 내외로 등록
2. 모임 녹음 시 화자 분리 수행
3. 등록된 샘플과 가장 가까운 화자 = 본인으로 식별
4. 본인 발화 + 전체 대화 내용을 함께 분석

### 녹음 분석 그래프

```
START
  → transcribe_audio_node        # Whisper: 전체 텍스트 변환
  → diarize_speakers_node        # pyannote: 화자 분리
  → identify_user_node           # 등록 샘플과 매칭
  → extract_user_speech_node     # 유저 발화만 추출
  → analyze_conversation_node    # Claude: 전체 대화 흐름 분석
  → generate_followup_node       # 다음 독서를 위한 질문 생성
END
```

---

## DB 전체 스키마 (최종)

```sql
-- 유저
users (id, name, gender, age, location, lat, lng, voice_sample, created_at)

-- 책 서재
read_books (id, user_id, title, author, image, publisher, isbn, pages, read_at)

-- 독서 Q&A 기록
reading_sessions (id, user_id, book_id, created_at)
session_qa (id, session_id, question, answer, question_type, turn_order)

-- 독서모임
clubs (id, name, description, category, location, lat, lng, member_count, image, created_at)
club_members (id, club_id, user_id, joined_at)

-- 커뮤니티
posts (id, user_id, title, content, book_title, likes, created_at)
comments (id, post_id, user_id, content, created_at)
post_likes (user_id, post_id)

-- 녹음 기록 (Phase 4)
recordings (id, user_id, club_id, duration, transcript, created_at)
recording_analyses (id, recording_id, summary, followup_questions, created_at)
```

---

## 진행 상태

- [x] Phase 0 — 기반 정리
- [x] Phase 1 — MVP (Claude 전환 + 질문 생성 + 커뮤니티)
- [x] Phase 2 — LangGraph 전환
- [x] Phase 3 — 대화형 Q&A (ConversationState, sessions 라우터, Q&A 모달)
- [x] Phase 4 — 녹음 분석 MVP (Whisper STT + Claude 분석 + 후속 질문)

## 미구현 (추후 계획)

- [x] Phase 3 독서 성향 분석 — Q&A 누적 데이터로 독자 성향 리포트 (LangGraph 그래프)
- [x] Phase 3 책 추천 그래프 — 읽은 책 이력 기반 Claude 추천
- [x] Phase 4 화자 분리 — pyannote.audio 화자 분리 + 본인 목소리 샘플 등록
