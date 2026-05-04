import json
from anthropic import AsyncAnthropic
from state import RecordingState

client = AsyncAnthropic()


async def generate_recording_questions_node(state: RecordingState) -> dict:
    topics_text = "\n".join(f"- {t}" for t in state.get("key_topics", []))

    prompt = f"""독서모임 토론 요약:
{state['summary']}

이번 토론에서 다룬 핵심 주제들:
{topics_text}

이번 토론을 바탕으로, 다음 모임에서 이어서 깊이 탐구하면 좋을 후속 질문 4개를 만들어주세요.
- 이번 토론에서 충분히 다루지 못한 부분을 파고드는 질문
- 서로 다른 시각을 불러일으킬 수 있는 질문
JSON 배열로만 응답하세요. 다른 텍스트는 붙이지 마세요.

["질문1", "질문2", "질문3", "질문4"]"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    text = text.replace("```json", "").replace("```", "").strip()
    questions = json.loads(text)

    return {"followup_questions": questions if isinstance(questions, list) else []}
