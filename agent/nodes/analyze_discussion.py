import json
from anthropic import AsyncAnthropic
from state import RecordingState

client = AsyncAnthropic()


async def analyze_discussion_node(state: RecordingState) -> dict:
    # 화자 레이블이 붙은 트랜스크립트를 우선 사용
    transcript_text = state.get("labeled_transcript") or state.get("transcript", "")
    has_user = bool(state.get("user_speaker_label"))

    user_section = ""
    if has_user:
        user_section = '\n  "user_contribution_summary": "참여자(나)의 발언 성향 및 핵심 기여 1-2문장",'

    prompt = f"""다음은 독서모임 녹음의 전사본입니다.{' 화자가 구분되어 있습니다.' if has_user else ''}

{transcript_text}

위 대화를 분석해서 JSON으로만 응답해주세요. 다른 텍스트는 붙이지 마세요.

{{
  "summary": "전체 토론 흐름을 3-4문장으로 요약",
  "key_topics": ["핵심 주제 1", "핵심 주제 2", "핵심 주제 3"]{user_section}
}}"""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=900,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip().replace("```json", "").replace("```", "").strip()
    data = json.loads(text)

    return {
        "summary": data.get("summary", ""),
        "key_topics": data.get("key_topics", []),
    }
