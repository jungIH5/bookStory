import os
import re
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from db import get_db
from graphs.book_analysis import book_analysis_graph

router = APIRouter(prefix="/api/books")

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

_TAG_RE = re.compile(r"<[^>]+>")


def _strip(text: str) -> str:
    return _TAG_RE.sub("", text or "")


# ── 책 검색 ────────────────────────────────────────────────────────────────
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


# ── 책 분석 (LangGraph 그래프 호출) ───────────────────────────────────────
@router.get("/analyze")
async def analyze_book(title: str, author: str = ""):
    if not title:
        raise HTTPException(400, "title is required")

    initial_state = {
        "title": _strip(title),
        "author": author,
        "blog_reviews": [],
        "retry_count": 0,
        "review_quality": "",
        "analysis": "",
        "pages": 250,
        "thematic_questions": [],
        "shift_questions": [],
    }

    result = await book_analysis_graph.ainvoke(initial_state)

    return {
        "analysis": result.get("analysis", ""),
        "pages": result.get("pages", 250),
        "questions": {
            "thematic": result.get("thematic_questions", []),
            "perspective_shift": result.get("shift_questions", []),
        },
    }


# ── 읽은 책 등록 ───────────────────────────────────────────────────────────
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
def register_read_book(body: ReadBookIn, conn=Depends(get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """INSERT INTO read_books (title, author, image, publisher, isbn, pages, impression, is_public)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (_strip(body.title), body.author, body.image, body.publisher, body.isbn, body.pages,
             body.impression, body.is_public),
        )
        return dict(cur.fetchone())


class ImpressionIn(BaseModel):
    impression: str = ""
    is_public: bool = True


@router.put("/read/{book_id}/impression")
def update_impression(book_id: int, body: ImpressionIn, conn=Depends(get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "UPDATE read_books SET impression = %s, is_public = %s WHERE id = %s RETURNING *",
            (body.impression, body.is_public, book_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Book not found")
        return dict(row)


# ── 읽은 책 목록 ───────────────────────────────────────────────────────────
@router.get("/read")
def get_read_books(conn=Depends(get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM read_books ORDER BY read_at DESC")
        return [dict(r) for r in cur.fetchall()]
