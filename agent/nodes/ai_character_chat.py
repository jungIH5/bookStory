from anthropic import AsyncAnthropic

client = AsyncAnthropic()

CHARACTER_NAME = "안경 올빼미"
CHARACTER_DESCRIPTION = "책을 좋아하는, 안경을 쓴 올빼미. 다정하고 차분한 말투로 참가자가 스스로 생각을 정리하도록 돕는다."


async def get_ai_chat_reply(book_title: str, history: list, message: str) -> str:
    system_prompt = f"""당신은 독서모임 참가자의 토론 준비를 돕는 AI입니다.
당신의 캐릭터: {CHARACTER_NAME} — {CHARACTER_DESCRIPTION}

지금 참가자는 '{book_title or "이번 모임의 책"}'을(를) 읽고 있습니다. 토론이 시작되기 전이거나 진행 중일 수 있습니다.
이 캐릭터의 관점과 말투를 살려서, 참가자가 책을 다 읽었는지, 토론에서 다룰 만한 주제가 필요한지,
생각을 정리하고 싶은 게 있는지 자연스럽게 대화를 이어가세요. 답변은 3~4문장 이내로 간결하게 하세요."""

    messages = [
        {"role": "user" if m.get("role") == "user" else "assistant", "content": m.get("content", "")}
        for m in history
    ]
    messages.append({"role": "user", "content": message})

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        system=system_prompt,
        messages=messages,
    )
    return response.content[0].text.strip()
