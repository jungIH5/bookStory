from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor
from typing import Optional

from db import get_db

router = APIRouter(prefix="/api/community")


@router.get("/posts")
def get_posts(user_id: Optional[str] = None, conn=Depends(get_db)):
    try:
        uid = int(user_id) if user_id else 0
    except (ValueError, TypeError):
        uid = 0
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                p.*,
                COALESCE(u.name, '익명') AS author,
                COUNT(DISTINCT pl.user_id)::int AS likes,
                COUNT(DISTINCT c.id)::int AS comments,
                EXISTS(
                    SELECT 1 FROM post_likes WHERE user_id = %s AND post_id = p.id
                ) AS liked
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN post_likes pl ON pl.post_id = p.id
            LEFT JOIN comments c ON c.post_id = p.id
            GROUP BY p.id, u.name
            ORDER BY p.created_at DESC
            """,
            (uid,),
        )
        return [dict(r) for r in cur.fetchall()]


class PostIn(BaseModel):
    title: str
    content: str
    book_title: str = ""
    user_id: Optional[int] = None


@router.post("/posts")
def create_post(body: PostIn, conn=Depends(get_db)):
    if not body.title or not body.content:
        raise HTTPException(400, "제목과 내용을 입력해주세요.")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """INSERT INTO posts (user_id, title, content, book_title)
               VALUES (%s, %s, %s, %s) RETURNING *""",
            (body.user_id, body.title, body.content, body.book_title or None),
        )
        return dict(cur.fetchone())


class LikeBody(BaseModel):
    user_id: int


@router.post("/posts/{post_id}/like")
def toggle_like(post_id: int, body: LikeBody, conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM post_likes WHERE user_id = %s AND post_id = %s",
            (body.user_id, post_id),
        )
        if cur.fetchone():
            cur.execute(
                "DELETE FROM post_likes WHERE user_id = %s AND post_id = %s",
                (body.user_id, post_id),
            )
            return {"liked": False}
        else:
            cur.execute(
                "INSERT INTO post_likes (user_id, post_id) VALUES (%s, %s)",
                (body.user_id, post_id),
            )
            return {"liked": True}
