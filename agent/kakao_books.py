"""카카오 책 검색 API 공용 헬퍼.
네이버 책 검색(SE05)이 계정 단에서 막혀 카카오로 교체하면서, 여러 곳(검색창/AI 자동 태깅/
책 분석/추천 도서)에서 중복되던 호출·응답 변환 로직을 여기 하나로 모았다."""
import os
import httpx

KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
KAKAO_BOOK_SEARCH_URL = "https://dapi.kakao.com/v3/search/book"


def kakao_doc_to_book(doc: dict) -> dict:
    """카카오 책 검색 결과 1건을 공용 book dict로 변환."""
    isbn_parts = (doc.get("isbn") or "").split()
    # 카카오는 "isbn10 isbn13" 형태로 함께 내려주므로 13자리를 우선한다
    isbn = next((p for p in isbn_parts if len(p) == 13), (isbn_parts[-1] if isbn_parts else ""))
    # 카카오는 판매가 정보가 없는 도서(EPUB 낱권, 절판본 등)에 sale_price=-1을 내려준다.
    # -1은 파이썬 기준 truthy라서 그대로 쓰면 "-1원"이 찍히므로 양수일 때만 채택한다.
    sale_price = doc.get("sale_price")
    list_price = doc.get("price")
    price = sale_price if isinstance(sale_price, (int, float)) and sale_price > 0 else (
        list_price if isinstance(list_price, (int, float)) and list_price > 0 else 0
    )
    return {
        "title": doc.get("title", ""),
        "author": ", ".join(doc.get("authors") or []),
        "image": doc.get("thumbnail", ""),
        "isbn": isbn,
        "publisher": doc.get("publisher", ""),
        "description": doc.get("contents", ""),
        "pubdate": (doc.get("datetime") or "")[:10].replace("-", ""),
        "discount": str(price) if price else "",
    }


async def search_kakao_books(query: str, size: int = 10, page: int = 1, sort: str = "accuracy") -> dict:
    """카카오 책 검색 API 호출. 실패해도 예외를 던지지 않고 documents=[]인 안전한 dict를 반환한다."""
    if not query:
        return {"documents": [], "meta": {}}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                KAKAO_BOOK_SEARCH_URL,
                params={"query": query, "size": max(1, min(size, 50)), "page": max(1, page), "sort": sort},
                headers={"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"},
            )
    except httpx.HTTPError:
        return {"documents": [], "meta": {}}
    if resp.status_code != 200:
        return {"documents": [], "meta": {}}
    return resp.json()
