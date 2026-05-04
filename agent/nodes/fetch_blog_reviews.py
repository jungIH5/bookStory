"""
Node 1 — 네이버 블로그 서평 수집

retry_count에 따라 검색 키워드를 다르게 해서
재시도 시 다른 결과를 가져온다.
"""
import os
import httpx
from state import BookAnalysisState

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")


async def fetch_blog_reviews_node(state: BookAnalysisState) -> dict:
    title = state["title"]
    author = state.get("author", "")
    retry_count = state.get("retry_count", 0)

    # 재시도 시 키워드 변형으로 다른 결과 유도
    suffix = "서평 후기" if retry_count == 0 else "독서 감상 리뷰 추천"
    query = f"{title} {author} {suffix}".strip()

    async with httpx.AsyncClient() as client:
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
