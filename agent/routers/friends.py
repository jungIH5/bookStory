from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db import get_db
from auth import get_current_user_id

router = APIRouter(prefix="/api/friends", tags=["friends"])


@router.get("")
async def get_friends(conn=Depends(get_db), user_id: int = Depends(get_current_user_id)):
    rows = await conn.fetch("""
        SELECT
            f.id, f.status, f.created_at,
            CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS friend_id,
            u.name AS friend_name
        FROM friendships f
        JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
        WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'
        ORDER BY f.created_at DESC
    """, user_id)
    return [dict(r) for r in rows]


@router.get("/requests")
async def get_pending_requests(conn=Depends(get_db), user_id: int = Depends(get_current_user_id)):
    rows = await conn.fetch("""
        SELECT f.id, f.requester_id, f.created_at, u.name AS requester_name
        FROM friendships f
        JOIN users u ON u.id = f.requester_id
        WHERE f.addressee_id = $1 AND f.status = 'pending'
        ORDER BY f.created_at DESC
    """, user_id)
    return [dict(r) for r in rows]


@router.get("/status/{target_id}")
async def get_friendship_status(
    target_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow("""
        SELECT id, status, requester_id FROM friendships
        WHERE (requester_id = $1 AND addressee_id = $2)
           OR (requester_id = $2 AND addressee_id = $1)
    """, user_id, target_id)
    if not row:
        return {"status": "none"}
    return {
        "id": row["id"],
        "status": row["status"],
        "is_requester": row["requester_id"] == user_id,
    }


class FriendRequestIn(BaseModel):
    addressee_id: int


@router.post("/request")
async def send_request(
    body: FriendRequestIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    if body.addressee_id == user_id:
        raise HTTPException(400, "자기 자신에게 친구 요청을 보낼 수 없습니다.")
    existing = await conn.fetchrow("""
        SELECT id FROM friendships
        WHERE (requester_id = $1 AND addressee_id = $2)
           OR (requester_id = $2 AND addressee_id = $1)
    """, user_id, body.addressee_id)
    if existing:
        raise HTTPException(409, "이미 친구이거나 요청이 있습니다.")
    row = await conn.fetchrow(
        "INSERT INTO friendships (requester_id, addressee_id) VALUES ($1,$2) RETURNING *",
        user_id, body.addressee_id,
    )
    return dict(row)


@router.post("/{friendship_id}/accept")
async def accept_request(
    friendship_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow(
        "UPDATE friendships SET status='accepted' WHERE id=$1 AND addressee_id=$2 AND status='pending' RETURNING *",
        friendship_id, user_id,
    )
    if not row:
        raise HTTPException(404, "요청을 찾을 수 없습니다.")
    return dict(row)


@router.delete("/{friendship_id}")
async def delete_friendship(
    friendship_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow(
        "SELECT id FROM friendships WHERE id=$1 AND (requester_id=$2 OR addressee_id=$2)",
        friendship_id, user_id,
    )
    if not row:
        raise HTTPException(404, "친구 관계를 찾을 수 없습니다.")
    await conn.execute("DELETE FROM friendships WHERE id=$1", friendship_id)
    return {"deleted": True}
