import json
from anthropic import AsyncAnthropic
from state import TendencyState

client = AsyncAnthropic()


async def analyze_tendency_node(state: TendencyState) -> dict:
    if not state.get("qa_history"):
        return {
            "tendency_summary": "아직 토론 기록이 충분하지 않습니다. 더 많은 책을 읽고 AI 토론을 진행해보세요.",
            "reading_lenses": [],
            "strong_areas": [],
            "growth_areas": [],
        }

    history_text = ""
    for item in state["qa_history"]:
        history_text += (
            f"[{item['book_title']}]\n"
            f"Q: {item['question']}\n"
            f"A: {item['answer']}\n\n"
        )

    prompt = f"""다음은 한 독자가 여러 책에 대해 나눈 AI 토론 Q&A 기록입니다.

{history_text}

위 답변들을 분석해서 이 독자의 독서 성향을 파악해주세요.
JSON으로만 응답하세요. 다른 텍스트는 붙이지 마세요.

{{
  "tendency_summary": "이 독자의 독서 방식과 성향을 3-4문장으로 요약",
  "reading_lenses": ["답변에서 자주 등장하는 관점 키워드 3개 (예: '개인 경험 연결', '역사적 맥락', '사회구조 분석')"],
  "strong_areas": ["관점 전환이 자연스럽게 잘 일어나는 주제 영역 2개"],
  "growth_areas": ["더 탐구하면 시야가 넓어질 수 있는 영역 2개"]
}}"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=700,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip().replace("```json", "").replace("```", "").strip()
    data = json.loads(text)

    return {
        "tendency_summary": data.get("tendency_summary", ""),
        "reading_lenses": data.get("reading_lenses", []),
        "strong_areas": data.get("strong_areas", []),
        "growth_areas": data.get("growth_areas", []),
    }
