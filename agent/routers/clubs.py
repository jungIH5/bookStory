from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from db import get_db
from auth import get_current_user_id

router = APIRouter(prefix="/api/clubs")


@router.get("")
async def get_clubs(
    category: Optional[str] = None,
    search: Optional[str] = None,
    conn=Depends(get_db),
):
    conditions = []
    args: list = []
    n = 1

    if category:
        conditions.append(f"c.category = ${n}")
        args.append(category)
        n += 1
    if search:
        conditions.append(f"c.name ILIKE ${n}")
        args.append(f"%{search}%")
        n += 1

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = await conn.fetch(
        f"""
        SELECT c.*,
            COUNT(DISTINCT cm.user_id)::int AS member_count,
            ROUND(COALESCE(AVG(r.rating), 0)::numeric, 1)::float AS avg_rating,
            COUNT(DISTINCT r.id)::int AS review_count
        FROM clubs c
        LEFT JOIN club_members cm ON cm.club_id = c.id
        LEFT JOIN club_reviews r ON r.club_id = c.id
        {where}
        GROUP BY c.id
        ORDER BY c.id DESC
        """,
        *args,
    )
    return [dict(r) for r in rows]


class ClubIn(BaseModel):
    name: str
    description: str = ""
    category: str = "독서/기록"
    location: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    image: str = ""


@router.post("")
async def create_club(
    body: ClubIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow(
        """INSERT INTO clubs (name, description, category, location, lat, lng, image, creator_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *""",
        body.name, body.description, body.category, body.location,
        body.lat, body.lng, body.image, user_id,
    )
    return dict(row)


@router.get("/joined")
async def get_joined_clubs(user_id: Optional[int] = None, conn=Depends(get_db)):
    if not user_id:
        return []
    rows = await conn.fetch(
        "SELECT club_id FROM club_members WHERE user_id = $1", user_id
    )
    return [r["club_id"] for r in rows]


@router.post("/{club_id}/join")
async def join_club(
    club_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    await conn.execute(
        "INSERT INTO club_members (club_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        club_id, user_id,
    )
    return {"joined": True}


@router.delete("/{club_id}/leave")
async def leave_club(
    club_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    await conn.execute(
        "DELETE FROM club_members WHERE club_id = $1 AND user_id = $2",
        club_id, user_id,
    )
    return {"left": True}


@router.get("/{club_id}/reviews")
async def get_reviews(club_id: int, conn=Depends(get_db)):
    rows = await conn.fetch(
        """
        SELECT r.*, COALESCE(u.name, '익명') AS author_name, u.profile_image AS author_image
        FROM club_reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.club_id = $1
        ORDER BY r.created_at DESC
        """,
        club_id,
    )
    return [dict(r) for r in rows]


class ReviewIn(BaseModel):
    rating: int
    review_text: str = ""


@router.post("/{club_id}/reviews")
async def create_review(
    club_id: int,
    body: ReviewIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(400, "평점은 1~5 사이여야 합니다.")
    row = await conn.fetchrow(
        """
        INSERT INTO club_reviews (club_id, user_id, rating, review_text)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (club_id, user_id)
        DO UPDATE SET rating = EXCLUDED.rating, review_text = EXCLUDED.review_text,
                      created_at = CURRENT_TIMESTAMP
        RETURNING *
        """,
        club_id, user_id, body.rating, body.review_text,
    )
    return dict(row)
