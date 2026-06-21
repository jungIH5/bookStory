"""
Node (retry) — 네이버 블로그 서평 재수집

초기 수집(prepare_book_analysis)에서 관련 서평이 부족할 때 호출된다.
book_metadata의 출판사·정확한 제목을 활용해 retry마다 다른 검색 전략을 사용한다.
"""
import os
import httpx
from state import BookAnalysisState

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")


async def fetch_blog_reviews_node(state: BookAnalysisState) -> dict:
    meta = state.get("book_metadata", {})

    # 확인된 메타데이터 우선, 없으면 원본 입력 사용
    title = meta.get("title") or state["title"]
    author = meta.get("author") or state.get("author", "")
    publisher = meta.get("publisher", "")
    retry_count = state.get("retry_count", 1)

    if retry_count == 1:
        # 1차 retry: 출판사 정보가 있으면 활용, 없으면 다른 키워드
        suffix = f"{publisher} 독서" if publisher else "독서 감상문 리뷰"
    else:
        # 2차 retry: 더 일반적인 독서 관련 키워드
        suffix = "줄거리 소감 읽고나서 추천"

    query = f"{title} {author} {suffix}".strip()

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

    reviews = [
        f"{item['title']}: {item['description']}"
        for item in data.get("items", [])
        if item.get("description")
    ]

    return {
        "blog_reviews": reviews,
        "retry_count": retry_count + 1,
    }
