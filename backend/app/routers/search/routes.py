
import httpx

from fastapi import APIRouter, HTTPException, Query

from app.services.research.openalex import search_openalex

router = APIRouter()


@router.get("/papers")
async def search_papers(
    q: str | None = Query(None, min_length=2, max_length=300),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    sort: str = Query("relevance"),
    category: str | None = Query(None),
    year: int | None = Query(None, ge=1900, le=2100),
):
    try:
        return await search_openalex(
            query=q,
            page=page,
            limit=limit,
            sort=sort,
            category=category,
            year=year,
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
                detail="Research provider rate limit reached. Try again later.",
            ) from exc

        raise HTTPException(
            status_code=502,
            detail="Research provider returned an error.",
        ) from exc

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to the research provider.",
        ) from exc
