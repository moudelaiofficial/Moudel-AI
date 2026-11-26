
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers.search.routes import router as search_router

import httpx

from fastapi import Depends, Header, HTTPException

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://moudel-ai.vercel.app",
        "https://moudelai.com",
        "https://www.moudelai.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    search_router,
    prefix=f"{settings.api_v1_prefix}/search",
    tags=["Research Search"],
)



@app.delete("/api/v1/account")
async def delete_account(
    authorization: str | None = Header(default=None)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header.",
        )

    access_token = authorization.removeprefix("Bearer ").strip()

    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Missing access token.",
        )

    base_url = settings.supabase_url.rstrip("/")
    secret_key = settings.supabase_secret_key

    headers = {
        "apikey": secret_key,
        "Content-Type": "application/json",
    }

    timeout = httpx.Timeout(20.0)

    async with httpx.AsyncClient(timeout=timeout) as client:

        # 1. Verify the user's Supabase access token.
        try:
            auth_response = await client.get(
                f"{base_url}/auth/v1/user",
                headers={
                    **headers,
                    "Authorization": f"Bearer {access_token}",
                },
            )
            auth_response.raise_for_status()
            user = auth_response.json()

        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in (401, 403):
                raise HTTPException(
                    status_code=401,
                    detail="Your session is invalid or expired. Please log in again.",
                ) from exc

            raise HTTPException(
                status_code=502,
                detail="Unable to verify your account.",
            ) from exc

        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503,
                detail="Unable to connect to authentication service.",
            ) from exc

        user_id = user.get("id")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Unable to identify authenticated user.",
            )

        # 2. Delete only records belonging to this user.
        # Deleting collections also cascades collection_papers.
        deletion_targets = [
            ("saved_papers", "user_id"),
            ("research_activity", "user_id"),
            ("user_preferences", "user_id"),
            ("profiles", "id"),
            ("collections", "user_id"),
        ]

        try:
            for table, owner_column in deletion_targets:
                response = await client.delete(
                    f"{base_url}/rest/v1/{table}",
                    headers={
                        **headers,
                        "Authorization": f"Bearer {secret_key}",
                        "Prefer": "return=minimal",
                    },
                    params={
                        owner_column: f"eq.{user_id}",
                    },
                )
                response.raise_for_status()

        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Account data cleanup could not be completed. "
                    "Your authentication account has not been deleted. "
                    "Please retry or contact support."
                ),
            ) from exc

        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Unable to complete account data cleanup. "
                    "Please retry."
                ),
            ) from exc

        # 3. Delete the Supabase Auth account.
        # user_consents is removed by its ON DELETE CASCADE foreign key.
        try:
            delete_response = await client.delete(
                f"{base_url}/auth/v1/admin/users/{user_id}",
                headers={
                    **headers,
                    "Authorization": f"Bearer {secret_key}",
                },
            )
            delete_response.raise_for_status()

        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Your personal data cleanup was completed, "
                    "but authentication account deletion failed. "
                    "Please contact support to finish the process."
                ),
            ) from exc

        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Your personal data cleanup was completed, "
                    "but authentication account deletion could not be confirmed. "
                    "Please contact support."
                ),
            ) from exc

    return {
        "success": True,
        "message": "Your account and associated personal data have been deleted.",
    }



@app.get("/health/live", tags=["Health"])
async def liveness():
    return {"status": "ok"}


@app.get("/health/ready", tags=["Health"])
async def readiness():
    return {"status": "ok"}
