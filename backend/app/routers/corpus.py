
import httpx

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.routers.zera import verify_supabase_token

from app.services.corpus import (
    collect_corpus,
    collect_topic_corpus,
    sync_openalex_topic_catalogue,
    collect_research_topic_batch,
    get_research_storage_stats,
    enrich_existing_papers,
)


router = APIRouter()


class CatalogueSyncRequest(BaseModel):
    cursor: str = Field(default="*", min_length=1, max_length=500)
    max_pages: int = Field(default=5, ge=1, le=10)


class CollectAllRequest(BaseModel):
    max_topics: int = Field(default=2, ge=1, le=5)
    max_pages_per_topic: int = Field(default=1, ge=1, le=5)


class CorpusCollectRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    slug: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=500)
    query: str = Field(min_length=2, max_length=300)
    max_pages: int = Field(default=10, ge=1, le=1000)


class EnrichExistingRequest(BaseModel):
    batch_size: int = Field(default=10, ge=1, le=20)
    offset: int = Field(default=0, ge=0)


async def require_auth(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    token = authorization.removeprefix("Bearer ").strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    await verify_supabase_token(token)


def provider_error(exc: Exception):
    if isinstance(exc, httpx.HTTPStatusError):
        return HTTPException(
            status_code=502,
            detail="A research provider or database request failed.",
        )

    if isinstance(exc, httpx.RequestError):
        return HTTPException(
            status_code=503,
            detail="Unable to connect to a research provider or database.",
        )

    if isinstance(exc, ValueError):
        return HTTPException(
            status_code=400,
            detail=str(exc),
        )

    return None


@router.post("/collect")
async def start_corpus_collection(
    request: CorpusCollectRequest,
    authorization: str | None = Header(default=None),
):
    await require_auth(authorization)

    try:
        return await collect_corpus(
            name=request.name,
            slug=request.slug,
            description=request.description,
            query=request.query,
            max_pages=request.max_pages,
        )
    except Exception as exc:
        mapped = provider_error(exc)
        if mapped:
            raise mapped from exc
        raise


@router.post("/enrich-existing")
async def enrich_existing(
    request: EnrichExistingRequest,
    authorization: str | None = Header(default=None),
):
    await require_auth(authorization)

    try:
        return await enrich_existing_papers(
            batch_size=request.batch_size,
            offset=request.offset,
        )
    except Exception as exc:
        mapped = provider_error(exc)
        if mapped:
            raise mapped from exc
        raise


@router.post("/catalogue/sync")
async def sync_topic_catalogue(
    request: CatalogueSyncRequest,
    authorization: str | None = Header(default=None),
):
    await require_auth(authorization)

    try:
        return await sync_openalex_topic_catalogue(
            cursor=request.cursor,
            max_pages=request.max_pages,
        )
    except Exception as exc:
        mapped = provider_error(exc)
        if mapped:
            raise mapped from exc
        raise


@router.post("/collect-all")
async def collect_all_topics(
    request: CollectAllRequest,
    authorization: str | None = Header(default=None),
):
    await require_auth(authorization)

    try:
        return await collect_research_topic_batch(
            max_topics=request.max_topics,
            max_pages_per_topic=request.max_pages_per_topic,
        )
    except Exception as exc:
        mapped = provider_error(exc)
        if mapped:
            raise mapped from exc
        raise


@router.get("/storage")
async def research_storage_status(
    authorization: str | None = Header(default=None),
):
    await require_auth(authorization)

    try:
        return await get_research_storage_stats()
    except Exception as exc:
        mapped = provider_error(exc)
        if mapped:
            raise mapped from exc
        raise
