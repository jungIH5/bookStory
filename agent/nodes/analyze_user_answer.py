from anthropic import AsyncAnthropic
from state import ConversationState

client = AsyncAnthropic()


async def analyze_user_answer_node(state: ConversationState) -> dict:
    history_text = ""
    for turn in state.get("history", []):
        history_text += f"Q: {turn['question']}\nA: {turn.get('answer', '(미답변)')}\n\n"

    prompt = f"""다음은 독서 토론 중 나눈 대화 기록입니다.

책 제목: {state['book_title']}
저자: {state['book_author']}

대화 기록:
{history_text}
마지막 질문에 대한 사용자 답변:
{state['current_answer']}

위 답변에서 사용자가 드러낸 핵심 관점, 가치관, 또는 흥미롭게 생각하는 지점을 2-3문장으로 요약해주세요.
요약만 작성하고 다른 설명은 붙이지 마세요."""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )

    return {"user_perspective": message.content[0].text.strip()}
