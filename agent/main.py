from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
import os

load_dotenv()

import db
from routers import books, clubs, community, users, sessions, recordings, tendency, recommendations

# ─── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/15minutes"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_pool()
    yield


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS whitelist ────────────────────────────────────────────────────────────
_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:8081,http://localhost:19006,http://localhost:3000")
ALLOWED_ORIGINS = [s.strip() for s in _raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True,
)

app.include_router(books.router)
app.include_router(clubs.router)
app.include_router(community.router)
app.include_router(users.router)
app.include_router(sessions.router)
app.include_router(recordings.router)
app.include_router(tendency.router)
app.include_router(recommendations.router)


@app.get("/health")
def health():
    return {"status": "ok"}
