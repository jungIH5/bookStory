import os
import bcrypt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwe
from jose.constants import ALGORITHMS
import json

from db import get_db

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except Exception:
        return False


def _get_key() -> bytes:
    s = os.getenv("JWT_SECRET", "bookstory-default-secret-change-me!!")
    key = s.encode()[:32]
    return key.ljust(32, b"\x00")


def create_token(user_id: int) -> str:
    payload = json.dumps({"userId": str(user_id)}).encode()
    token_bytes = jwe.encrypt(payload, _get_key(), algorithm=ALGORITHMS.DIR, encryption=ALGORITHMS.A256GCM)
    return token_bytes.decode() if isinstance(token_bytes, bytes) else token_bytes


def decode_token(token: str) -> int | None:
    try:
        payload_bytes = jwe.decrypt(token, _get_key())
        payload = json.loads(payload_bytes)
        return int(payload.get("userId", 0)) or None
    except Exception:
        return None


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> int:
    if not credentials:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    return user_id


def optional_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> int | None:
    if not credentials:
        return None
    return decode_token(credentials.credentials)


async def get_current_admin_id(
    user_id: int = Depends(get_current_user_id),
    conn=Depends(get_db),
) -> int:
    is_admin = await conn.fetchval("SELECT is_admin FROM users WHERE id = $1", user_id)
    if not is_admin:
        raise HTTPException(status_code=403, detail="관리자만 접근할 수 있습니다.")
    return user_id
