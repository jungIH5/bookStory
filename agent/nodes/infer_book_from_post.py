import json
import os
import httpx
from anthropic import AsyncAnthropic

client = AsyncAnthropic()

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")


async def infer_book_title_from_post(title: str, content: str) -> str | None:
    """게시글 제목/본문에서 언급된 책 제목을 추정한다. 확신이 없으면 None."""
    prompt = f"""다음은 독서 커뮤니티에 올라온 게시글입니다.

제목: {title}
내용: {content[:1500]}

이 글이 특정 책 한 권에 대한 이야기라면 그 책의 정확한 제목을 추정해서 JSON으로만 응답하세요.
여러 책을 언급하거나 특정 책과 무관한 잡담이라 확신할 수 없으면 book_title을 빈 문자열로 두세요.
다른 텍스트는 붙이지 마세요.

{{"book_title": "추정한 책 제목 또는 빈 문자열"}}"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )
    text = message.content[0].text.strip().replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(text)
    except Exception:
        return None
    guess = (data.get("book_title") or "").strip()
    return guess or None


async def resolve_book_by_title(query: str) -> dict | None:
    """책 제목으로 네이버 도서 검색을 해서 가장 근접한 한 건을 반환한다."""
    async with httpx.AsyncClient(timeout=8.0) as http_client:
        resp = await http_client.get(
            "https://openapi.naver.com/v1/search/book.json",
            params={"query": query, "display": 1, "sort": "sim"},
            headers={
                "X-Naver-Client-Id": NAVER_CLIENT_ID,
                "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
            },
        )
        items = resp.json().get("items", []) if resp.status_code == 200 else []
    if not items:
        return None
    item = items[0]
    isbn = (item.get("isbn") or "").split(" ")[0].strip()
    if not isbn:
        return None
    title_clean = item.get("title", "").replace("<b>", "").replace("</b>", "").strip()
    return {"title": title_clean, "isbn": isbn, "image": item.get("image", "")}
