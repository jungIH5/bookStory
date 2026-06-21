from fastapi import APIRouter, Depends, HTTPException
import db
from graphs.book_recommendation import recommendation_graph

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("/{user_id}")
async def get_recommendations(user_id: int, conn=Depends(db.get_db)):
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
