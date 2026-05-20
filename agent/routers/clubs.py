from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor
from typing import Optional

from db import get_db

router = APIRouter(prefix="/api/clubs")


@router.get("")
def get_clubs(conn=Depends(get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT c.*,
                ROUND(COALESCE(AVG(r.rating), 0)::numeric, 1)::float AS avg_rating,
                COUNT(r.id)::int AS review_count
            FROM clubs c
            LEFT JOIN club_reviews r ON r.club_id = c.id
            GROUP BY c.id
            ORDER BY c.id DESC
        """)
        return [dict(r) for r in cur.fetchall()]


class ClubIn(BaseModel):
    name: str
    description: str = ""
    category: str = "독서/기록"
    location: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    image: str = ""
    creator_id: Optional[int] = None


@router.post("")
def create_club(body: ClubIn, conn=Depends(get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """INSERT INTO clubs (name, description, category, location, lat, lng, image, creator_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (body.name, body.description, body.category, body.location,
             body.lat, body.lng, body.image, body.creator_id),
        )
        return dict(cur.fetchone())


# 내가 참여한 모임 ID 목록 — 반드시 /{id}/... 라우트보다 앞에 정의
@router.get("/joined")
def get_joined_clubs(user_id: Optional[str] = None, conn=Depends(get_db)):
    try:
        uid = int(user_id) if user_id else None
    except (ValueError, TypeError):
        uid = None
    if not uid:
        return []
    with conn.cursor() as cur:
        cur.execute(
            "SELECT club_id FROM club_members WHERE user_id = %s", (uid,)
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


@router.get("/{club_id}/reviews")
def get_reviews(club_id: int, conn=Depends(get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT r.*, COALESCE(u.name, '익명') AS author_name
            FROM club_reviews r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.club_id = %s
            ORDER BY r.created_at DESC
            """,
            (club_id,),
        )
        return [dict(r) for r in cur.fetchall()]


class ReviewIn(BaseModel):
    user_id: int
    rating: int
    review_text: str = ""


@router.post("/{club_id}/reviews")
def create_review(club_id: int, body: ReviewIn, conn=Depends(get_db)):
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(400, "평점은 1~5 사이여야 합니다.")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO club_reviews (club_id, user_id, rating, review_text)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (club_id, user_id)
            DO UPDATE SET rating = EXCLUDED.rating, review_text = EXCLUDED.review_text,
                          created_at = CURRENT_TIMESTAMP
            RETURNING *
            """,
            (club_id, body.user_id, body.rating, body.review_text),
        )
        return dict(cur.fetchone())
