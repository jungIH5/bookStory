import os
import re
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from db import get_db
from graphs.book_analysis import book_analysis_graph
from auth import get_current_user_id

router = APIRouter(prefix="/api/books")

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

_TAG_RE = re.compile(r"<[^>]+>")


def _strip(text: str) -> str:
    return _TAG_RE.sub("", text or "")


@router.get("/search")
async def search_books(query: str):
    if not query:
        raise HTTPException(400, "query is required")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://openapi.naver.com/v1/search/book.json",
            params={"query": query, "display": 10},
            headers={
                "X-Naver-Client-Id": NAVER_CLIENT_ID,
                "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
            },
        )
    return resp.json()


@router.get("/analyze")
async def analyze_book(title: str, author: str = ""):
    if not title:
        raise HTTPException(400, "title is required")

    result = await book_analysis_graph.ainvoke({
        "title": _strip(title),
        "author": author,
        "book_metadata": {},
        "blog_reviews": [],
        "retry_count": 0,
        "review_quality": "",
        "analysis": "",
        "pages": 250,
        "thematic_questions": [],
        "shift_questions": [],
    })

    return {
        "analysis": result.get("analysis", ""),
        "pages": result.get("pages", 250),
        "questions": {
            "thematic": result.get("thematic_questions", []),
            "perspective_shift": result.get("shift_questions", []),
        },
    }


class ReadBookIn(BaseModel):
    title: str
    author: str = ""
    image: str = ""
    publisher: str = ""
    isbn: str = ""
    pages: int = 250
    impression: str = ""
    is_public: bool = True


@router.post("/read")
async def register_read_book(
    body: ReadBookIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow(
        """INSERT INTO read_books (title, author, image, publisher, isbn, pages, impression, is_public, user_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *""",
        _strip(body.title), body.author, body.image, body.publisher, body.isbn,
        body.pages, body.impression, body.is_public, user_id,
    )
    return dict(row)


class ImpressionIn(BaseModel):
    impression: str = ""
    is_public: bool = True


@router.put("/read/{book_id}/impression")
async def update_impression(
    book_id: int,
    body: ImpressionIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow(
        "UPDATE read_books SET impression = $1, is_public = $2 WHERE id = $3 AND user_id = $4 RETURNING *",
        body.impression, body.is_public, book_id, user_id,
    )
    if not row:
        raise HTTPException(404, "책을 찾을 수 없거나 권한이 없습니다.")
    return dict(row)


@router.delete("/read/{book_id}")
async def delete_read_book(
    book_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow("SELECT user_id FROM read_books WHERE id = $1", book_id)
    if not row:
        raise HTTPException(404, "책을 찾을 수 없습니다.")
    if row["user_id"] != user_id:
        raise HTTPException(403, "삭제 권한이 없습니다.")
    await conn.execute("DELETE FROM read_books WHERE id = $1", book_id)
    return {"deleted": True, "id": book_id}


@router.get("/read")
async def get_read_books(user_id: Optional[int] = None, conn=Depends(get_db)):
    if user_id:
        rows = await conn.fetch(
            "SELECT * FROM read_books WHERE user_id = $1 ORDER BY read_at DESC", user_id
        )
    else:
        rows = await conn.fetch("SELECT * FROM read_books ORDER BY read_at DESC")
    return [dict(r) for r in rows]
