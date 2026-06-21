import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
import db
from graphs.recording_analysis import recording_analysis_graph
from auth import optional_user_id

router = APIRouter(prefix="/api/recordings", tags=["recordings"])

MAX_RECORDING_SIZE = 100 * 1024 * 1024  # 100MB

ALLOWED_AUDIO_TYPES = {
    "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav",
    "audio/ogg", "audio/webm", "video/webm", "audio/m4a",
}


@router.get("")
async def list_recordings(user_id: Optional[int] = None, conn=Depends(db.get_db)):
    if user_id:
        rows = await conn.fetch(
            """
            SELECT r.id, r.user_id, r.club_id, r.filename, r.duration_seconds,
                   r.transcript, r.labeled_transcript, r.created_at,
                   ra.summary, ra.key_topics, ra.followup_questions
            FROM recordings r
            LEFT JOIN recording_analyses ra ON ra.recording_id = r.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
            """,
            user_id,
        )
    else:
        rows = await conn.fetch(
            """
            SELECT r.id, r.user_id, r.club_id, r.filename, r.duration_seconds,
                   r.transcript, r.labeled_transcript, r.created_at,
                   ra.summary, ra.key_topics, ra.followup_questions
            FROM recordings r
            LEFT JOIN recording_analyses ra ON ra.recording_id = r.id
            ORDER BY r.created_at DESC
            LIMIT 50
            """
        )
    return [dict(r) for r in rows]


@router.post("")
async def upload_recording(
    file: UploadFile = File(...),
    club_id: Optional[int] = Form(None),
    conn=Depends(db.get_db),
    token_uid: Optional[int] = Depends(optional_user_id),
    form_user_id: Optional[int] = Form(None, alias="user_id"),
):
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(400, "지원하지 않는 오디오 형식입니다.")

    content = await file.read()
    if len(content) > MAX_RECORDING_SIZE:
        raise HTTPException(400, "파일 크기는 100MB 이하여야 합니다.")

    user_id = token_uid or form_user_id

    suffix = os.path.splitext(file.filename or "audio")[1] or ".mp3"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        voice_sample_path = None
        if user_id:
            row = await conn.fetchrow(
                "SELECT voice_sample FROM users WHERE id = $1", user_id
            )
            if row and row["voice_sample"] and os.path.exists(row["voice_sample"]):
                voice_sample_path = row["voice_sample"]

        recording_id = await conn.fetchval(
            "INSERT INTO recordings (user_id, club_id, filename) VALUES ($1,$2,$3) RETURNING id",
            user_id, club_id, file.filename,
        )

        result = await recording_analysis_graph.ainvoke({
            "recording_id": recording_id,
            "audio_path": tmp_path,
            "voice_sample_path": voice_sample_path,
            "transcript": "",
            "transcript_segments": [],
            "diarized_segments": [],
            "user_speaker_label": "",
            "labeled_transcript": "",
            "user_contributions": [],
            "summary": "",
            "key_topics": [],
            "followup_questions": [],
        })

        labeled = result.get("labeled_transcript", "")
        await conn.execute(
            "UPDATE recordings SET transcript = $1, labeled_transcript = $2 WHERE id = $3",
            result["transcript"], labeled, recording_id,
        )
        await conn.execute(
            """INSERT INTO recording_analyses (recording_id, summary, key_topics, followup_questions)
               VALUES ($1,$2,$3,$4)""",
            recording_id,
            result["summary"],
            result["key_topics"],
            result["followup_questions"],
        )

        return {
            "recording_id": recording_id,
            "transcript": result["transcript"],
            "labeled_transcript": labeled,
            "user_contributions": result.get("user_contributions", []),
            "summary": result["summary"],
            "key_topics": result["key_topics"],
            "followup_questions": result["followup_questions"],
        }
    finally:
        os.unlink(tmp_path)


@router.get("/{recording_id}")
async def get_recording(recording_id: int, conn=Depends(db.get_db)):
    recording = await conn.fetchrow(
        "SELECT * FROM recordings WHERE id = $1", recording_id
    )
    if not recording:
        raise HTTPException(404, "Recording not found")
    analysis = await conn.fetchrow(
        "SELECT * FROM recording_analyses WHERE recording_id = $1", recording_id
    )
    return {
        "recording": dict(recording),
        "analysis": dict(analysis) if analysis else None,
    }
