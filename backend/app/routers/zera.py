
import httpx

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.zera import answer_research_question


router = APIRouter()


class ZeraChatRequest(BaseModel):
    message: str = Field(min_length=3, max_length=2000)


async def verify_supabase_token(token: str):
    settings = get_settings()

    headers = {
        "apikey": settings.supabase_publishable_key,
        "Authorization": f"Bearer {token}",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
                headers=headers,
            )

            response.raise_for_status()

            user = response.json()

            if not user.get("id"):
                raise HTTPException(
                    status_code=401,
                    detail="Invalid user session.",
                )

            return user

    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (401, 403):
            raise HTTPException(
                status_code=401,
                detail="Your session is invalid or expired.",
            ) from exc

        raise HTTPException(
            status_code=502,
            detail="Unable to verify your Supabase session.",
        ) from exc

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to Supabase.",
        ) from exc


@router.post("/chat")
async def zera_chat(
    request: ZeraChatRequest,
    authorization: str | None = Header(default=None),
):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    token = authorization.removeprefix("Bearer ").strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Missing access token.",
        )

    await verify_supabase_token(token)

    try:
        return await answer_research_question(
            request.message.strip()
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 429:
            raise HTTPException(
                status_code=503,
                detail="OpenAlex rate limit reached. Please try again shortly.",
            ) from exc

        raise HTTPException(
            status_code=502,
            detail="OpenAlex returned an error.",
        ) from exc

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to OpenAlex.",
        ) from exc

    except Exception as exc:
        print(f"ZERA error: {exc}")

        raise HTTPException(
            status_code=502,
            detail="ZERA could not generate an answer. Please try again.",
        ) from exc
