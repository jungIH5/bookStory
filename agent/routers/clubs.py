from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor
from typing import Optional

from db import get_db

router = APIRouter(prefix="/api/clubs")


@router.get("")
def get_clubs(conn=Depends(get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM clubs ORDER BY id DESC")
        return [dict(r) for r in cur.fetchall()]


class ClubIn(BaseModel):
    name: str
    description: str = ""
    category: str = "독서/기록"
    location: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    image: str = ""


@router.post("")
def create_club(body: ClubIn, conn=Depends(get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """INSERT INTO clubs (name, description, category, location, lat, lng, image)
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (body.name, body.description, body.category, body.location,
             body.lat, body.lng, body.image),
        )
        return dict(cur.fetchone())


# 내가 참여한 모임 ID 목록 — 반드시 /{id}/... 라우트보다 앞에 정의
@router.get("/joined")
def get_joined_clubs(user_id: Optional[int] = None, conn=Depends(get_db)):
    if not user_id:
        return []
    with conn.cursor() as cur:
        cur.execute(
            "SELECT club_id FROM club_members WHERE user_id = %s", (user_id,)
        )
        return [r[0] for r in cur.fetchall()]


class MemberBody(BaseModel):
    user_id: int


@router.post("/{club_id}/join")
def join_club(club_id: int, body: MemberBody, conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO club_members (club_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (club_id, body.user_id),
        )
        if cur.rowcount > 0:
            cur.execute(
                "UPDATE clubs SET member_count = member_count + 1 WHERE id = %s", (club_id,)
            )
    return {"joined": True}


@router.delete("/{club_id}/leave")
def leave_club(club_id: int, body: MemberBody, conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM club_members WHERE club_id = %s AND user_id = %s",
            (club_id, body.user_id),
        )
        if cur.rowcount > 0:
            cur.execute(
                "UPDATE clubs SET member_count = GREATEST(member_count - 1, 0) WHERE id = %s",
                (club_id,),
            )
    return {"left": True}
