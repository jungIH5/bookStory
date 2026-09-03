from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from dotenv import load_dotenv
from pathlib import Path
import logging
import os

load_dotenv()
load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

import db
from rate_limiter import limiter
from routers import books, clubs, community, users, sessions, tendency, recommendations, reading, oauth, friends, highlights, dive, admin
# recordings 라우터는 이미지 용량 절감을 위해 미탑재 상태 (torch/pyannote 의존성 제거).
# 코드는 agent/routers/recordings.py, agent/graphs/recording_analysis.py, agent/nodes/ 에 그대로 남아있음 —
# 다시 켜려면 requirements.txt에 pyannote.audio/scipy/soundfile/pydub 복원 + Dockerfile에 torch 설치 복원 후,
# 아래 import와 app.include_router(recordings.router)만 되살리면 됨.

_log = logging.getLogger("bookstory.startup")

_INSECURE_JWT_SECRET = "bookstory-default-secret-change-me!!"
_INSECURE_ADMIN_PASSWORD = "2345"


def _warn_insecure_defaults():
    # 로컬 개발 편의를 위해 기본값 자체는 계속 허용하되(설정 안 해도 앱이 죽지 않게),
    # 배포 시 반드시 바꿔야 함을 시작 로그에서 놓치기 어렵게 크게 경고한다.
    if os.getenv("JWT_SECRET", _INSECURE_JWT_SECRET) == _INSECURE_JWT_SECRET:
        _log.warning("⚠️  JWT_SECRET이 기본값(공개 저장소에 있는 값) 그대로입니다 — 배포 전 반드시 .env에서 변경하세요.")
    if os.getenv("ADMIN_ENTRY_PASSWORD", _INSECURE_ADMIN_PASSWORD) == _INSECURE_ADMIN_PASSWORD:
        _log.warning("⚠️  ADMIN_ENTRY_PASSWORD가 기본값(2345) 그대로입니다 — 배포 전 반드시 .env에서 변경하세요.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _warn_insecure_defaults()
    await db.init_pool()
    yield
    await db.close_pool()


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:8080,http://localhost:8081,http://localhost:19006,http://localhost:3000")
ALLOWED_ORIGINS = [s.strip() for s in _raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True,
)

app.include_router(books.router)
app.include_router(clubs.router)
app.include_router(community.router)
app.include_router(users.router)
app.include_router(sessions.router)
app.include_router(tendency.router)
app.include_router(recommendations.router)
app.include_router(reading.router)
app.include_router(oauth.router)
app.include_router(friends.router)
app.include_router(highlights.router)
app.include_router(dive.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
