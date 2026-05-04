import os
import json
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from psycopg2.extras import RealDictCursor
import db
from graphs.recording_analysis import recording_analysis_graph

router = APIRouter(prefix="/api/recordings", tags=["recordings"])

ALLOWED_AUDIO_TYPES = {
    "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav",
    "audio/ogg", "audio/webm", "video/webm", "audio/m4a",
}


@router.post("")
async def upload_recording(
    file: UploadFile = File(...),
    user_id: int | None = Form(None),
    club_id: int | None = Form(None),
    conn=Depends(db.get_db),
):
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=400, detail="지원하지 않는 오디오 형식입니다.")

    suffix = os.path.splitext(file.filename or "audio")[1] or ".mp3"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # 유저의 목소리 샘플 경로 조회
        voice_sample_path = None
        if user_id:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT voice_sample FROM users WHERE id = %s", (user_id,))
                row = cur.fetchone()
                if row and row["voice_sample"] and os.path.exists(row["voice_sample"]):
                    voice_sample_path = row["voice_sample"]

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO recordings (user_id, club_id, filename)
                VALUES (%s, %s, %s) RETURNING id
                """,
                (user_id, club_id, file.filename),
            )
            recording_id = cur.fetchone()["id"]

        result = await recording_analysis_graph.ainvoke(
            {
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
            }
        )

        with conn.cursor() as cur:
            cur.execute(
                "UPDATE recordings SET transcript = %s WHERE id = %s",
                (result["transcript"], recording_id),
            )
            cur.execute(
                """
                INSERT INTO recording_analyses
                    (recording_id, summary, key_topics, followup_questions)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    recording_id,
                    result["summary"],
                    json.dumps(result["key_topics"], ensure_ascii=False),
                    json.dumps(result["followup_questions"], ensure_ascii=False),
                ),
            )

        return {
            "recording_id": recording_id,
            "transcript": result["transcript"],
            "labeled_transcript": result.get("labeled_transcript", ""),
            "user_contributions": result.get("user_contributions", []),
            "summary": result["summary"],
            "key_topics": result["key_topics"],
            "followup_questions": result["followup_questions"],
        }
    finally:
        os.unlink(tmp_path)


@router.get("/{recording_id}")
def get_recording(recording_id: int, conn=Depends(db.get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM recordings WHERE id = %s", (recording_id,))
        recording = cur.fetchone()
        if not recording:
            raise HTTPException(status_code=404, detail="Recording not found")

        cur.execute(
            "SELECT * FROM recording_analyses WHERE recording_id = %s",
            (recording_id,),
        )
        analysis = cur.fetchone()

    return {
        "recording": dict(recording),
        "analysis": dict(analysis) if analysis else None,
    }
