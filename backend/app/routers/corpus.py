
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
import httpx

from app.routers.zera import verify_supabase_token
from app.services.corpus import collect_corpus


router = APIRouter()


class CorpusCollectRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    slug: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=500)
    query: str = Field(min_length=2, max_length=300)
    max_pages: int | None = Field(default=1, ge=1, le=1000)


@router.post("/collect")
async def start_corpus_collection(
    request: CorpusCollectRequest,
    authorization: str | None = Header(default=None),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    token = authorization.removeprefix("Bearer ").strip()

    await verify_supabase_token(token)

    try:
        return await collect_corpus(
            name=request.name,
            slug=request.slug,
            description=request.description,
            query=request.query,
            max_pages=request.max_pages,
        )

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail="A research provider or database request failed.",
        ) from exc

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to a research provider or database.",
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
