import json
from anthropic import AsyncAnthropic
from state import RecommendationState

client = AsyncAnthropic()


async def rank_recommendations_node(state: RecommendationState) -> dict:
    candidates = state.get("candidates", [])
    if not candidates:
        return {"recommendations": []}

    candidates_text = "\n".join(
        f"{i+1}. {c['title']} — {c['author']}: {c['description'][:80]}"
        for i, c in enumerate(candidates)
    )

    prompt = f"""독자 취향: {state['preference_text']}

추천 후보 도서 목록:
{candidates_text}

위 후보 중 이 독자에게 가장 잘 맞는 책 4권을 골라주세요.
JSON 배열로만 응답하세요. 다른 텍스트는 붙이지 마세요.

[
  {{
    "title": "책 제목",
    "author": "저자",
    "reason": "이 독자에게 추천하는 이유 한 문장"
  }}
]"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip().replace("```json", "").replace("```", "").strip()
    ranked = json.loads(text)

    # 후보 목록에서 image 등 메타데이터 보강
    title_to_meta = {c["title"]: c for c in candidates}
    result = []
    for item in ranked:
        meta = title_to_meta.get(item["title"], {})
        result.append({
            "title": item["title"],
            "author": item["author"],
            "image": meta.get("image", ""),
            "isbn": meta.get("isbn", ""),
            "reason": item["reason"],
        })

    return {"recommendations": result}
