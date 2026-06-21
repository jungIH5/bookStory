from fastapi import APIRouter, Depends, HTTPException
import db
from graphs.tendency_analysis import tendency_graph

router = APIRouter(prefix="/api/tendency", tags=["tendency"])


@router.get("/{user_id}")
async def get_tendency(user_id: int, conn=Depends(db.get_db)):
    row = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_id)
    if not row:
        raise HTTPException(404, "User not found")

    rows = await conn.fetch(
        """
        SELECT rs.book_title, rs.book_author, sq.question, sq.answer
        FROM session_qa sq
        JOIN reading_sessions rs ON sq.session_id = rs.id
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
