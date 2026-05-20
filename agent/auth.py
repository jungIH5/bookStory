import os
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwe
from jose.constants import ALGORITHMS
import json

security = HTTPBearer(auto_error=False)


def _get_key() -> bytes:
    s = os.getenv("JWT_SECRET", "bookstory-default-secret-change-me!!")
    key = s.encode()[:32]
    return key.ljust(32, b"\x00")


def create_token(user_id: int) -> str:
    payload = json.dumps({"userId": str(user_id)}).encode()
    token_bytes = jwe.encrypt(payload, _get_key(), algorithm=ALGORITHMS.DIR, encryption=ALGORITHMS.A256GCM)
    return token_bytes.decode() if isinstance(token_bytes, bytes) else token_bytes


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> int:
    if not credentials:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    try:
        payload_bytes = jwe.decrypt(credentials.credentials, _get_key())
        payload = json.loads(payload_bytes)
        user_id = payload.get("userId")
        if not user_id:
            raise ValueError("userId missing")
        return int(user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")


def optional_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> int | None:
    if not credentials:
        return None
    try:
        payload_bytes = jwe.decrypt(credentials.credentials, _get_key())
        payload = json.loads(payload_bytes)
        return int(payload.get("userId", 0)) or None
    except Exception:
        return None
