import json
from anthropic import AsyncAnthropic
from state import RecommendationState

client = AsyncAnthropic()


async def extract_preferences_node(state: RecommendationState) -> dict:
    books_text = "\n".join(
        f"- {b['title']} ({b['author']})" for b in state["read_books"]
    )

    prompt = f"""다음은 한 독자가 읽은 책 목록입니다.

{books_text}

이 독자의 독서 취향을 분석해서 JSON으로만 응답해주세요. 다른 텍스트는 붙이지 마세요.

{{
  "preference_text": "독자의 취향을 2-3문장으로 요약 (장르, 주제, 스타일 포함)",
  "search_keywords": ["네이버 책 검색에 쓸 키워드 3개 (구체적인 단어)"]
}}"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip().replace("```json", "").replace("```", "").strip()
    data = json.loads(text)

    return {
        "preference_text": data.get("preference_text", ""),
        "search_keywords": data.get("search_keywords", []),
    }
