import json
from anthropic import AsyncAnthropic
from kakao_books import search_kakao_books, kakao_doc_to_book

client = AsyncAnthropic()


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
    """책 제목으로 카카오 도서 검색을 해서 가장 근접한 한 건을 반환한다."""
    data = await search_kakao_books(query, size=1, sort="accuracy")
    docs = data.get("documents", [])
    if not docs:
        return None
    book = kakao_doc_to_book(docs[0])
    if not book["isbn"]:
        return None
    return {"title": book["title"], "isbn": book["isbn"], "image": book["image"]}
