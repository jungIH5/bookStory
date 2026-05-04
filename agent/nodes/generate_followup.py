from anthropic import AsyncAnthropic
from state import ConversationState

client = AsyncAnthropic()


async def generate_followup_node(state: ConversationState) -> dict:
    history_text = ""
    for turn in state.get("history", []):
        history_text += f"Q: {turn['question']}\nA: {turn.get('answer', '(미답변)')}\n\n"

    prompt = f"""당신은 독서 토론 진행자입니다.

책 정보:
- 제목: {state['book_title']}
- 저자: {state['book_author']}
- 분석 요약: {state['book_analysis'][:500]}

지금까지 대화:
{history_text}

사용자의 관점 분석:
{state['user_perspective']}

위 정보를 바탕으로, 사용자의 답변에서 드러난 관점을 더 깊이 탐구하거나 새로운 각도로 생각해볼 수 있는 후속 질문을 딱 1개만 만들어주세요.
- 사용자의 답변을 직접 언급하거나 확장하는 방향으로 질문하세요.
- 단순한 yes/no 질문이 아닌 사유를 이끌어내는 질문이어야 합니다.
- 질문 문장만 출력하고 번호, 설명, 따옴표는 붙이지 마세요."""

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )

    return {"next_question": message.content[0].text.strip()}
