from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
import db
from graphs.tendency_analysis import tendency_graph

router = APIRouter(prefix="/api/tendency", tags=["tendency"])


@router.get("/{user_id}")
async def get_tendency(user_id: int, conn=Depends(db.get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")

        cur.execute(
            """
            SELECT rs.book_title, rs.book_author, sq.question, sq.answer
            FROM session_qa sq
            JOIN reading_sessions rs ON sq.session_id = rs.id
            WHERE rs.user_id = %s AND sq.answer IS NOT NULL
            ORDER BY sq.created_at DESC
            LIMIT 50
            """,
            (user_id,),
        )
        rows = cur.fetchall()

    qa_history = [dict(r) for r in rows]

    result = await tendency_graph.ainvoke(
        {
            "user_id": user_id,
            "qa_history": qa_history,
            "tendency_summary": "",
            "reading_lenses": [],
            "strong_areas": [],
            "growth_areas": [],
        }
    )

    return {
        "qa_count": len(qa_history),
        "tendency_summary": result["tendency_summary"],
        "reading_lenses": result["reading_lenses"],
        "strong_areas": result["strong_areas"],
        "growth_areas": result["growth_areas"],
    }
