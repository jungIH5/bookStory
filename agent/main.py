from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

import db
from routers import books, clubs, community, users, sessions, recordings, tendency, recommendations


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 앱 시작 시: DB 연결 풀 + 테이블 초기화
    db.init_pool()
    yield
    # 앱 종료 시: 풀 정리


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
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
