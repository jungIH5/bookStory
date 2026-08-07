from kakao_books import search_kakao_books, kakao_doc_to_book
from state import RecommendationState


async def search_book_candidates_node(state: RecommendationState) -> dict:
    keywords = state.get("search_keywords", [])
    if not keywords:
        return {"candidates": []}

    read_titles = {b["title"].lower() for b in state.get("read_books", [])}
    candidates = []
    seen_titles = set()

    for keyword in keywords[:3]:
        data = await search_kakao_books(keyword, size=6, sort="accuracy")
        for doc in data.get("documents", []):
            book = kakao_doc_to_book(doc)
            title_lower = book["title"].lower()
            if title_lower in read_titles or title_lower in seen_titles:
                continue
            seen_titles.add(title_lower)
            candidates.append({
                "title": book["title"],
                "author": book["author"],
                "image": book["image"],
                "description": book["description"],
                "isbn": book["isbn"],
            })

    return {"candidates": candidates[:15]}
