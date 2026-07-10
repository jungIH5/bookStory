import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from db import get_db
from auth import create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

KAKAO_CLIENT_ID = os.getenv("KAKAO_CLIENT_ID", "")
NAVER_CLIENT_ID = os.getenv("NAVER_OAUTH_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_OAUTH_CLIENT_SECRET", "")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")


@router.post("/kakao/callback")
async def kakao_callback(code: str = Query(...), conn=Depends(get_db)):
    if not KAKAO_CLIENT_ID:
        raise HTTPException(400, "카카오 OAuth가 설정되지 않았습니다.")

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://kauth.kakao.com/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": KAKAO_CLIENT_ID,
                "redirect_uri": os.getenv("FRONTEND_URL", "http://localhost:8080"),
                "code": code,
            },
        )
        if not token_res.is_success:
            raise HTTPException(400, "카카오 토큰 교환 실패")

        access_token = token_res.json().get("access_token")
        user_res = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if not user_res.is_success:
            raise HTTPException(400, "카카오 사용자 정보 조회 실패")

        d = user_res.json()
        oauth_id = str(d["id"])
        account = d.get("kakao_account", {})
        name = account.get("profile", {}).get("nickname") or f"카카오{oauth_id[:6]}"
        email = account.get("email", "") or None

    return await _get_or_create(conn, "kakao", oauth_id, name, email)


@router.post("/naver/callback")
async def naver_callback(code: str = Query(...), conn=Depends(get_db)):
    if not NAVER_CLIENT_ID:
        raise HTTPException(400, "네이버 OAuth가 설정되지 않았습니다.")

    async with httpx.AsyncClient() as client:
        token_res = await client.get(
            "https://nid.naver.com/oauth2.0/token",
            params={
                "grant_type": "authorization_code",
                "client_id": NAVER_CLIENT_ID,
                "client_secret": NAVER_CLIENT_SECRET,
                "redirect_uri": os.getenv("FRONTEND_URL", "http://localhost:8080"),
                "code": code,
                "state": "bookstory",
            },
        )
        if not token_res.is_success:
            raise HTTPException(400, "네이버 토큰 교환 실패")

        access_token = token_res.json().get("access_token")
        user_res = await client.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if not user_res.is_success:
            raise HTTPException(400, "네이버 사용자 정보 조회 실패")

        d = user_res.json().get("response", {})
        oauth_id = d.get("id", "")
        name = d.get("name") or d.get("nickname") or f"네이버{oauth_id[:6]}"
        email = d.get("email") or None

    return await _get_or_create(conn, "naver", oauth_id, name, email)


@router.post("/google/callback")
async def google_callback(code: str = Query(...), conn=Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(400, "구글 OAuth가 설정되지 않았습니다.")

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": os.getenv("FRONTEND_URL", "http://localhost:8080"),
                "grant_type": "authorization_code",
            },
        )
        if not token_res.is_success:
            raise HTTPException(400, "구글 토큰 교환 실패")

        access_token = token_res.json().get("access_token")
        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if not user_res.is_success:
            raise HTTPException(400, "구글 사용자 정보 조회 실패")

        d = user_res.json()
        oauth_id = d.get("id", "")
        name = d.get("name") or f"구글{oauth_id[:6]}"
        email = d.get("email") or None

    return await _get_or_create(conn, "google", oauth_id, name, email)


async def _get_or_create(conn, provider: str, oauth_id: str, name: str, email):
    row = await conn.fetchrow(
        "SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2",
        provider, oauth_id,
    )

    if not row and email:
        row = await conn.fetchrow(
            "SELECT * FROM users WHERE email = $1", email
        )
        if row:
            row = await conn.fetchrow(
                "UPDATE users SET oauth_provider=$1, oauth_id=$2 WHERE id=$3 RETURNING *",
                provider, oauth_id, row["id"],
            )

    if not row:
        row = await conn.fetchrow(
            "INSERT INTO users (name, oauth_provider, oauth_id, email) VALUES ($1,$2,$3,$4) RETURNING *",
            name, provider, oauth_id, email,
        )

    token = create_token(row["id"])
    user_dict = {k: v for k, v in dict(row).items() if k not in ("oauth_id", "password_hash")}
    return {"token": token, "user": user_dict}
