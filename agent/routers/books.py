import asyncio
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


def _ol_to_naver(doc: dict) -> dict:
    cover_i = doc.get("cover_i")
    isbns = doc.get("isbn") or []
    return {
        "title": doc.get("title", ""),
        "author": (doc.get("author_name") or [""])[0],
        "image": f"https://covers.openlibrary.org/b/id/{cover_i}-M.jpg" if cover_i else "",
        "isbn": isbns[0] if isbns else "",
        "publisher": ((doc.get("publisher") or [""])[0]),
        "description": "",
        "pubdate": str(doc.get("first_publish_year", "")),
        "pages": doc.get("number_of_pages_median") or 0,
    }


@router.get("/search")
async def search_books(query: str, page: int = 1, display: int = 20):
    if not query:
        raise HTTPException(400, "query is required")

    page = max(1, page)
    display = max(1, min(display, 100))
    start = (page - 1) * display + 1

    # 네이버 검색 API는 start(조회 시작 위치)가 1000을 넘는 요청을 지원하지 않는다
    if start > 1000:
        return {"items": [], "total": 0, "start": start, "display": display, "page": page, "has_more": False}

    async with httpx.AsyncClient(timeout=8.0) as client:
        tasks = [client.get(
            "https://openapi.naver.com/v1/search/book.json",
            params={"query": query, "display": display, "start": start},
            headers={
                "X-Naver-Client-Id": NAVER_CLIENT_ID,
                "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
            },
        )]
        # OpenLibrary 보강 결과는 중복 방지가 페이지 간에 걸치면 복잡해지므로 첫 페이지에서만 덧붙인다
        if page == 1:
            tasks.append(client.get(
                "https://openlibrary.org/search.json",
                params={"q": query, "limit": display, "fields": "title,author_name,isbn,cover_i,publisher,first_publish_year,number_of_pages_median"},
            ))
        results = await asyncio.gather(*tasks, return_exceptions=True)

    naver_resp = results[0]
    naver_data = naver_resp.json() if not isinstance(naver_resp, Exception) else {"items": [], "total": 0}
    naver_items = naver_data.get("items", [])

    ol_items = []
    if page == 1 and len(results) > 1:
        ol_resp = results[1]
        if not isinstance(ol_resp, Exception) and ol_resp.status_code == 200:
            ol_docs = ol_resp.json().get("docs", [])
            naver_isbns = {item.get("isbn", "").replace("-", "") for item in naver_items if item.get("isbn")}
            for doc in ol_docs:
                doc_isbns = {isbn.replace("-", "") for isbn in (doc.get("isbn") or [])}
                if not doc_isbns & naver_isbns:
                    ol_items.append(_ol_to_naver(doc))

    naver_data["items"] = naver_items + ol_items
    naver_data["page"] = page
    total = naver_data.get("total") or 0
    naver_data["has_more"] = bool(naver_items) and (start - 1 + len(naver_items)) < total
    return naver_data


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
    description: str = ""
    impression: str = ""
    is_public: bool = True
    status: str = "finished"


@router.post("/read")
async def register_read_book(
    body: ReadBookIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow(
        """INSERT INTO read_books (title, author, image, publisher, isbn, pages, description, impression, is_public, user_id, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *""",
        _strip(body.title), body.author, body.image, body.publisher, body.isbn,
        body.pages, _strip(body.description), body.impression, body.is_public, user_id, body.status,
    )
    return dict(row)


class StatusIn(BaseModel):
    status: str  # 'reading' | 'finished'


@router.patch("/read/{book_id}/status")
async def update_book_status(
    book_id: int,
    body: StatusIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow(
        "UPDATE read_books SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
        body.status, book_id, user_id,
    )
    if not row:
        raise HTTPException(404, "책을 찾을 수 없거나 권한이 없습니다.")
    return dict(row)


class PagesIn(BaseModel):
    pages: int


@router.patch("/read/{book_id}/pages")
async def update_book_pages(
    book_id: int,
    body: PagesIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow(
        "UPDATE read_books SET pages = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
        body.pages, book_id, user_id,
    )
    if not row:
        raise HTTPException(404, "책을 찾을 수 없거나 권한이 없습니다.")
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
    if row["user_id"] is not None and row["user_id"] != user_id:
        raise HTTPException(403, "삭제 권한이 없습니다.")
    await conn.execute("DELETE FROM read_books WHERE id = $1", book_id)
    return {"deleted": True, "id": book_id}


@router.get("/read")
async def get_read_books(user_id: Optional[int] = None, conn=Depends(get_db)):
    if user_id:
        rows = await conn.fetch("""
            SELECT rb.*, COALESCE(rl.duration_seconds, 0) AS my_seconds
            FROM read_books rb
            LEFT JOIN reading_logs rl ON rl.read_book_id = rb.id
            WHERE rb.user_id = $1
            ORDER BY rb.read_at DESC
        """, user_id)
    else:
        rows = await conn.fetch("""
            SELECT rb.*, COALESCE(rl.duration_seconds, 0) AS my_seconds
            FROM read_books rb
            LEFT JOIN reading_logs rl ON rl.read_book_id = rb.id
            ORDER BY rb.read_at DESC
        """)
    return [dict(r) for r in rows]
