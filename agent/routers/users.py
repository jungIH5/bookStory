import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor
from typing import Optional
import db
from auth import create_token

router = APIRouter(prefix="/api/users")

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "voice_samples")
os.makedirs(UPLOADS_DIR, exist_ok=True)

ALLOWED_AUDIO_TYPES = {
    "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav",
    "audio/ogg", "audio/webm", "video/webm", "audio/m4a",
}


class UserIn(BaseModel):
    name: str
    gender: str = "기타"
    age: int = 20
    location: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None


@router.post("")
def register_user(body: UserIn, conn=Depends(db.get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """INSERT INTO users (name, gender, age, location, lat, lng)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
            (body.name, body.gender, body.age, body.location, body.lat, body.lng),
        )
        user = dict(cur.fetchone())
    token = create_token(user["id"])
    return {"user": user, "token": token}


@router.post("/{user_id}/voice-sample")
async def upload_voice_sample(
    user_id: int,
    file: UploadFile = File(...),
    conn=Depends(db.get_db),
):
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=400, detail="지원하지 않는 오디오 형식입니다.")

    suffix = os.path.splitext(file.filename or "sample")[1] or ".wav"
    save_path = os.path.join(UPLOADS_DIR, f"user_{user_id}{suffix}")

    with open(save_path, "wb") as f:
        f.write(await file.read())

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE users SET voice_sample = %s WHERE id = %s",
            (save_path, user_id),
        )

    return {"message": "목소리 샘플이 등록되었습니다."}
