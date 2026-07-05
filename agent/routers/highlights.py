from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from db import get_db
from auth import get_current_user_id

router = APIRouter(prefix="/api/highlights", tags=["highlights"])


class HighlightIn(BaseModel):
    read_book_id: int
    text: str
    page_num: Optional[int] = None


@router.get("")
async def get_highlights(
    read_book_id: int = Query(...),
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    rows = await conn.fetch(
        "SELECT * FROM highlights WHERE read_book_id=$1 AND user_id=$2 ORDER BY created_at DESC",
        read_book_id, user_id,
    )
    return [dict(r) for r in rows]


@router.post("")
async def save_highlight(
    body: HighlightIn,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow(
        "INSERT INTO highlights (user_id, read_book_id, text, page_num) VALUES ($1,$2,$3,$4) RETURNING *",
        user_id, body.read_book_id, body.text.strip(), body.page_num,
    )
    return dict(row)


@router.delete("/{highlight_id}")
async def delete_highlight(
    highlight_id: int,
    conn=Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    row = await conn.fetchrow(
        "SELECT id FROM highlights WHERE id=$1 AND user_id=$2", highlight_id, user_id,
    )
    if not row:
        raise HTTPException(404, "문장을 찾을 수 없습니다.")
    await conn.execute("DELETE FROM highlights WHERE id=$1", highlight_id)
    return {"deleted": True}
