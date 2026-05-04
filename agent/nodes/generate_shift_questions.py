"""
Node 4 — Claude: 관점 전환 질문 생성

앞 노드에서 만들어진 분석 결과를 바탕으로,
책의 익숙한 독서 프레임을 완전히 벗어난 시각의 질문 2개를 생성한다.
(과학적, 경제학적, 역사적, 반대 논리, 다른 문화권 등)
"""
import json
from anthropic import AsyncAnthropic
from state import BookAnalysisState

_client = AsyncAnthropic()


async def generate_shift_questions_node(state: BookAnalysisState) -> dict:
    title = state["title"]
    author = state.get("author", "작자미상")
    analysis = state.get("analysis", "")

    prompt = f"""책: {title} ({author})
분석 요약: {analysis}

이 책에 대한 일반적인 독서 패턴, 해석 프레임을 완전히 벗어나서
전혀 예상치 못한 렌즈로 접근하는 토론 질문 2개를 생성해주세요.

활용 가능한 렌즈 예시: 과학/물리학, 경제/행동경제학, 역사적 맥락 전환,
다른 문화권 시각, 저자와 정반대 입장, 현대적 재해석 등

아래 JSON 배열 형식으로 정확히 응답해주세요. JSON 외 텍스트는 포함하지 마세요.

[
  {{"perspective": "적용한 관점 이름 (간결하게)", "question": "그 관점에서 바라본 질문"}},
  {{"perspective": "다른 관점 이름", "question": "그 관점에서 바라본 질문"}}
]"""

    message = await _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    parsed = json.loads(text)
    return {"shift_questions": parsed}
