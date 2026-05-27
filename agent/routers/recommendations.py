from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
import db
from graphs.book_recommendation import recommendation_graph

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("/{user_id}")
async def get_recommendations(user_id: int, conn=Depends(db.get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")

        cur.execute(
            "SELECT title, author FROM read_books WHERE user_id = %s ORDER BY read_at DESC LIMIT 30",
            (user_id,),
        )
        rows = cur.fetchall()

    read_books = [dict(r) for r in rows]
    if not read_books:
        return {"recommendations": [], "message": "서재에 책을 먼저 추가해주세요."}

    result = await recommendation_graph.ainvoke(
        {
            "user_id": user_id,
            "read_books": read_books,
            "preference_text": "",
            "search_keywords": [],
            "candidates": [],
            "recommendations": [],
        }
    )

    return {"recommendations": result["recommendations"]}
