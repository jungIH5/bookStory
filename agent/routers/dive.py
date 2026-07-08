from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from db import get_db
from auth import get_current_user_id

router = APIRouter(prefix="/api/dive", tags=["dive"])


class DiveRoomIn(BaseModel):
    title: str
    book_title: Optional[str] = ""
    book_image: Optional[str] = ""
    book_isbn: Optional[str] = ""
    room_image: Optional[str] = ""
    scheduled_at: str
    reading_minutes: int = 30
    discussion_minutes: int = 20
    max_participants: int = 8
    late_join_cutoff_minutes: int = 10
    notice: Optional[str] = ""
    host_name: Optional[str] = ""


@router.get("/rooms")
async def get_rooms(conn=Depends(get_db)):
    rows = await conn.fetch("""
        SELECT r.*, COALESCE(u.name, r.host_name) AS host_name,
               COUNT(p.id)::int AS participant_count
        FROM dive_rooms r
        LEFT JOIN users u ON u.id = r.host_id
        LEFT JOIN dive_participants p ON p.room_id = r.id
        WHERE r.status != 'ended'
        GROUP BY r.id, u.name
        ORDER BY r.scheduled_at ASC
    """)
    return [dict(r) for r in rows]


@router.post("/rooms")
async def create_room(
    body: DiveRoomIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    scheduled_dt = datetime.fromisoformat(body.scheduled_at.replace('Z', '+00:00'))
    row = await conn.fetchrow("""
        INSERT INTO dive_rooms
            (title, book_title, book_image, book_isbn, room_image, host_id, host_name,
             scheduled_at, reading_minutes, discussion_minutes,
             max_participants, late_join_cutoff_minutes, notice)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *
    """,
        body.title, body.book_title or '', body.book_image or '',
        body.book_isbn or '', body.room_image or '', user_id, body.host_name or '',
        scheduled_dt,
        body.reading_minutes, body.discussion_minutes,
        body.max_participants, body.late_join_cutoff_minutes,
        body.notice or '',
    )
    # 방장을 자동으로 참가자로 등록
    await conn.execute(
        "INSERT INTO dive_participants (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        row['id'], user_id,
    )
    return dict(row)


@router.get("/rooms/hosted")
async def get_hosted_rooms(conn=Depends(get_db), user_id: int = Depends(get_current_user_id)):
    rows = await conn.fetch("""
        SELECT r.*, COUNT(DISTINCT p.id)::int AS participant_count
        FROM dive_rooms r
        LEFT JOIN dive_participants p ON p.room_id = r.id
        WHERE r.host_id = $1
        GROUP BY r.id
        ORDER BY r.scheduled_at DESC
    """, user_id)
    return [dict(r) for r in rows]


@router.get("/rooms/joined")
async def get_joined_rooms(conn=Depends(get_db), user_id: int = Depends(get_current_user_id)):
    rows = await conn.fetch("""
        SELECT r.*, COUNT(DISTINCT p.id)::int AS participant_count
        FROM dive_rooms r
        JOIN dive_participants dp ON dp.room_id = r.id AND dp.user_id = $1
        LEFT JOIN dive_participants p ON p.room_id = r.id
        WHERE r.host_id != $1
        GROUP BY r.id
        ORDER BY r.scheduled_at DESC
    """, user_id)
    return [dict(r) for r in rows]


class NoticeIn(BaseModel):
    notice: str


@router.patch("/rooms/{room_id}/notice")
async def update_notice(
    room_id: int, body: NoticeIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    room = await conn.fetchrow("SELECT host_id FROM dive_rooms WHERE id=$1", room_id)
    if not room or room['host_id'] != user_id:
        raise HTTPException(403, "방장만 변경할 수 있습니다.")
    row = await conn.fetchrow(
        "UPDATE dive_rooms SET notice=$1 WHERE id=$2 RETURNING *", body.notice, room_id,
    )
    return dict(row)


class RoomImageIn(BaseModel):
    room_image: str


@router.patch("/rooms/{room_id}/image")
async def update_room_image(
    room_id: int,
    body: RoomImageIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    room = await conn.fetchrow("SELECT host_id FROM dive_rooms WHERE id=$1", room_id)
    if not room or room['host_id'] != user_id:
        raise HTTPException(403, "방장만 변경할 수 있습니다.")
    row = await conn.fetchrow(
        "UPDATE dive_rooms SET room_image=$1 WHERE id=$2 RETURNING *",
        body.room_image, room_id,
    )
    return dict(row)


@router.patch("/rooms/{room_id}/chat")
async def toggle_chat(
    room_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    room = await conn.fetchrow("SELECT host_id, chat_enabled FROM dive_rooms WHERE id=$1", room_id)
    if not room or room['host_id'] != user_id:
        raise HTTPException(403, "방장만 변경할 수 있습니다.")
    row = await conn.fetchrow(
        "UPDATE dive_rooms SET chat_enabled = NOT COALESCE(chat_enabled, TRUE) WHERE id=$1 RETURNING *",
        room_id,
    )
    return dict(row)


@router.get("/rooms/{room_id}")
async def get_room(room_id: int, conn=Depends(get_db)):
    row = await conn.fetchrow("""
        SELECT r.*, COALESCE(u.name, r.host_name) AS host_name,
               COUNT(p.id)::int AS participant_count
        FROM dive_rooms r
        LEFT JOIN users u ON u.id = r.host_id
        LEFT JOIN dive_participants p ON p.room_id = r.id
        WHERE r.id = $1
        GROUP BY r.id, u.name
    """, room_id)
    if not row:
        raise HTTPException(404, "방을 찾을 수 없습니다.")
    participants = await conn.fetch("""
        SELECT p.id, p.user_id, p.status, u.name
        FROM dive_participants p
        JOIN users u ON u.id = p.user_id
        WHERE p.room_id = $1
        ORDER BY p.joined_at ASC
    """, room_id)
    result = dict(row)
    result['participants'] = [dict(p) for p in participants]
    return result


@router.post("/rooms/{room_id}/join")
async def join_room(
    room_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    room = await conn.fetchrow("SELECT * FROM dive_rooms WHERE id=$1", room_id)
    if not room:
        raise HTTPException(404, "방을 찾을 수 없습니다.")
    if room['status'] == 'ended':
        raise HTTPException(400, "이미 종료된 방입니다.")

    count = await conn.fetchval(
        "SELECT COUNT(*) FROM dive_participants WHERE room_id=$1", room_id
    )
    if count >= room['max_participants']:
        raise HTTPException(400, "최대 인원이 초과되었습니다.")

    existing = await conn.fetchrow(
        "SELECT id FROM dive_participants WHERE room_id=$1 AND user_id=$2", room_id, user_id,
    )
    if existing:
        return {"already_joined": True}

    # 다른 활성 방에 이미 참가 중인지 확인
    other = await conn.fetchrow("""
        SELECT dp.room_id FROM dive_participants dp
        JOIN dive_rooms dr ON dp.room_id = dr.id
        WHERE dp.user_id = $1 AND dp.room_id != $2 AND dr.status != 'ended'
        LIMIT 1
    """, user_id, room_id)
    if other:
        raise HTTPException(400, "이미 다른 모임에 참가 중입니다. 나가신 후 참가해주세요.")

    row = await conn.fetchrow(
        "INSERT INTO dive_participants (room_id, user_id) VALUES ($1,$2) RETURNING *",
        room_id, user_id,
    )
    return dict(row)


@router.delete("/rooms/{room_id}/leave")
async def leave_room(
    room_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    await conn.execute(
        "DELETE FROM dive_participants WHERE room_id=$1 AND user_id=$2", room_id, user_id,
    )
    return {"left": True}


@router.get("/rooms/{room_id}/messages")
async def get_messages(room_id: int, conn=Depends(get_db)):
    rows = await conn.fetch("""
        SELECT dm.id, dm.room_id, dm.user_id, dm.content, dm.is_ai, dm.created_at,
               COALESCE(u.name, dm.user_name) AS user_name
        FROM dive_messages dm
        LEFT JOIN users u ON u.id = dm.user_id
        WHERE dm.room_id = $1
        ORDER BY dm.created_at ASC
    """, room_id)
    return [dict(r) for r in rows]


class MessageIn(BaseModel):
    content: str
    is_ai: bool = False


@router.post("/rooms/{room_id}/messages")
async def send_message(
    room_id: int,
    body: MessageIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    user = await conn.fetchrow("SELECT name FROM users WHERE id=$1", user_id)
    row = await conn.fetchrow("""
        INSERT INTO dive_messages (room_id, user_id, user_name, content, is_ai)
        VALUES ($1,$2,$3,$4,$5) RETURNING *
    """, room_id, user_id, user['name'] if user else '', body.content, body.is_ai)
    return dict(row)


@router.patch("/rooms/{room_id}/status")
async def update_room_status(
    room_id: int,
    status: str = Query(...),
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    room = await conn.fetchrow("SELECT host_id FROM dive_rooms WHERE id=$1", room_id)
    if not room or room['host_id'] != user_id:
        raise HTTPException(403, "방장만 상태를 변경할 수 있습니다.")
    row = await conn.fetchrow(
        "UPDATE dive_rooms SET status=$1 WHERE id=$2 RETURNING *", status, room_id,
    )
    return dict(row)


@router.delete("/rooms/{room_id}")
async def delete_room(
    room_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    room = await conn.fetchrow("SELECT host_id FROM dive_rooms WHERE id=$1", room_id)
    if not room or room['host_id'] != user_id:
        raise HTTPException(403, "방장만 방을 삭제할 수 있습니다.")
    await conn.execute("DELETE FROM dive_rooms WHERE id=$1", room_id)
    return {"deleted": True}
