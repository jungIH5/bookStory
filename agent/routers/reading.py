from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from db import get_db
from auth import get_current_user_id

router = APIRouter(prefix="/api/reading")


class ReadingLogIn(BaseModel):
    read_book_id: int
    duration_seconds: int
    started_reading_at: Optional[str] = None  # ISO date string "YYYY-MM-DD"


@router.post("/log")
async def save_reading_log(
    body: ReadingLogIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # 같은 책을 이어서 읽으면 새 행을 쌓지 않고 기존 누적 기록에 더한다
    row = await conn.fetchrow(
        """INSERT INTO reading_logs
               (user_id, read_book_id, duration_seconds, started_reading_at)
           VALUES ($1,$2,$3,$4::date)
           ON CONFLICT (user_id, read_book_id) DO UPDATE
           SET duration_seconds = reading_logs.duration_seconds + EXCLUDED.duration_seconds,
               started_reading_at = COALESCE(reading_logs.started_reading_at, EXCLUDED.started_reading_at)
           RETURNING id, user_id, read_book_id, duration_seconds, started_reading_at, logged_at""",
        user_id, body.read_book_id, body.duration_seconds, body.started_reading_at,
    )
    return dict(row)


@router.get("/stats/{user_id}")
async def get_user_stats(user_id: int, conn=Depends(get_db)):
    row = await conn.fetchrow("""
        SELECT
            COUNT(DISTINCT rb.id)::int AS books_count,
            COALESCE(SUM(rl.duration_seconds), 0)::int AS total_seconds
        FROM users u
        LEFT JOIN read_books rb ON rb.user_id = u.id AND rb.status = 'finished'
        LEFT JOIN reading_logs rl ON rl.user_id = u.id
        WHERE u.id = $1
    """, user_id)
    return dict(row) if row else {"books_count": 0, "total_seconds": 0}


@router.get("/book-readers")
async def get_book_readers(isbn: str = "", title: str = "", conn=Depends(get_db)):
    """특정 책을 읽은 다른 유저들의 목록(이름/프로필/누적 시간). stats_public인 유저만 노출."""
    if isbn:
        rows = await conn.fetch("""
            SELECT u.id AS user_id, u.name, u.profile_image, rl.duration_seconds AS seconds
            FROM reading_logs rl
            JOIN read_books rb ON rb.id = rl.read_book_id
            JOIN users u ON u.id = rl.user_id
            WHERE u.stats_public = TRUE AND rb.isbn = $1
            ORDER BY rl.duration_seconds DESC
            LIMIT 50
        """, isbn)
    elif title:
        rows = await conn.fetch("""
            SELECT u.id AS user_id, u.name, u.profile_image, rl.duration_seconds AS seconds
            FROM reading_logs rl
            JOIN read_books rb ON rb.id = rl.read_book_id
            JOIN users u ON u.id = rl.user_id
            WHERE u.stats_public = TRUE AND rb.title = $1
            ORDER BY rl.duration_seconds DESC
            LIMIT 50
        """, title)
    else:
        return []
    return [dict(r) for r in rows]


@router.get("/leaderboard")
async def get_leaderboard(conn=Depends(get_db)):
    rows = await conn.fetch("""
        WITH stats AS (
            SELECT
                u.id,
                u.name,
                COUNT(DISTINCT rb.id)::int AS books_count,
                COALESCE(SUM(rl.duration_seconds), 0)::int AS total_seconds
            FROM users u
            LEFT JOIN read_books rb ON rb.user_id = u.id AND rb.status = 'finished'
            LEFT JOIN reading_logs rl ON rl.user_id = u.id
            WHERE u.stats_public = TRUE
            GROUP BY u.id, u.name
        )
        SELECT *, ROW_NUMBER() OVER (ORDER BY books_count DESC, total_seconds DESC)::int AS rank
        FROM stats
        WHERE books_count > 0 OR total_seconds > 0
        ORDER BY books_count DESC, total_seconds DESC
        LIMIT 50
    """)
    return [dict(r) for r in rows]
