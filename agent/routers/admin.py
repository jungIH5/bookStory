from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from db import get_db
from auth import get_current_admin_id

router = APIRouter(prefix="/api/admin", tags=["admin"])

_SORTABLE_COLUMNS = {"id", "name", "gender", "created_at"}


@router.get("/users")
async def list_users(
    search: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
    conn=Depends(get_db),
    _admin_id: int = Depends(get_current_admin_id),
):
    sort_col = sort_by if sort_by in _SORTABLE_COLUMNS else "created_at"
    sort_dir = "ASC" if order == "asc" else "DESC"

    where = ""
    args: list = []
    if search:
        where = "WHERE name ILIKE $1"
        args.append(f"%{search}%")

    rows = await conn.fetch(f"""
        SELECT id, name, gender, age, location, email, oauth_provider,
               stats_public, allow_whisper, is_admin, created_at
        FROM users
        {where}
        ORDER BY {sort_col} {sort_dir}
    """, *args)
    return [dict(r) for r in rows]


class PermissionIn(BaseModel):
    is_admin: bool


@router.patch("/users/{user_id}/permission")
async def update_user_permission(
    user_id: int,
    body: PermissionIn,
    conn=Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    if user_id == admin_id and not body.is_admin:
        raise HTTPException(400, "본인의 관리자 권한은 해제할 수 없습니다.")
    row = await conn.fetchrow(
        "UPDATE users SET is_admin=$1 WHERE id=$2 RETURNING id, name, is_admin",
        body.is_admin, user_id,
    )
    if not row:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")
    return dict(row)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    conn=Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    if user_id == admin_id:
        raise HTTPException(400, "본인 계정은 삭제할 수 없습니다.")
    row = await conn.fetchrow("DELETE FROM users WHERE id=$1 RETURNING id", user_id)
    if not row:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")
    return {"deleted": True, "id": user_id}
