import os
import httpx
from state import RecommendationState

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")


async def search_book_candidates_node(state: RecommendationState) -> dict:
    keywords = state.get("search_keywords", [])
    if not keywords:
        return {"candidates": []}

    read_titles = {b["title"].lower() for b in state.get("read_books", [])}
    candidates = []
    seen_titles = set()

    async with httpx.AsyncClient() as client:
        for keyword in keywords[:3]:
            resp = await client.get(
                "https://openapi.naver.com/v1/search/book.json",
                params={"query": keyword, "display": 6, "sort": "sim"},
                headers={
                    "X-Naver-Client-Id": NAVER_CLIENT_ID,
                    "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
                },
            )
            items = resp.json().get("items", [])
            for item in items:
                title_clean = item.get("title", "").replace("<b>", "").replace("</b>", "").strip()
                title_lower = title_clean.lower()
                if title_lower in read_titles or title_lower in seen_titles:
                    continue
                seen_titles.add(title_lower)
                candidates.append({
                    "title": title_clean,
                    "author": item.get("author", ""),
                    "image": item.get("image", ""),
                    "description": item.get("description", ""),
                    "isbn": item.get("isbn", ""),
                })

    return {"candidates": candidates[:15]}
