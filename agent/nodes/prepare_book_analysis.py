"""
Node 1 — 책 메타데이터 확인 + 서평 수집 (병렬 실행)

카카오 책 검색 API로 책을 먼저 특정하고,
동시에 Naver Blog API로 초기 서평을 수집한다.
두 호출을 asyncio.gather로 병렬 실행해 레이턴시를 최소화한다.
"""
import asyncio
import os
import re
import httpx
from state import BookAnalysisState
from kakao_books import search_kakao_books, kakao_doc_to_book

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

_TAG_RE = re.compile(r"<[^>]+>")


def _strip(text: str) -> str:
    return _TAG_RE.sub("", text or "")


async def _verify_book(title: str, author: str) -> dict:
    """카카오 책 검색으로 책 메타데이터 확인."""
    data = await search_kakao_books(f"{title} {author}".strip(), size=1, sort="accuracy")
    docs = data.get("documents", [])
    if not docs:
        return {}

    book = kakao_doc_to_book(docs[0])
    return {
        "isbn":        book["isbn"],
        "title":       _strip(book["title"]),
        "author":      _strip(book["author"]),
        "publisher":   _strip(book["publisher"]),
        "description": _strip(book["description"]),
    }


async def _fetch_reviews(title: str, author: str) -> list[str]:
    """초기 서평 수집 — '서평 후기' 키워드로 검색."""
    query = f"{title} {author} 서평 후기".strip()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://openapi.naver.com/v1/search/blog.json",
                params={"query": query, "display": 5},
                headers={
                    "X-Naver-Client-Id": NAVER_CLIENT_ID,
                    "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
                },
            )
            data = resp.json()

        return [
            f"{item['title']}: {item['description']}"
            for item in data.get("items", [])
            if item.get("description")
        ]
    except Exception:
        return []


async def prepare_book_analysis_node(state: BookAnalysisState) -> dict:
    title = state["title"]
    author = state.get("author", "")

    # 두 API 호출 병렬 실행 — 순차 대비 레이턴시 절반
    book_metadata, blog_reviews = await asyncio.gather(
        _verify_book(title, author),
        _fetch_reviews(title, author),
    )

    return {
        "book_metadata": book_metadata,
        "blog_reviews": blog_reviews,
        "retry_count": 1,
    }
