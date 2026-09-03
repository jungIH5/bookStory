from fastapi import APIRouter, Depends, HTTPException, Request
import db
from auth import get_current_user_id
from graphs.book_recommendation import recommendation_graph
from rate_limiter import limiter

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("/{user_id}")
@limiter.limit("20/hour")
async def get_recommendations(
    request: Request,
    user_id: int,
    conn=Depends(db.get_db),
    caller_id: int = Depends(get_current_user_id),
):
    # 프론트에서 항상 본인 user_id로만 호출하는 "내 추천 도서" 기능 — 인증 없이 아무 user_id로나
    # 호출하면 매번 Claude를 호출하는 값비싼 엔드포인트라 남용될 수 있어 본인 확인을 추가한다.
    if caller_id != user_id:
        raise HTTPException(403, "본인 계정의 추천만 조회할 수 있습니다.")
    row = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_id)
    if not row:
        raise HTTPException(404, "User not found")

    rows = await conn.fetch(
        "SELECT title, author FROM read_books WHERE user_id = $1 ORDER BY read_at DESC LIMIT 30",
        user_id,
    )
    read_books = [dict(r) for r in rows]

    if not read_books:
        return {"recommendations": [], "message": "서재에 책을 먼저 추가해주세요."}

    result = await recommendation_graph.ainvoke({
        "user_id": user_id,
        "read_books": read_books,
        "preference_text": "",
        "search_keywords": [],
        "candidates": [],
        "recommendations": [],
    })

    return {"recommendations": result["recommendations"]}
