from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor
import db
from graphs.conversation import conversation_graph

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SessionCreate(BaseModel):
    user_id: int | None = None
    book_title: str
    book_author: str
    book_analysis: str
    first_question: str


class AnswerSubmit(BaseModel):
    answer: str
    user_id: int | None = None


@router.post("")
async def create_session(body: SessionCreate, conn=Depends(db.get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO reading_sessions (user_id, book_title, book_author, book_analysis)
            VALUES (%s, %s, %s, %s) RETURNING id
            """,
            (body.user_id, body.book_title, body.book_author, body.book_analysis),
        )
        session_id = cur.fetchone()["id"]

        cur.execute(
            """
            INSERT INTO session_qa (session_id, question, question_type, turn_order)
            VALUES (%s, %s, 'initial', 1)
            """,
            (session_id, body.first_question),
        )

    return {"session_id": session_id}


@router.post("/{session_id}/answer")
async def submit_answer(session_id: int, body: AnswerSubmit, conn=Depends(db.get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM reading_sessions WHERE id = %s",
            (session_id,),
        )
        session = cur.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        cur.execute(
            """
            SELECT * FROM session_qa
            WHERE session_id = %s ORDER BY turn_order
            """,
            (session_id,),
        )
        qa_rows = cur.fetchall()

        unanswered = [r for r in qa_rows if r["answer"] is None]
        if not unanswered:
            raise HTTPException(status_code=400, detail="No pending question")
        current_qa = unanswered[0]

        cur.execute(
            "UPDATE session_qa SET answer = %s WHERE id = %s",
            (body.answer, current_qa["id"]),
        )

    history = [
        {
            "question": r["question"],
            "answer": r["answer"] if r["id"] != current_qa["id"] else body.answer,
            "question_type": r["question_type"],
            "turn_order": r["turn_order"],
        }
        for r in qa_rows
    ]

    result = await conversation_graph.ainvoke(
        {
            "session_id": session_id,
            "book_title": session["book_title"],
            "book_author": session["book_author"],
            "book_analysis": session["book_analysis"],
            "history": history,
            "current_answer": body.answer,
            "user_perspective": "",
            "next_question": "",
        }
    )

    next_q = result["next_question"]
    next_turn = len(qa_rows) + 1

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO session_qa (session_id, question, question_type, turn_order)
            VALUES (%s, %s, 'followup', %s)
            """,
            (session_id, next_q, next_turn),
        )

    return {"next_question": next_q, "turn": next_turn}


@router.get("/{session_id}")
def get_session(session_id: int, conn=Depends(db.get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM reading_sessions WHERE id = %s",
            (session_id,),
        )
        session = cur.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        cur.execute(
            "SELECT * FROM session_qa WHERE session_id = %s ORDER BY turn_order",
            (session_id,),
        )
        qa_list = cur.fetchall()

    return {"session": dict(session), "qa": [dict(r) for r in qa_list]}
