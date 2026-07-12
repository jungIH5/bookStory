from fastapi import APIRouter, Depends

from db import get_db
from auth import get_current_admin_id

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
async def list_users(conn=Depends(get_db), _admin_id: int = Depends(get_current_admin_id)):
    rows = await conn.fetch("""
        SELECT id, name, gender, age, location, email, oauth_provider,
               stats_public, allow_whisper, is_admin, created_at
        FROM users
        ORDER BY created_at DESC
    """)
    return [dict(r) for r in rows]
