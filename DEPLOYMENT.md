# 배포 가이드

추천 스택: **Supabase(DB) + Render(백엔드, Docker) + Vercel(프론트엔드)**

- DB를 Supabase로 고른 이유: `agent/.env.example`의 `DATABASE_URL` 주석에 이미 Supabase 연결 방식이 준비돼 있었음. 관리형 Postgres라 백업/대시보드가 기본 제공됨.
- 백엔드를 Render로 고른 이유: 독서모임 실시간 채팅이 WebSocket을 쓰는데, Vercel 같은 서버리스 플랫폼은 지속 연결(WebSocket)을 지원하지 않음. Render는 Dockerfile을 그대로 써서 배포할 수 있고 WebSocket도 지원함.
- 프론트엔드를 Vercel로 고른 이유: Vite SPA를 zero-config로 배포하기에 가장 빠르고 무료 티어가 넉넉함. React Router 등 클라이언트 라우팅을 안 쓰는 구조라 별도 `vercel.json` 리라이트 설정도 필요 없음.

---

## 0. 배포 전 준비된 것 (이번에 코드에 반영됨)

- `agent/Dockerfile`: `--reload`(개발 전용) 제거, non-root 사용자로 실행, `$PORT` 환경변수 지원(Render가 배포 시 포트를 주입함). 로컬 `docker-compose.yml`은 `UVICORN_EXTRA_ARGS=--reload`와 `user: root`로 기존 개발 흐름을 그대로 유지하도록 오버라이드해둠 — 로컬 개발 방식은 안 바뀜.
- `render.yaml`: Render Blueprint로 백엔드 서비스를 한 번에 만들 수 있는 설정 파일(레포 루트).
- 보안 취약점(계정 탈취, 인증 없는 LLM 호출, rate limiting 미작동) 전부 수정 완료 — 배포해도 안전한 상태.

## 1. Supabase — DB

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성 (무료 티어로 시작 가능)
2. Project Settings → Database → Connection string (URI 형식) 복사
   - `postgres://postgres.[project-ref]:[password]@...supabase.co:5432/postgres` 형태
3. 이 값을 나중에 Render의 `DATABASE_URL`에 붙여넣을 것 (지금은 메모만)
4. 별도 스키마 마이그레이션 불필요 — `agent/db.py`의 `_init_db()`가 앱 최초 기동 시 필요한 테이블을 전부 자동 생성함

## 2. Render — 백엔드

1. [render.com](https://render.com) 가입 → GitHub 계정 연결 → 이 저장소 연결
2. New → Blueprint 선택 → 이 레포의 `render.yaml`을 인식시키면 `bookstory-agent` 서비스가 자동으로 구성됨
   - (Blueprint를 안 쓰고 싶으면 New → Web Service → Docker 런타임으로 수동 생성도 가능, Dockerfile 경로는 `agent/Dockerfile`)
3. 아래 환경변수를 Render 대시보드에서 채워넣기 (render.yaml에 `sync: false`로 표시된 것들 — 값 없이는 배포는 되지만 해당 기능이 꺼진 채로 동작함):
   - `DATABASE_URL` — 1번에서 복사한 Supabase 연결 문자열
   - `ADMIN_ENTRY_PASSWORD` — 강력한 값으로 변경 (기본값 `2345` 절대 그대로 쓰지 말 것)
   - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
   - `KAKAO_REST_API_KEY` (책 검색), `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET` (블로그 서평 수집)
   - 소셜 로그인 쓸 provider만: `KAKAO_CLIENT_ID`, `NAVER_OAUTH_CLIENT_ID`/`SECRET`, `GOOGLE_CLIENT_ID`/`SECRET`
   - `FRONTEND_URL` — 3번에서 나올 Vercel 도메인 (예: `https://bookstory.vercel.app`)
   - `ALLOWED_ORIGINS` — 마찬가지로 Vercel 도메인 (여러 개면 쉼표로 구분)
   - `JWT_SECRET`은 `generateValue: true`라 Render가 자동으로 안전한 값을 생성함 — 손댈 필요 없음
4. 배포 완료 후 `https://bookstory-agent.onrender.com/health` 같은 URL에서 `{"status":"ok"}` 확인

무료 플랜은 15분 미사용 시 슬립 → 첫 요청이 느릴 수 있음(콜드 스타트). 신경 쓰이면 유료 플랜으로 올리거나 외부에서 주기적으로 핑을 보내는 방법이 있음.

## 3. Vercel — 프론트엔드

1. [vercel.com](https://vercel.com) 가입 → GitHub 저장소 연결 → New Project
2. Root Directory를 `frontend`로 지정 (Vite 프레임워크 자동 감지됨, 빌드 커맨드/출력 폴더 기본값 그대로 두면 됨)
3. Environment Variables에 추가:
   - `VITE_API_URL` = 2번에서 나온 Render 백엔드 URL (예: `https://bookstory-agent.onrender.com`)
4. Deploy. 완료되면 나온 도메인(`https://xxx.vercel.app`)을 다시 Render의 `ALLOWED_ORIGINS`/`FRONTEND_URL`에 반영 (2번 값 업데이트 후 재배포)

## 4. 외부 서비스 설정 — 배포 도메인 등록

실제 도메인이 생겼으니 아래 외부 콘솔에도 반영해야 기능이 정상 동작함:

- **카카오 개발자 콘솔**: 앱 설정 → 플랫폼 → Web에 Vercel 도메인 등록 (책 검색 API 자체는 서버 간 호출이라 무관하지만, 카카오 지도 JS SDK와 소셜 로그인은 도메인 등록이 필요함)
- **네이버/구글 OAuth 콘솔**: Redirect URI를 배포 도메인 기준으로 추가 (`https://<vercel-domain>` 등 각 provider 콜백 페이지 경로에 맞춰)
- `frontend/index.html`에 하드코딩된 카카오 지도 JS 키는 그대로 둬도 되지만(공개용 키), 콘솔에서 도메인 화이트리스트 등록은 별도로 필요

## 5. 배포 후 확인 체크리스트

- [ ] `/health` 200 OK
- [ ] 회원가입/로그인 정상 동작
- [ ] 소셜 로그인 리다이렉트 정상 동작
- [ ] 책 검색(카카오) 정상 동작
- [ ] 독서모임 실시간 채팅(WebSocket) 정상 연결
- [ ] `ADMIN_ENTRY_PASSWORD`가 기본값이 아닌지 재확인 — Render 로그에 시작 시 경고가 안 뜨는지 확인
- [ ] `ALLOWED_ORIGINS`에 실제 배포 도메인만 들어있는지(로컬호스트 기본값이 프로덕션에 남아있지 않은지) 확인

## 알아두면 좋은 것

- `agent/db.py`의 `_init_db()`는 앱이 뜰 때마다 `CREATE TABLE IF NOT EXISTS`류의 멱등성 있는 DDL을 실행함 — 재배포마다 매번 도는 구조라 테이블 수가 아주 많아지면 부팅이 느려질 수 있음(지금 규모에선 문제 없음). 나중에 신경 쓰이면 스키마 버전 체크로 스킵하도록 개선 가능.
- 지금은 `frontend/Dockerfile`(로컬 개발용, `npm run dev` 그대로 실행)을 프로덕션 배포에 쓰지 않음 — Vercel이 자체적으로 `vite build`를 돌리기 때문. 나중에 Vercel 대신 다른 방식(예: 자체 서버에 정적 파일로 서빙)을 쓰게 되면 이 Dockerfile도 프로덕션용으로 별도 정리가 필요함.
