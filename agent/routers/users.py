import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import db
from auth import create_token, get_current_user_id

router = APIRouter(prefix="/api/users")

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "voice_samples")
os.makedirs(UPLOADS_DIR, exist_ok=True)

MAX_VOICE_SIZE = 20 * 1024 * 1024  # 20MB

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


class LoginIn(BaseModel):
    name: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


@router.post("")
async def register_user(body: UserIn, conn=Depends(db.get_db)):
    row = await conn.fetchrow(
        "INSERT INTO users (name, gender, age, location, lat, lng) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
        body.name, body.gender, body.age, body.location, body.lat, body.lng,
    )
    user = dict(row)
    token = create_token(user["id"])
    return {"user": user, "token": token}


@router.post("/login")
async def login_user(body: LoginIn, conn=Depends(db.get_db)):
    row = await conn.fetchrow(
        "SELECT * FROM users WHERE name = $1 ORDER BY created_at DESC LIMIT 1",
        body.name,
    )
    if not row:
        raise HTTPException(404, "해당 이름의 사용자를 찾을 수 없습니다.")
    user = dict(row)
    token = create_token(user["id"])
    return {"user": user, "token": token}


@router.get("/{user_id}")
async def get_user(user_id: int, conn=Depends(db.get_db)):
    row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    if not row:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")
    return dict(row)


@router.patch("/{user_id}")
async def update_user(
    user_id: int,
    body: UserUpdate,
    conn=Depends(db.get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(403, "권한이 없습니다.")

    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        return dict(row)

    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(fields))
    values = list(fields.values())
    row = await conn.fetchrow(
        f"UPDATE users SET {set_clause} WHERE id = $1 RETURNING *",
        user_id, *values,
    )
    if not row:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")
    return dict(row)


@router.post("/{user_id}/voice-sample")
async def upload_voice_sample(
    user_id: int,
    file: UploadFile = File(...),
    conn=Depends(db.get_db),
):
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(400, "지원하지 않는 오디오 형식입니다.")

    content = await file.read()
    if len(content) > MAX_VOICE_SIZE:
        raise HTTPException(400, "파일 크기는 20MB 이하여야 합니다.")

    suffix = os.path.splitext(file.filename or "sample")[1] or ".wav"
    save_path = os.path.join(UPLOADS_DIR, f"user_{user_id}{suffix}")

    with open(save_path, "wb") as f:
        f.write(content)

    await conn.execute(
        "UPDATE users SET voice_sample = $1 WHERE id = $2",
        save_path, user_id,
    )
    return {"message": "목소리 샘플이 등록되었습니다."}
