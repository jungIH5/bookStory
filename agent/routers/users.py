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
    stats_public: Optional[bool] = None
    allow_whisper: Optional[bool] = None


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


@router.get("/{user_id}/stats")
async def get_user_stats(user_id: int, conn=Depends(db.get_db)):
    row = await conn.fetchrow("""
        SELECT
            u.id, u.name, u.stats_public,
            COUNT(DISTINCT rb.id)::int AS books_count,
            COALESCE(SUM(rl.duration_seconds), 0)::int AS total_seconds
        FROM users u
        LEFT JOIN read_books rb ON rb.user_id = u.id
        LEFT JOIN reading_logs rl ON rl.user_id = u.id
        WHERE u.id = $1
        GROUP BY u.id, u.name, u.stats_public
    """, user_id)
    if not row:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")
    return dict(row)


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


ALBUM_LIMIT = 5
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB (base64 문자열 기준)


class AlbumImageIn(BaseModel):
    image_data: str  # base64 data URL


@router.get("/{user_id}/album")
async def get_album(user_id: int, conn=Depends(db.get_db)):
    rows = await conn.fetch(
        "SELECT id, image_data, created_at FROM user_images WHERE user_id=$1 ORDER BY created_at DESC",
        user_id,
    )
    return [dict(r) for r in rows]


@router.post("/{user_id}/album")
async def add_album_image(
    user_id: int,
    body: AlbumImageIn,
    conn=Depends(db.get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    if current_user_id != user_id:
        raise HTTPException(403, "본인만 추가할 수 있습니다.")
    if len(body.image_data) > MAX_IMAGE_SIZE:
        raise HTTPException(400, "이미지 크기가 너무 큽니다. (최대 5MB)")
    count = await conn.fetchval("SELECT COUNT(*) FROM user_images WHERE user_id=$1", user_id)
    if count >= ALBUM_LIMIT:
        raise HTTPException(400, f"앨범은 최대 {ALBUM_LIMIT}장까지 저장할 수 있습니다.")
    row = await conn.fetchrow(
        "INSERT INTO user_images (user_id, image_data) VALUES ($1,$2) RETURNING id, image_data, created_at",
        user_id, body.image_data,
    )
    return dict(row)


@router.delete("/{user_id}/album/{image_id}")
async def delete_album_image(
    user_id: int,
    image_id: int,
    conn=Depends(db.get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    if current_user_id != user_id:
        raise HTTPException(403, "본인만 삭제할 수 있습니다.")
    await conn.execute(
        "DELETE FROM user_images WHERE id=$1 AND user_id=$2", image_id, user_id,
    )
    return {"deleted": True}


@router.get("/{user_id}/relation")
async def get_relation(
    user_id: int,
    conn=Depends(db.get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    is_following = await conn.fetchval(
        "SELECT EXISTS(SELECT 1 FROM user_follows WHERE follower_id=$1 AND following_id=$2)",
        current_user_id, user_id,
    )
    is_blocked = await conn.fetchval(
        "SELECT EXISTS(SELECT 1 FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2)",
        current_user_id, user_id,
    )
    return {"is_following": is_following, "is_blocked": is_blocked}


@router.post("/{user_id}/follow")
async def follow_user(
    user_id: int,
    conn=Depends(db.get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    if current_user_id == user_id:
        raise HTTPException(400, "자기 자신을 팔로우할 수 없습니다.")
    await conn.execute(
        "INSERT INTO user_follows (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        current_user_id, user_id,
    )
    return {"following": True}


@router.delete("/{user_id}/follow")
async def unfollow_user(
    user_id: int,
    conn=Depends(db.get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    await conn.execute(
        "DELETE FROM user_follows WHERE follower_id=$1 AND following_id=$2",
        current_user_id, user_id,
    )
    return {"following": False}


@router.get("/{user_id}/following")
async def get_following(user_id: int, conn=Depends(db.get_db)):
    rows = await conn.fetch("""
        SELECT u.id, u.name, u.location
        FROM user_follows uf
        JOIN users u ON u.id = uf.following_id
        WHERE uf.follower_id = $1
        ORDER BY uf.created_at DESC
    """, user_id)
    return [dict(r) for r in rows]


@router.get("/{user_id}/followers")
async def get_followers(user_id: int, conn=Depends(db.get_db)):
    rows = await conn.fetch("""
        SELECT u.id, u.name, u.location
        FROM user_follows uf
        JOIN users u ON u.id = uf.follower_id
        WHERE uf.following_id = $1
        ORDER BY uf.created_at DESC
    """, user_id)
    return [dict(r) for r in rows]


@router.post("/{user_id}/block")
async def block_user(
    user_id: int,
    conn=Depends(db.get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    if current_user_id == user_id:
        raise HTTPException(400, "자기 자신을 차단할 수 없습니다.")
    await conn.execute(
        "INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        current_user_id, user_id,
    )
    # 차단 시 팔로우도 해제
    await conn.execute(
        "DELETE FROM user_follows WHERE follower_id=$1 AND following_id=$2",
        current_user_id, user_id,
    )
    return {"blocked": True}


@router.delete("/{user_id}/block")
async def unblock_user(
    user_id: int,
    conn=Depends(db.get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    await conn.execute(
        "DELETE FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2",
        current_user_id, user_id,
    )
    return {"blocked": False}


@router.post("/{user_id}/voice-sample")
async def upload_voice_sample(
    user_id: int,
    file: UploadFile = File(...),
    conn=Depends(db.get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    if current_user_id != user_id:
        raise HTTPException(403, "본인만 등록할 수 있습니다.")
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
