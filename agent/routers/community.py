from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from db import get_db, get_pool
from auth import get_current_user_id, optional_user_id
from nodes.infer_book_from_post import infer_book_title_from_post, resolve_book_by_title

router = APIRouter(prefix="/api/community")


async def _infer_and_tag_post(post_id: int, title: str, content: str):
    """책을 명시적으로 고르지 않고 쓴 글에서 AI가 책을 추정해 태그를 단다(미확인 상태)."""
    try:
        guess = await infer_book_title_from_post(title, content)
        if not guess:
            return
        book = await resolve_book_by_title(guess)
        if not book:
            return
        pool = get_pool()
        await pool.execute(
            """UPDATE posts SET book_title=$1, book_isbn=$2, book_image=$3,
                   book_tag_source='ai', book_tag_confirmed=false
               WHERE id=$4 AND book_isbn=''""",
            book["title"], book["isbn"], book["image"], post_id,
        )
    except Exception:
        pass


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
    book_isbn: str = ""
    book_image: str = ""


@router.post("/posts")
async def create_post(
    body: PostIn,
    background_tasks: BackgroundTasks,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    if not body.title or not body.content:
        raise HTTPException(400, "제목과 내용을 입력해주세요.")
    manually_tagged = bool(body.book_isbn)
    row = await conn.fetchrow(
        """INSERT INTO posts (user_id, title, content, book_title, book_isbn, book_image, book_tag_source, book_tag_confirmed)
           VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING *""",
        user_id, body.title, body.content, body.book_title or None,
        body.book_isbn or '', body.book_image or '', 'manual' if manually_tagged else '',
    )
    if not manually_tagged:
        background_tasks.add_task(_infer_and_tag_post, row["id"], body.title, body.content)
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


class BookTagAction(BaseModel):
    action: str  # 'confirm' | 'dismiss' | 'edit'
    book_title: Optional[str] = None
    book_isbn: Optional[str] = None
    book_image: Optional[str] = None


@router.patch("/posts/{post_id}/book-tag")
async def update_book_tag(
    post_id: int,
    body: BookTagAction,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow("SELECT user_id FROM posts WHERE id = $1", post_id)
    if not row:
        raise HTTPException(404, "게시물을 찾을 수 없습니다.")
    if row["user_id"] != user_id:
        raise HTTPException(403, "권한이 없습니다.")

    if body.action == "confirm":
        updated = await conn.fetchrow(
            "UPDATE posts SET book_tag_confirmed=TRUE WHERE id=$1 RETURNING *", post_id,
        )
    elif body.action == "dismiss":
        updated = await conn.fetchrow(
            """UPDATE posts SET book_title=NULL, book_isbn='', book_image='',
                   book_tag_source='', book_tag_confirmed=TRUE WHERE id=$1 RETURNING *""",
            post_id,
        )
    elif body.action == "edit":
        if not body.book_title:
            raise HTTPException(400, "책 제목이 필요합니다.")
        updated = await conn.fetchrow(
            """UPDATE posts SET book_title=$1, book_isbn=$2, book_image=$3,
                   book_tag_source='manual', book_tag_confirmed=TRUE WHERE id=$4 RETURNING *""",
            body.book_title, body.book_isbn or '', body.book_image or '', post_id,
        )
    else:
        raise HTTPException(400, "잘못된 action입니다.")
    return dict(updated)


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
