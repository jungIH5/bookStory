from fastapi import APIRouter, Depends, HTTPException, Request
import db
from auth import get_current_user_id
from graphs.tendency_analysis import tendency_graph
from rate_limiter import limiter

router = APIRouter(prefix="/api/tendency", tags=["tendency"])


@router.get("/{user_id}")
@limiter.limit("20/hour")
async def get_tendency(
    request: Request,
    user_id: int,
    conn=Depends(db.get_db),
    caller_id: int = Depends(get_current_user_id),
):
    # get_recommendations와 동일한 이유로 본인 확인 추가 — 인증 없는 Claude 호출 엔드포인트 방지.
    if caller_id != user_id:
        raise HTTPException(403, "본인 계정의 성향 분석만 조회할 수 있습니다.")
    row = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_id)
    if not row:
        raise HTTPException(404, "User not found")

    rows = await conn.fetch(
        """
        SELECT COALESCE(rb.title, rs.book_title) AS book_title,
               COALESCE(rb.author, '')            AS book_author,
               sq.question, sq.answer
        FROM session_qa sq
        JOIN reading_sessions rs ON sq.session_id = rs.id
        LEFT JOIN read_books rb ON rs.read_book_id = rb.id
        WHERE rs.user_id = $1 AND sq.answer IS NOT NULL
        ORDER BY sq.created_at DESC
        LIMIT 50
        """,
        user_id,
    )
    qa_history = [dict(r) for r in rows]

    result = await tendency_graph.ainvoke({
        "user_id": user_id,
        "qa_history": qa_history,
        "tendency_summary": "",
        "reading_lenses": [],
        "strong_areas": [],
        "growth_areas": [],
    })

    return {
        "qa_count": len(qa_history),
        "tendency_summary": result["tendency_summary"],
        "reading_lenses": result["reading_lenses"],
        "strong_areas": result["strong_areas"],
        "growth_areas": result["growth_areas"],
    }
