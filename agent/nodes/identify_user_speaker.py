import os
import asyncio
import tempfile
import numpy as np
from scipy.spatial.distance import cosine
from pyannote.audio import Model, Inference
from pydub import AudioSegment
from state import RecordingState

HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN")

_embedding_model: Model | None = None
_inference: Inference | None = None


def _get_inference() -> Inference:
    global _embedding_model, _inference
    if _inference is None:
        _embedding_model = Model.from_pretrained(
            "pyannote/embedding",
            use_auth_token=HUGGINGFACE_TOKEN,
        )
        _inference = Inference(_embedding_model, window="whole")
    return _inference


def _extract_speaker_clip(audio_path: str, segments: list, speaker: str, max_sec: float = 10.0) -> str:
    """지정 화자의 발화를 최대 max_sec 초 추출해 임시 WAV 파일로 반환."""
    audio = AudioSegment.from_file(audio_path)
    combined = AudioSegment.empty()
    for seg in segments:
        if seg["speaker"] != speaker:
            continue
        start_ms = int(seg["start"] * 1000)
        end_ms = int(seg["end"] * 1000)
        combined += audio[start_ms:end_ms]
        if len(combined) >= max_sec * 1000:
            break
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    combined.export(tmp.name, format="wav")
    return tmp.name


def _align_segments(transcript_segs: list, diarized_segs: list) -> list:
    """Whisper 세그먼트 각각에 가장 겹치는 화자 레이블을 붙인다."""
    labeled = []
    for ts in transcript_segs:
        best_speaker, best_overlap = "화자 ?", 0.0
        for ds in diarized_segs:
            overlap = max(0.0, min(ts["end"], ds["end"]) - max(ts["start"], ds["start"]))
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = ds["speaker"]
        labeled.append({**ts, "speaker": best_speaker})
    return labeled


def _build_labeled_transcript(labeled_segs: list, user_speaker: str) -> tuple[str, list]:
    """화자 레이블이 붙은 트랜스크립트 문자열과 유저 발화 목록을 반환."""
    def speaker_display(raw: str) -> str:
        if raw == user_speaker and user_speaker:
            return "나"
        try:
            idx = int(raw.split("_")[-1]) + 1
            return f"화자 {idx}"
        except Exception:
            return raw

    lines, user_contributions = [], []
    prev_label, buffer = None, []

    for seg in labeled_segs:
        label = speaker_display(seg["speaker"])
        if label != prev_label:
            if buffer and prev_label:
                text = " ".join(buffer).strip()
                lines.append(f"{prev_label}: {text}")
                if prev_label == "나":
                    user_contributions.append(text)
            buffer = [seg["text"]]
            prev_label = label
        else:
            buffer.append(seg["text"])

    if buffer and prev_label:
        text = " ".join(buffer).strip()
        lines.append(f"{prev_label}: {text}")
        if prev_label == "나":
            user_contributions.append(text)

    return "\n".join(lines), user_contributions


def _run_identification(
    audio_path: str,
    diarized_segs: list,
    transcript_segs: list,
    voice_sample_path: str | None,
) -> tuple[str, str, list]:
    """(user_speaker_label, labeled_transcript, user_contributions) 반환."""
    user_speaker = ""

    if voice_sample_path and diarized_segs:
        try:
            inference = _get_inference()
            user_emb = np.array(inference(voice_sample_path)).flatten()
            unique_speakers = list({seg["speaker"] for seg in diarized_segs})
            best_speaker, best_sim = "", -1.0

            for sp in unique_speakers:
                clip_path = _extract_speaker_clip(audio_path, diarized_segs, sp)
                try:
                    sp_emb = np.array(inference(clip_path)).flatten()
                    sim = 1.0 - cosine(user_emb, sp_emb)
                    if sim > best_sim:
                        best_sim, best_speaker = sim, sp
                finally:
                    os.unlink(clip_path)

            # 유사도 0.5 이상일 때만 본인으로 식별
            if best_sim >= 0.5:
                user_speaker = best_speaker
        except Exception as e:
            print(f"[identify_user_speaker] speaker identification failed: {e}")

    labeled_segs = _align_segments(transcript_segs, diarized_segs)
    labeled_transcript, user_contributions = _build_labeled_transcript(labeled_segs, user_speaker)
    return user_speaker, labeled_transcript, user_contributions


async def identify_user_speaker_node(state: RecordingState) -> dict:
    user_speaker, labeled_transcript, user_contributions = await asyncio.to_thread(
        _run_identification,
        state["audio_path"],
        state.get("diarized_segments", []),
        state.get("transcript_segments", []),
        state.get("voice_sample_path"),
    )
    return {
        "user_speaker_label": user_speaker,
        "labeled_transcript": labeled_transcript,
        "user_contributions": user_contributions,
    }
