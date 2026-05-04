import os
import asyncio
from pyannote.audio import Pipeline
from state import RecordingState

HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN")

# 파이프라인은 최초 로드 후 재사용 (모델 재다운로드 방지)
_pipeline: Pipeline | None = None


def _get_pipeline() -> Pipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=HUGGINGFACE_TOKEN,
        )
    return _pipeline


def _run_diarization(audio_path: str) -> list:
    pipeline = _get_pipeline()
    diarization = pipeline(audio_path)
    segments = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        segments.append({
            "start": round(turn.start, 3),
            "end": round(turn.end, 3),
            "speaker": speaker,
        })
    return segments


async def diarize_speakers_node(state: RecordingState) -> dict:
    # pyannote는 CPU-bound이므로 스레드 풀에서 실행
    segments = await asyncio.to_thread(_run_diarization, state["audio_path"])
    return {"diarized_segments": segments}
