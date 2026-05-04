# bookStory

독서모임 참가자를 위한 AI 토론 질문 생성 플랫폼

---

## 왜 만들었나

독서모임에서 사람들은 책을 읽고 나서도 "어떤 질문을 해야 할지" 막막해하는 경우가 많다.
좋은 토론은 좋은 질문에서 시작된다. 하지만 책이 가진 철학적 포인트, 시대적 맥락, 저자의 의도를 스스로 뽑아내는 건 쉽지 않다.

bookStory는 네 가지 방식으로 이 문제를 해결한다.

1. **책의 핵심 주제 기반 토론 질문 생성**
   - 책의 주제, 철학, 맥락에서 자연스럽게 나오는 질문 3개
   - 독자 자신의 경험을 연결하는 질문 포함

2. **관점 전환 질문 (Perspective Shift)**
   - 익숙한 독서 패턴 밖에서 책을 바라보도록 유도
   - 과학적, 경제학적, 역사적, 반대 논리 등의 렌즈 적용

3. **대화형 AI 토론**
   - 질문에 답변하면 답변 속 관점을 분석해 다음 질문을 개인화
   - LangGraph 기반 2-노드 파이프라인 (관점 추출 → 후속 질문 생성)

4. **독서모임 녹음 분석**
   - 모임 녹음 파일을 업로드하면 Whisper로 전사
   - Claude가 토론 요약, 핵심 주제 추출, 다음 모임 후속 질문 생성

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 책 검색 | 네이버 책 API 기반 검색, HTML 태그 제거 |
| 책 분석 | LangGraph로 블로그 서평 수집 → 품질 검증 → Claude 분석 |
| 토론 질문 생성 | 주제 기반 3개 + 관점 전환 2개 |
| 대화형 Q&A | 답변 기반 개인화 후속 질문, 채팅 UI |
| 내 서재 (책쌓기) | 읽은 책 기록, 시각적 책탑 + 리스트 뷰 |
| 독서모임 찾기/개설 | 위치 기반 모임 탐색, Kakao Maps 연동 |
| 커뮤니티 | 독서 관련 글 작성, 좋아요, 댓글 |
| 녹음 분석 | 오디오 업로드 → Whisper 전사 → Claude 분석 → 후속 질문 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18, Vite, Framer Motion, Lucide React |
| Backend | Python 3.11, FastAPI, LangGraph |
| AI | Claude API (Anthropic), OpenAI Whisper API |
| Database | Supabase (PostgreSQL), psycopg2 |
| 외부 API | Naver 책/블로그 검색, Kakao Maps |
| 인프라 | Docker, docker-compose |

---

## LangGraph 그래프 구조

### 책 분석 그래프

```
START
  → fetch_blog_reviews   (Naver Blog API, 재시도 시 키워드 변형)
  → validate_reviews     (리뷰 품질 판단 — 조건부 엣지)
      ├─ 부족 & retry < 2 → fetch_blog_reviews (재시도)
      └─ 충분 → analyze_and_questions (Claude)
                    → generate_shift_questions (Claude)
                        → END
```

### 대화형 Q&A 그래프 (한 턴)

```
START
  → analyze_user_answer  (Claude: 답변에서 사용자 관점 추출)
  → generate_followup    (Claude: 관점 기반 개인화 후속 질문)
  → END
```

### 녹음 분석 그래프

```
START
  → transcribe_audio             (OpenAI Whisper: 음성 → 텍스트)
  → analyze_discussion           (Claude: 토론 요약 + 핵심 주제)
  → generate_recording_questions (Claude: 다음 모임 후속 질문 4개)
  → END
```

---

## 빠른 시작

```bash
# 환경변수 설정
cp backend/.env.example backend/.env
# .env에 키 값 입력 후 저장

# Docker로 실행
docker-compose up --build
```

| | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:5001 |
| API 문서 (Swagger) | http://localhost:5001/docs |

---

## 환경변수

`backend/.env`

```
DATABASE_URL=           # Supabase PostgreSQL 연결 문자열
ANTHROPIC_API_KEY=      # Claude API 키 (필수)
NAVER_CLIENT_ID=        # 네이버 개발자센터 Client ID (필수)
NAVER_CLIENT_SECRET=    # 네이버 개발자센터 Client Secret (필수)
OPENAI_API_KEY=         # OpenAI API 키 (녹음 분석 기능에 필요)
PORT=5001
```

---

## 프로젝트 구조

```
bookStory/
├── frontend/              # React + Vite
│   └── src/App.jsx        # 단일 페이지 앱
├── agent/                 # Python FastAPI + LangGraph
│   ├── main.py
│   ├── state.py           # LangGraph State 정의
│   ├── db.py              # DB 연결 풀
│   ├── routers/           # API 라우터 (books, clubs, community, users, sessions, recordings)
│   ├── graphs/            # LangGraph 그래프 (book_analysis, conversation, recording_analysis)
│   ├── nodes/             # LangGraph 노드 함수
│   ├── requirements.txt
│   └── Dockerfile
├── backend/               # 레거시 Node.js (참고용 보존)
├── docker-compose.yml
├── CHANGELOG.md
└── DEVELOPMENT_PLAN.md
```
