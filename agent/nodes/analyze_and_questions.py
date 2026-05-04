"""
Node 3 — Claude: 책 분석 + 주제 기반 토론 질문 생성

서평 데이터를 바탕으로 책의 핵심 의미를 분석하고,
독서 모임에서 사용할 수 있는 주제 기반 토론 질문 3개를 생성한다.
"""
import json
from anthropic import AsyncAnthropic
from state import BookAnalysisState

_client = AsyncAnthropic()


async def analyze_and_questions_node(state: BookAnalysisState) -> dict:
    title = state["title"]
    author = state.get("author", "작자미상")
    reviews = state.get("blog_reviews", [])

    reviews_text = (
        "\n".join(f"- {r}" for r in reviews)
        if reviews
        else "서평 정보를 찾을 수 없습니다."
    )

    prompt = f"""당신은 독서 토론 전문가입니다.

책: {title} ({author})

블로그 서평 자료:
{reviews_text}

위 정보를 바탕으로 아래 JSON 형식으로 정확히 응답해주세요. JSON 외 텍스트는 포함하지 마세요.

{{
  "analysis": "이 책이 독자에게 주는 핵심 의미, 가치, 주제 의식을 3~4문장으로 깊이 있게 분석",
  "pages": 예상 페이지 수 (정수, 모르면 250),
  "thematic_questions": [
    "책의 핵심 개념이나 철학적 논점을 탐구하는 질문",
    "저자의 관점이나 의도에 대해 묻는 질문",
    "독자 자신의 경험과 이 책을 연결하는 질문"
  ]
}}"""

    message = await _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    parsed = json.loads(text)
    return {
        "analysis": parsed.get("analysis", ""),
        "pages": parsed.get("pages", 250),
        "thematic_questions": parsed.get("thematic_questions", []),
    }
