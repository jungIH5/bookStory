from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from db import get_db
from auth import get_current_user_id, optional_user_id

router = APIRouter(prefix="/api/community")


@router.get("/posts")
async def get_posts(
    page: int = 1,
    limit: int = 20,
    conn=Depends(get_db),
    uid: Optional[int] = Depends(optional_user_id),
):
    offset = (max(1, page) - 1) * limit
    rows = await conn.fetch(
        """
        SELECT p.*,
            COALESCE(u.name, '익명') AS author,
            u.profile_image AS author_image,
            COUNT(DISTINCT pl.user_id)::int AS likes,
            COUNT(DISTINCT c.id)::int AS comments,
            EXISTS(SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = p.id) AS liked
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN post_likes pl ON pl.post_id = p.id
        LEFT JOIN comments c ON c.post_id = p.id
        GROUP BY p.id, u.name, u.profile_image
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
        """,
        uid or 0, limit, offset,
    )
    total = await conn.fetchval("SELECT COUNT(*) FROM posts")
    return {"posts": [dict(r) for r in rows], "total": total, "page": page, "limit": limit}


class PostIn(BaseModel):
    title: str
    content: str
    book_title: str = ""


@router.post("/posts")
async def create_post(
    body: PostIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    if not body.title or not body.content:
        raise HTTPException(400, "제목과 내용을 입력해주세요.")
    row = await conn.fetchrow(
        "INSERT INTO posts (user_id, title, content, book_title) VALUES ($1,$2,$3,$4) RETURNING *",
        user_id, body.title, body.content, body.book_title or None,
    )
    return dict(row)


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow("SELECT user_id FROM posts WHERE id = $1", post_id)
    if not row:
        raise HTTPException(404, "게시물을 찾을 수 없습니다.")
    if row["user_id"] != user_id:
        raise HTTPException(403, "삭제 권한이 없습니다.")
    await conn.execute("DELETE FROM posts WHERE id = $1", post_id)
    return {"deleted": True, "id": post_id}


@router.get("/posts/{post_id}")
async def get_post(
    post_id: int,
    conn=Depends(get_db),
    uid: Optional[int] = Depends(optional_user_id),
):
    row = await conn.fetchrow(
        """
        SELECT p.*, COALESCE(u.name, '익명') AS author,
            u.profile_image AS author_image,
            COUNT(DISTINCT pl.user_id)::int AS likes,
            COUNT(DISTINCT c.id)::int AS comments,
            EXISTS(SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = p.id) AS liked
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN post_likes pl ON pl.post_id = p.id
        LEFT JOIN comments c ON c.post_id = p.id
        WHERE p.id = $2
        GROUP BY p.id, u.name, u.profile_image
        """,
        uid or 0, post_id,
    )
    if not row:
        raise HTTPException(404, "게시물을 찾을 수 없습니다.")
    return dict(row)


@router.get("/posts/{post_id}/comments")
async def get_comments(post_id: int, conn=Depends(get_db)):
    rows = await conn.fetch(
        """
        SELECT c.id, c.post_id, c.user_id, c.content, c.parent_comment_id, c.created_at,
               COALESCE(u.name, '익명') AS author,
               u.profile_image AS author_image
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.post_id = $1
        ORDER BY c.created_at ASC
        """,
        post_id,
    )
    return [dict(r) for r in rows]


class CommentIn(BaseModel):
    content: str
    parent_comment_id: Optional[int] = None


@router.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: int,
    body: CommentIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    if not body.content or not body.content.strip():
        raise HTTPException(400, "댓글 내용을 입력해주세요.")
    row = await conn.fetchrow(
        "INSERT INTO comments (post_id, user_id, content, parent_comment_id) VALUES ($1,$2,$3,$4) RETURNING *",
        post_id, user_id, body.content.strip(), body.parent_comment_id,
    )
    result = dict(row)
    user_row = await conn.fetchrow("SELECT name, profile_image FROM users WHERE id = $1", user_id)
    result["author"] = user_row["name"] if user_row else "익명"
    result["author_image"] = user_row["profile_image"] if user_row else None
    return result


class CommentUpdate(BaseModel):
    content: str


@router.patch("/posts/{post_id}/comments/{comment_id}")
async def update_comment(
    post_id: int,
    comment_id: int,
    body: CommentUpdate,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    if not body.content or not body.content.strip():
        raise HTTPException(400, "댓글 내용을 입력해주세요.")
    row = await conn.fetchrow(
        "SELECT user_id FROM comments WHERE id = $1 AND post_id = $2", comment_id, post_id
    )
    if not row:
        raise HTTPException(404, "댓글을 찾을 수 없습니다.")
    if row["user_id"] != user_id:
        raise HTTPException(403, "수정 권한이 없습니다.")
    updated = await conn.fetchrow(
        "UPDATE comments SET content = $1 WHERE id = $2 RETURNING *",
        body.content.strip(), comment_id,
    )
    return dict(updated)


@router.delete("/posts/{post_id}/comments/{comment_id}")
async def delete_comment(
    post_id: int,
    comment_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow(
        "SELECT user_id FROM comments WHERE id = $1 AND post_id = $2", comment_id, post_id
    )
    if not row:
        raise HTTPException(404, "댓글을 찾을 수 없습니다.")
    if row["user_id"] != user_id:
        raise HTTPException(403, "삭제 권한이 없습니다.")
    await conn.execute("DELETE FROM comments WHERE id = $1", comment_id)
    return {"deleted": True, "id": comment_id}


@router.post("/posts/{post_id}/like")
async def toggle_like(
    post_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    existing = await conn.fetchrow(
        "SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = $2", user_id, post_id
    )
    if existing:
        await conn.execute(
            "DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2", user_id, post_id
        )
        return {"liked": False}
    else:
        await conn.execute(
            "INSERT INTO post_likes (user_id, post_id) VALUES ($1,$2)", user_id, post_id
        )
        return {"liked": True}
