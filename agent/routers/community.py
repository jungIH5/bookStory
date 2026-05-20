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


@router.get("/posts/{post_id}")
def get_post(post_id: int, user_id: Optional[str] = None, conn=Depends(get_db)):
    try:
        uid = int(user_id) if user_id else 0
    except (ValueError, TypeError):
        uid = 0
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT p.*, COALESCE(u.name, '익명') AS author,
                COUNT(DISTINCT pl.user_id)::int AS likes,
                COUNT(DISTINCT c.id)::int AS comments,
                EXISTS(SELECT 1 FROM post_likes WHERE user_id = %s AND post_id = p.id) AS liked
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN post_likes pl ON pl.post_id = p.id
            LEFT JOIN comments c ON c.post_id = p.id
            WHERE p.id = %s
            GROUP BY p.id, u.name
            """,
            (uid, post_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "게시물을 찾을 수 없습니다.")
        return dict(row)


@router.get("/posts/{post_id}/comments")
def get_comments(post_id: int, conn=Depends(get_db)):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT c.id, c.post_id, c.user_id, c.content, c.parent_comment_id, c.created_at,
                   COALESCE(u.name, '익명') AS author
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.post_id = %s
            ORDER BY c.created_at ASC
            """,
            (post_id,),
        )
        return [dict(r) for r in cur.fetchall()]


class CommentIn(BaseModel):
    content: str
    user_id: Optional[int] = None
    parent_comment_id: Optional[int] = None


@router.post("/posts/{post_id}/comments")
def create_comment(post_id: int, body: CommentIn, conn=Depends(get_db)):
    if not body.content or not body.content.strip():
        raise HTTPException(400, "댓글 내용을 입력해주세요.")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """INSERT INTO comments (post_id, user_id, content, parent_comment_id)
               VALUES (%s, %s, %s, %s) RETURNING *""",
            (post_id, body.user_id, body.content.strip(), body.parent_comment_id),
        )
        row = cur.fetchone()
        # author 추가
        if body.user_id:
            cur.execute("SELECT name FROM users WHERE id = %s", (body.user_id,))
            u = cur.fetchone()
            row = dict(row)
            row["author"] = u["name"] if u else "익명"
        else:
            row = dict(row)
            row["author"] = "익명"
        return row


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
