import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional
import db
from auth import create_token, get_current_user_id, hash_password, verify_password

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
    password: str = Field(min_length=4)
    gender: str = "기타"
    age: int = 20
    location: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None


class LoginIn(BaseModel):
    name: str
    password: str


class SetInitialPasswordIn(BaseModel):
    name: str
    password: str = Field(min_length=4)


def _public_user(row) -> dict:
    d = dict(row)
    d.pop("password_hash", None)
    return d


class UserUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    stats_public: Optional[bool] = None
    allow_whisper: Optional[bool] = None
    profile_image: Optional[str] = None  # base64 데이터 URL, 빈 문자열이면 제거


@router.post("")
async def register_user(body: UserIn, conn=Depends(db.get_db)):
    existing = await conn.fetchval("SELECT 1 FROM users WHERE name = $1", body.name)
    if existing:
        raise HTTPException(409, "이미 사용 중인 이름입니다.")
    row = await conn.fetchrow(
        """INSERT INTO users (name, password_hash, gender, age, location, lat, lng)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *""",
        body.name, hash_password(body.password), body.gender, body.age, body.location, body.lat, body.lng,
    )
    user = _public_user(row)
    token = create_token(user["id"])
    return {"user": user, "token": token}


@router.post("/login")
async def login_user(body: LoginIn, conn=Depends(db.get_db)):
    rows = await conn.fetch(
        "SELECT * FROM users WHERE name = $1 ORDER BY created_at DESC", body.name,
    )
    if not rows:
        raise HTTPException(404, "해당 이름의 사용자를 찾을 수 없습니다.")

    needs_setup = False
    for row in rows:
        if row["password_hash"]:
            if verify_password(body.password, row["password_hash"]):
                user = _public_user(row)
                token = create_token(user["id"])
                return {"user": user, "token": token}
        else:
            needs_setup = True

    if needs_setup:
        raise HTTPException(409, "비밀번호가 설정되지 않은 계정입니다. 비밀번호를 설정해주세요.")
    raise HTTPException(401, "이름 또는 비밀번호가 일치하지 않습니다.")


@router.post("/set-initial-password")
async def set_initial_password(body: SetInitialPasswordIn, conn=Depends(db.get_db)):
    """비밀번호 도입 이전에 만들어진 계정(password_hash 없음)에 처음으로 비밀번호를 설정한다."""
    row = await conn.fetchrow(
        "SELECT * FROM users WHERE name = $1 AND password_hash IS NULL ORDER BY created_at DESC LIMIT 1",
        body.name,
    )
    if not row:
        raise HTTPException(404, "비밀번호 설정이 필요한 계정을 찾을 수 없습니다.")
    updated = await conn.fetchrow(
        "UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *",
        hash_password(body.password), row["id"],
    )
    user = _public_user(updated)
    token = create_token(user["id"])
    return {"user": user, "token": token}


ADMIN_ACCOUNT_NAME = "테스트유저"
ADMIN_ENTRY_PASSWORD = os.getenv("ADMIN_ENTRY_PASSWORD", "2345")


class AdminLoginIn(BaseModel):
    password: str


@router.post("/admin-login")
async def admin_login(body: AdminLoginIn, conn=Depends(db.get_db)):
    """고정된 관리자 계정으로 진입. 일반 로그인/회원가입과는 별개의 우회 경로."""
    if body.password != ADMIN_ENTRY_PASSWORD:
        raise HTTPException(401, "비밀번호가 일치하지 않습니다.")

    row = await conn.fetchrow(
        "SELECT * FROM users WHERE name = $1 ORDER BY created_at DESC LIMIT 1", ADMIN_ACCOUNT_NAME,
    )
    if not row:
        row = await conn.fetchrow(
            """INSERT INTO users (name, is_admin, gender, age, location)
               VALUES ($1, TRUE, '기타', 20, '서울') RETURNING *""",
            ADMIN_ACCOUNT_NAME,
        )
    elif not row["is_admin"]:
        row = await conn.fetchrow(
            "UPDATE users SET is_admin = TRUE WHERE id = $1 RETURNING *", row["id"],
        )

    user = _public_user(row)
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
    return _public_user(row)


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
        return _public_user(row)

    if fields.get("profile_image") and len(fields["profile_image"]) > MAX_IMAGE_SIZE:
        raise HTTPException(400, "이미지 크기가 너무 큽니다. (최대 5MB)")

    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(fields))
    values = list(fields.values())
    row = await conn.fetchrow(
        f"UPDATE users SET {set_clause} WHERE id = $1 RETURNING *",
        user_id, *values,
    )
    if not row:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")
    return _public_user(row)


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
    is_blocked = await conn.fetchval(
        "SELECT EXISTS(SELECT 1 FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2)",
        current_user_id, user_id,
    )
    return {"is_blocked": is_blocked}


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
