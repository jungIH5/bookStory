from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import db
from graphs.conversation import conversation_graph
from auth import optional_user_id

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SessionCreate(BaseModel):
    book_title: str
    book_author: str
    book_analysis: str
    first_question: str
    user_id: Optional[int] = None


class AnswerSubmit(BaseModel):
    answer: str
    user_id: Optional[int] = None


@router.get("")
async def list_sessions(user_id: Optional[int] = None, conn=Depends(db.get_db)):
    if user_id:
        rows = await conn.fetch(
            "SELECT * FROM reading_sessions WHERE user_id = $1 ORDER BY created_at DESC",
            user_id,
        )
    else:
        rows = await conn.fetch(
            "SELECT * FROM reading_sessions ORDER BY created_at DESC LIMIT 50"
        )
    return [dict(r) for r in rows]


@router.post("")
async def create_session(
    body: SessionCreate,
    conn=Depends(db.get_db),
    token_uid: Optional[int] = Depends(optional_user_id),
):
    uid = token_uid or body.user_id
    session_id = await conn.fetchval(
        """INSERT INTO reading_sessions (user_id, book_title, book_author, book_analysis)
           VALUES ($1,$2,$3,$4) RETURNING id""",
        uid, body.book_title, body.book_author, body.book_analysis,
    )
    await conn.execute(
        "INSERT INTO session_qa (session_id, question, question_type, turn_order) VALUES ($1,$2,'initial',1)",
        session_id, body.first_question,
    )
    return {"session_id": session_id}


@router.post("/{session_id}/answer")
async def submit_answer(
    session_id: int,
    body: AnswerSubmit,
    conn=Depends(db.get_db),
):
    session = await conn.fetchrow(
        "SELECT * FROM reading_sessions WHERE id = $1", session_id
    )
    if not session:
        raise HTTPException(404, "Session not found")

    qa_rows = await conn.fetch(
        "SELECT * FROM session_qa WHERE session_id = $1 ORDER BY turn_order", session_id
    )

    unanswered = [r for r in qa_rows if r["answer"] is None]
    if not unanswered:
        raise HTTPException(400, "No pending question")
    current_qa = unanswered[0]

    await conn.execute(
        "UPDATE session_qa SET answer = $1 WHERE id = $2",
        body.answer, current_qa["id"],
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

    result = await conversation_graph.ainvoke({
        "session_id": session_id,
        "book_title": session["book_title"],
        "book_author": session["book_author"],
        "book_analysis": session["book_analysis"],
        "history": history,
        "current_answer": body.answer,
        "user_perspective": "",
        "next_question": "",
    })

    next_q = result["next_question"]
    next_turn = len(qa_rows) + 1

    await conn.execute(
        "INSERT INTO session_qa (session_id, question, question_type, turn_order) VALUES ($1,$2,'followup',$3)",
        session_id, next_q, next_turn,
    )

    return {"next_question": next_q, "turn": next_turn}


@router.get("/{session_id}")
async def get_session(session_id: int, conn=Depends(db.get_db)):
    session = await conn.fetchrow(
        "SELECT * FROM reading_sessions WHERE id = $1", session_id
    )
    if not session:
        raise HTTPException(404, "Session not found")
    qa_list = await conn.fetch(
        "SELECT * FROM session_qa WHERE session_id = $1 ORDER BY turn_order", session_id
    )
    return {"session": dict(session), "qa": [dict(r) for r in qa_list]}
