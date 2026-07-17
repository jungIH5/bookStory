from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from db import get_db, get_pool
from auth import get_current_user_id, decode_token

router = APIRouter(prefix="/api/dive", tags=["dive"])


class _DiveChatManager:
    """방별 웹소켓 연결을 관리하고 새 메시지를 실시간으로 push한다."""

    def __init__(self):
        self.rooms: dict[int, dict[int, set]] = {}

    def connect(self, room_id: int, user_id: int, ws: WebSocket):
        self.rooms.setdefault(room_id, {}).setdefault(user_id, set()).add(ws)

    def disconnect(self, room_id: int, user_id: int, ws: WebSocket):
        conns = self.rooms.get(room_id, {}).get(user_id)
        if not conns:
            return
        conns.discard(ws)
        if not conns:
            self.rooms[room_id].pop(user_id, None)
        if room_id in self.rooms and not self.rooms[room_id]:
            self.rooms.pop(room_id, None)

    async def broadcast(self, room_id: int, message: dict):
        room = self.rooms.get(room_id)
        if not room:
            return
        to_user_id = message.get("to_user_id")
        sender_id = message.get("user_id")
        target_ids = room.keys() if not to_user_id else {to_user_id, sender_id}
        payload = jsonable_encoder({**message, "type": "chat"})
        for uid in list(target_ids):
            for ws in list(room.get(uid, [])):
                try:
                    await ws.send_json(payload)
                except Exception:
                    pass

    async def broadcast_event(self, room_id: int, event: dict):
        """참가자 입/퇴장, 상태 변경 등 방 정보가 바뀌었음을 모든 연결에 알린다(재조회 트리거용)."""
        room = self.rooms.get(room_id)
        if not room:
            return
        payload = jsonable_encoder(event)
        for uid, conns in list(room.items()):
            for ws in list(conns):
                try:
                    await ws.send_json(payload)
                except Exception:
                    pass


chat_manager = _DiveChatManager()


@router.websocket("/rooms/{room_id}/ws")
async def dive_chat_ws(websocket: WebSocket, room_id: int, token: str = Query(...)):
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4401)
        return
    pool = get_pool()
    is_participant = await pool.fetchval(
        "SELECT 1 FROM dive_participants WHERE room_id=$1 AND user_id=$2", room_id, user_id,
    )
    if not is_participant:
        await websocket.close(code=4403)
        return
    await websocket.accept()
    chat_manager.connect(room_id, user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        chat_manager.disconnect(room_id, user_id, websocket)


def _naive(dt):
    return dt.replace(tzinfo=None) if dt and dt.tzinfo else dt


def _elapsed_reading_seconds(participant, room) -> int:
    """참가자의 누적 독서 시간(초). 방의 실제 '독서' 구간(scheduled_at ~ scheduled_at+reading_minutes)과
    겹치는 시간만 계산한다 — 대기/토론/시간종료 구간에 머문 시간은 제외한다."""
    total = participant["reading_seconds"] or 0
    if participant["status"] != "reading":
        return total
    reading_start = _naive(room["scheduled_at"])
    reading_end = reading_start + timedelta(minutes=room["reading_minutes"] or 0)
    overlap_start = max(participant["status_changed_at"], reading_start)
    overlap_end = min(datetime.now(), reading_end)
    if overlap_end > overlap_start:
        total += int((overlap_end - overlap_start).total_seconds())
    return total


async def _log_reading_time(conn, user_id: int, book_title, book_isbn, seconds: int):
    """독서 시간을 개인 reading_logs에 기록. 본인 서재에 일치하는 책이 있으면 연결한다."""
    if seconds <= 0:
        return
    read_book_id = None
    if book_isbn:
        read_book_id = await conn.fetchval(
            "SELECT id FROM read_books WHERE user_id=$1 AND isbn=$2 LIMIT 1", user_id, book_isbn,
        )
    if not read_book_id and book_title:
        read_book_id = await conn.fetchval(
            "SELECT id FROM read_books WHERE user_id=$1 AND title=$2 LIMIT 1", user_id, book_title,
        )
    await conn.execute(
        "INSERT INTO reading_logs (user_id, read_book_id, duration_seconds) VALUES ($1,$2,$3)",
        user_id, read_book_id, seconds,
    )


async def _finalize_participant(conn, room, participant, mark_ended: bool):
    """참가자의 독서 시간을 확정 기록하고, 세션 종료면 상태만 고정하고 추방/퇴장이면 행을 삭제한다."""
    seconds = _elapsed_reading_seconds(participant, room)
    book_title = participant["book_title"] or room["book_title"] or None
    book_isbn = participant["book_isbn"] or room["book_isbn"] or None
    await _log_reading_time(conn, participant["user_id"], book_title, book_isbn, seconds)
    if mark_ended:
        await conn.execute(
            "UPDATE dive_participants SET status='ended', reading_seconds=$1, status_changed_at=CURRENT_TIMESTAMP WHERE id=$2",
            seconds, participant["id"],
        )
    else:
        await conn.execute("DELETE FROM dive_participants WHERE id=$1", participant["id"])


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
               u.profile_image AS host_image,
               COUNT(p.id)::int AS participant_count
        FROM dive_rooms r
        LEFT JOIN users u ON u.id = r.host_id
        LEFT JOIN dive_participants p ON p.room_id = r.id
        WHERE r.status != 'ended'
        GROUP BY r.id, u.name, u.profile_image
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


@router.get("/rooms/active")
async def get_active_room(conn=Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """현재 활성 상태로 참여 중인 방(나가지도, 방이 종료되지도 않은)을 반환한다. 없으면 null."""
    row = await conn.fetchrow("""
        SELECT r.*, COALESCE(u.name, r.host_name) AS host_name,
               u.profile_image AS host_image,
               COUNT(DISTINCT p.id)::int AS participant_count
        FROM dive_rooms r
        JOIN dive_participants dp ON dp.room_id = r.id AND dp.user_id = $1 AND dp.status != 'ended'
        LEFT JOIN users u ON u.id = r.host_id
        LEFT JOIN dive_participants p ON p.room_id = r.id
        WHERE r.status != 'ended'
        GROUP BY r.id, u.name, u.profile_image
        LIMIT 1
    """, user_id)
    if not row:
        return None
    participants = await conn.fetch("""
        SELECT p.id, p.user_id, p.status, p.book_title, p.book_image, p.book_isbn, p.reading_seconds,
               u.name, u.profile_image
        FROM dive_participants p
        JOIN users u ON u.id = p.user_id
        WHERE p.room_id = $1
        ORDER BY p.joined_at ASC
    """, row["id"])
    result = dict(row)
    result["participants"] = [dict(p) for p in participants]
    return result


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
               u.profile_image AS host_image,
               COUNT(p.id)::int AS participant_count
        FROM dive_rooms r
        LEFT JOIN users u ON u.id = r.host_id
        LEFT JOIN dive_participants p ON p.room_id = r.id
        WHERE r.id = $1
        GROUP BY r.id, u.name, u.profile_image
    """, room_id)
    if not row:
        raise HTTPException(404, "방을 찾을 수 없습니다.")
    participants = await conn.fetch("""
        SELECT p.id, p.user_id, p.status, p.book_title, p.book_image, p.book_isbn, p.reading_seconds,
               u.name, u.profile_image
        FROM dive_participants p
        JOIN users u ON u.id = p.user_id
        WHERE p.room_id = $1
        ORDER BY p.joined_at ASC
    """, room_id)
    result = dict(row)
    result['participants'] = [dict(p) for p in participants]
    return result


class JoinRoomIn(BaseModel):
    book_title: Optional[str] = None
    book_image: Optional[str] = None
    book_isbn: Optional[str] = None


@router.post("/rooms/{room_id}/join")
async def join_room(
    room_id: int,
    body: Optional[JoinRoomIn] = None,
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

    book_title = book_image = book_isbn = ''
    if not room['book_title']:
        if not body or not body.book_title:
            raise HTTPException(400, "이 모임은 지정된 도서가 없어 참가 시 읽으실 책을 선택해야 합니다.")
        book_title, book_image, book_isbn = body.book_title, body.book_image or '', body.book_isbn or ''

    row = await conn.fetchrow(
        """INSERT INTO dive_participants (room_id, user_id, book_title, book_image, book_isbn)
           VALUES ($1,$2,$3,$4,$5) RETURNING *""",
        room_id, user_id, book_title, book_image, book_isbn,
    )
    await chat_manager.broadcast_event(room_id, {"type": "room_update"})
    return dict(row)


@router.delete("/rooms/{room_id}/leave")
async def leave_room(
    room_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    room = await conn.fetchrow("SELECT * FROM dive_rooms WHERE id=$1", room_id)
    participant = await conn.fetchrow(
        "SELECT * FROM dive_participants WHERE room_id=$1 AND user_id=$2", room_id, user_id,
    )
    if room and participant:
        await _finalize_participant(conn, room, participant, mark_ended=False)
        await chat_manager.broadcast_event(room_id, {"type": "room_update"})
    return {"left": True}


@router.delete("/rooms/{room_id}/participants/{target_user_id}")
async def kick_participant(
    room_id: int,
    target_user_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    room = await conn.fetchrow("SELECT * FROM dive_rooms WHERE id=$1", room_id)
    if not room or room["host_id"] != user_id:
        raise HTTPException(403, "방장만 추방할 수 있습니다.")
    if target_user_id == user_id:
        raise HTTPException(400, "본인을 추방할 수 없습니다.")
    participant = await conn.fetchrow(
        "SELECT * FROM dive_participants WHERE room_id=$1 AND user_id=$2", room_id, target_user_id,
    )
    if not participant:
        raise HTTPException(404, "참가자를 찾을 수 없습니다.")
    await _finalize_participant(conn, room, participant, mark_ended=False)
    await chat_manager.broadcast_event(room_id, {"type": "room_update"})
    return {"kicked": True}


class MyStatusIn(BaseModel):
    status: str  # 'reading' | 'paused'


@router.patch("/rooms/{room_id}/my-status")
async def update_my_status(
    room_id: int,
    body: MyStatusIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    if body.status not in ("reading", "paused"):
        raise HTTPException(400, "잘못된 상태값입니다.")
    room = await conn.fetchrow("SELECT * FROM dive_rooms WHERE id=$1", room_id)
    if not room:
        raise HTTPException(404, "방을 찾을 수 없습니다.")
    participant = await conn.fetchrow(
        "SELECT * FROM dive_participants WHERE room_id=$1 AND user_id=$2", room_id, user_id,
    )
    if not participant:
        raise HTTPException(404, "참가자 정보를 찾을 수 없습니다.")
    if participant["status"] == "ended":
        raise HTTPException(400, "이미 종료된 세션입니다.")
    seconds = _elapsed_reading_seconds(participant, room)
    row = await conn.fetchrow(
        "UPDATE dive_participants SET status=$1, reading_seconds=$2, status_changed_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *",
        body.status, seconds, participant["id"],
    )
    await chat_manager.broadcast_event(room_id, {"type": "room_update"})
    return dict(row)


@router.get("/rooms/{room_id}/messages")
async def get_messages(
    room_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    participant = await conn.fetchrow(
        "SELECT 1 FROM dive_participants WHERE room_id=$1 AND user_id=$2", room_id, user_id,
    )
    if not participant:
        raise HTTPException(403, "참가자만 채팅을 볼 수 있습니다.")
    rows = await conn.fetch("""
        SELECT dm.id, dm.room_id, dm.user_id, dm.to_user_id, dm.content, dm.is_ai, dm.created_at,
               COALESCE(u.name, dm.user_name) AS user_name,
               u.profile_image AS user_image,
               tu.name AS to_user_name
        FROM dive_messages dm
        LEFT JOIN users u ON u.id = dm.user_id
        LEFT JOIN users tu ON tu.id = dm.to_user_id
        WHERE dm.room_id = $1
          AND (dm.to_user_id IS NULL OR dm.to_user_id = $2 OR dm.user_id = $2)
        ORDER BY dm.created_at ASC
    """, room_id, user_id)
    return [dict(r) for r in rows]


class MessageIn(BaseModel):
    content: str
    is_ai: bool = False
    to_user_id: Optional[int] = None  # 지정 시 귓속말(해당 유저 + 본인에게만 노출)


@router.post("/rooms/{room_id}/messages")
async def send_message(
    room_id: int,
    body: MessageIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    sender = await conn.fetchrow(
        "SELECT 1 FROM dive_participants WHERE room_id=$1 AND user_id=$2", room_id, user_id,
    )
    if not sender:
        raise HTTPException(403, "참가자만 채팅을 보낼 수 있습니다.")
    if body.to_user_id:
        if body.to_user_id == user_id:
            raise HTTPException(400, "자기 자신에게 귓속말을 보낼 수 없습니다.")
        participant = await conn.fetchrow(
            "SELECT 1 FROM dive_participants WHERE room_id=$1 AND user_id=$2",
            room_id, body.to_user_id,
        )
        if not participant:
            raise HTTPException(400, "해당 참가자를 찾을 수 없습니다.")
        blocked = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM user_blocks
                WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)
            )
        """, user_id, body.to_user_id)
        if blocked:
            raise HTTPException(403, "차단 관계로 인해 귓속말을 보낼 수 없습니다.")
        allow_whisper = await conn.fetchval(
            "SELECT allow_whisper FROM users WHERE id=$1", body.to_user_id,
        )
        if allow_whisper is False:
            raise HTTPException(403, "상대방이 귓속말을 거부했습니다.")

    user = await conn.fetchrow("SELECT name, profile_image FROM users WHERE id=$1", user_id)
    row = await conn.fetchrow("""
        INSERT INTO dive_messages (room_id, user_id, user_name, content, is_ai, to_user_id)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    """, room_id, user_id, user['name'] if user else '', body.content, body.is_ai, body.to_user_id)
    result = dict(row)
    result["user_image"] = user["profile_image"] if user else None
    await chat_manager.broadcast(room_id, result)
    return result


@router.patch("/rooms/{room_id}/status")
async def update_room_status(
    room_id: int,
    status: str = Query(...),
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    room = await conn.fetchrow("SELECT * FROM dive_rooms WHERE id=$1", room_id)
    if not room or room['host_id'] != user_id:
        raise HTTPException(403, "방장만 상태를 변경할 수 있습니다.")

    if status == "ended":
        participants = await conn.fetch(
            "SELECT * FROM dive_participants WHERE room_id=$1 AND status != 'ended'", room_id,
        )
        for p in participants:
            await _finalize_participant(conn, room, p, mark_ended=True)

    row = await conn.fetchrow(
        "UPDATE dive_rooms SET status=$1 WHERE id=$2 RETURNING *", status, room_id,
    )
    await chat_manager.broadcast_event(room_id, {"type": "room_update"})
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
