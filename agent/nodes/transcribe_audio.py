import os
from openai import AsyncOpenAI
from state import RecordingState


async def transcribe_audio_node(state: RecordingState) -> dict:
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    with open(state["audio_path"], "rb") as audio_file:
        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="ko",
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    segments = []
    for seg in getattr(response, "segments", []) or []:
        segments.append({
            "start": float(seg.get("start", 0) if isinstance(seg, dict) else seg.start),
            "end": float(seg.get("end", 0) if isinstance(seg, dict) else seg.end),
            "text": seg.get("text", "") if isinstance(seg, dict) else seg.text,
        })

    return {
        "transcript": response.text,
        "transcript_segments": segments,
    }
