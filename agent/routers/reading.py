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
    row = await conn.fetchrow(
        """INSERT INTO reading_logs
               (user_id, read_book_id, duration_seconds, started_reading_at)
           VALUES ($1,$2,$3,$4::date)
           RETURNING id, user_id, read_book_id, duration_seconds, started_reading_at, logged_at""",
        user_id, body.read_book_id, body.duration_seconds, body.started_reading_at,
    )
    return dict(row)


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
