
import asyncio
import logging
from datetime import date, datetime, timezone

import httpx

from app.services.research.openalex import (
    fetch_openalex_cursor_page,
)
from app.services.corpus_storage import (
    save_paper_batch,
    link_paper_batch,
    update_corpus_progress,
    get_headers,
    get_url,
    TIMEOUT,
)

logger = logging.getLogger(__name__)

CORPUS_BATCH_SIZE = 50
OPENALEX_PAGE_SIZE = 200
MAX_RETRIES = 4


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def extract_openalex_id(value: str | None):
    if not value:
        return None

    return value.rstrip("/").split("/")[-1]


def is_valid_publication_date(value: str | None):
    if not value:
        return True

    try:
        published = date.fromisoformat(value[:10])
        return published <= date.today()
    except ValueError:
        return False


def normalize_for_storage(paper: dict):
    openalex_id = extract_openalex_id(paper.get("id"))

    if not openalex_id:
        return None

    return {
        "openalex_id": openalex_id,
        "title": paper.get("title") or "Untitled paper",
        "authors": paper.get("authors") or [],
        "abstract": paper.get("abstract"),
        "doi": paper.get("doi"),
        "arxiv_id": None,
        "source": paper.get("source"),
        "publication_date": paper.get("publication_date"),
        "categories": [
            value
            for value in [
                paper.get("domain"),
                paper.get("field"),
                paper.get("subfield"),
                paper.get("primary_topic"),
            ]
            if value
        ],
        "paper_url": paper.get("paper_url"),
        "pdf_url": paper.get("pdf_url"),
        "metadata": {
            "provider": "openalex",
            "citation_count": paper.get("citation_count", 0),
            "type": paper.get("type"),
            "primary_topic": paper.get("primary_topic"),
            "subfield": paper.get("subfield"),
            "field": paper.get("field"),
            "domain": paper.get("domain"),
            "is_open_access": paper.get("is_open_access", False),
        },
    }


async def get_corpus(slug: str):
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(
            get_url("research_corpora"),
            headers=get_headers(),
            params={
                "slug": f"eq.{slug}",
                "select": "*",
                "limit": 1,
            },
        )

        response.raise_for_status()
        records = response.json()

    return records[0] if records else None


async def create_corpus(
    name: str,
    slug: str,
    description: str,
    query: str,
):
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            get_url("research_corpora"),
            headers=get_headers("return=representation"),
            json={
                "name": name,
                "slug": slug,
                "description": description,
                "status": "pending",
                "metadata": {
                    "query": query,
                    "page_size": OPENALEX_PAGE_SIZE,
                    "provider": "openalex",
                },
            },
        )

        response.raise_for_status()
        return response.json()[0]


async def get_or_create_corpus(
    name: str,
    slug: str,
    description: str,
    query: str,
):
    corpus = await get_corpus(slug)

    if corpus:
        metadata = corpus.get("metadata") or {}
        saved_query = metadata.get("query")

        if saved_query and saved_query.strip() != query.strip():
            raise ValueError(
                "This corpus already exists with a different "
                "search query. Create a new corpus slug to "
                "use another query."
            )

        if not saved_query:
            # Existing records created by an older collector
            # cannot be resumed safely without a known query.
            raise ValueError(
                "This corpus has no saved query configuration. "
                "Create a new corpus slug for safe collection."
            )

        return corpus

    try:
        return await create_corpus(
            name=name,
            slug=slug,
            description=description,
            query=query.strip(),
        )

    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 409:
            corpus = await get_corpus(slug)

            if corpus:
                metadata = corpus.get("metadata") or {}

                if metadata.get("query") != query.strip():
                    raise ValueError(
                        "Corpus slug already exists with "
                        "a different query."
                    )

                return corpus

        raise


async def fetch_page_with_retry(
    query: str,
    cursor: str,
):
    for attempt in range(MAX_RETRIES):
        try:
            return await fetch_openalex_cursor_page(
                query=query,
                cursor=cursor,
                per_page=OPENALEX_PAGE_SIZE,
            )

        except httpx.HTTPStatusError as exc:
            if exc.response.status_code not in (
                429, 500, 502, 503, 504
            ):
                raise

            if attempt == MAX_RETRIES - 1:
                raise

        except httpx.RequestError:
            if attempt == MAX_RETRIES - 1:
                raise

        await asyncio.sleep(min(2 ** attempt, 15))


async def count_corpus_membership(corpus_id: str):
    """
    Count actual distinct linked papers and linked papers
    with abstracts using Supabase's exact count response.

    This avoids incrementing counters for repeated pages.
    """

    headers = get_headers("count=exact")

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(
            get_url("research_corpus_papers"),
            headers=headers,
            params={
                "select": "paper_id",
                "corpus_id": f"eq.{corpus_id}",
                "limit": 1,
            },
        )

        response.raise_for_status()

        content_range = response.headers.get(
            "content-range",
            "*/0",
        )

        try:
            stored_count = int(content_range.split("/")[-1])
        except (ValueError, IndexError):
            raise RuntimeError(
                "Could not determine corpus membership count."
            )

        # Query linked paper IDs, then count abstracts.
        # This is deliberately separate from the exact
        # membership count.
        abstract_count = 0
        offset = 0
        page_size = 500

        while True:
            links_response = await client.get(
                get_url("research_corpus_papers"),
                headers=get_headers(),
                params={
                    "select": "paper_id",
                    "corpus_id": f"eq.{corpus_id}",
                    "limit": page_size,
                    "offset": offset,
                    "order": "paper_id.asc",
                },
            )

            links_response.raise_for_status()
            links = links_response.json()

            if not links:
                break

            paper_ids = [
                link["paper_id"]
                for link in links
            ]

            for start in range(0, len(paper_ids), 50):
                batch = paper_ids[start:start + 50]

                abstract_response = await client.get(
                    get_url("papers"),
                    headers=get_headers(),
                    params={
                        "select": "id",
                        "id": "in.(" + ",".join(batch) + ")",
                        "abstract": "not.is.null",
                        "limit": len(batch),
                    },
                )

                abstract_response.raise_for_status()
                abstract_count += len(abstract_response.json())

            offset += len(links)

            if len(links) < page_size:
                break

    return stored_count, abstract_count


async def collect_corpus(
    name: str,
    slug: str,
    description: str,
    query: str,
    max_pages: int | None = None,
):
    """
    Collect an OpenAlex corpus.

    max_pages=None means continue until OpenAlex has no
    more matching records.

    A completed corpus is never silently restarted.
    """

    query = query.strip()

    if not query:
        raise ValueError("A corpus search query is required.")

    if max_pages is not None and max_pages < 1:
        raise ValueError("max_pages must be at least 1.")

    corpus = await get_or_create_corpus(
        name=name,
        slug=slug,
        description=description,
        query=query,
    )

    corpus_id = corpus["id"]

    if corpus.get("status") == "completed":
        return {
            "corpus_id": corpus_id,
            "slug": slug,
            "status": "completed",
            "message": "This corpus has already been collected.",
            "total_matching": corpus.get("total_matching", 0),
            "discovered": corpus.get("discovered_count", 0),
            "stored": corpus.get("stored_count", 0),
            "abstracts_available": corpus.get("abstract_count", 0),
            "pages_processed": 0,
            "next_cursor": None,
        }

    cursor = corpus.get("last_cursor") or "*"

    discovered = int(corpus.get("discovered_count") or 0)
    total_matching = int(corpus.get("total_matching") or 0)

    page_number = 0

    await update_corpus_progress(
        corpus_id,
        {
            "status": "collecting",
        },
    )

    try:
        while True:
            if max_pages is not None and page_number >= max_pages:
                break

            page = await fetch_page_with_retry(
                query=query,
                cursor=cursor,
            )

            results = page.get("results", [])

            if page_number == 0:
                total_matching = page.get("total_count", 0)

            if not results:
                cursor = None

                await update_corpus_progress(
                    corpus_id,
                    {
                        "last_cursor": None,
                        "total_matching": total_matching,
                    },
                )

                break

            # Process each OpenAlex page in smaller batches.
            valid_papers = []

            for paper in results:
                if not is_valid_publication_date(
                    paper.get("publication_date")
                ):
                    continue

                normalized = normalize_for_storage(paper)

                if normalized:
                    valid_papers.append(normalized)

            # Persist each batch and link it before checkpointing.
            for batch in (
                valid_papers[index:index + CORPUS_BATCH_SIZE]
                for index in range(
                    0,
                    len(valid_papers),
                    CORPUS_BATCH_SIZE,
                )
            ):
                resolved = await save_paper_batch(batch)

                paper_ids = list(dict.fromkeys(
                    resolved.values()
                ))

                await link_paper_batch(
                    corpus_id=corpus_id,
                    paper_ids=paper_ids,
                    discovery_query=query,
                )

            # Only checkpoint after the entire page is persisted.
            next_cursor = page.get("next_cursor")

            discovered += len(results)

            stored, abstracts = await count_corpus_membership(
                corpus_id
            )

            await update_corpus_progress(
                corpus_id,
                {
                    "last_cursor": next_cursor,
                    "total_matching": total_matching,
                    "discovered_count": discovered,
                    "stored_count": stored,
                    "abstract_count": abstracts,
                    "last_synced_at": utc_now(),
                },
            )

            page_number += 1

            logger.info(
                "Corpus %s: page=%s discovered=%s stored=%s abstracts=%s",
                slug,
                page_number,
                discovered,
                stored,
                abstracts,
            )

            if not next_cursor:
                cursor = None
                break

            cursor = next_cursor

        completed = cursor is None

        stored, abstracts = await count_corpus_membership(
            corpus_id
        )

        await update_corpus_progress(
            corpus_id,
            {
                "status": (
                    "completed" if completed else "paused"
                ),
                "last_cursor": cursor,
                "total_matching": total_matching,
                "discovered_count": discovered,
                "stored_count": stored,
                "abstract_count": abstracts,
                "last_synced_at": utc_now(),
            },
        )

        return {
            "corpus_id": corpus_id,
            "slug": slug,
            "status": (
                "completed" if completed else "paused"
            ),
            "total_matching": total_matching,
            "discovered": discovered,
            "stored": stored,
            "abstracts_available": abstracts,
            "pages_processed": page_number,
            "next_cursor": cursor,
        }

    except Exception:
        logger.exception(
            "Corpus collection failed: %s",
            slug,
        )

        try:
            await update_corpus_progress(
                corpus_id,
                {
                    "status": "failed",
                    "last_cursor": cursor,
                    "discovered_count": discovered,
                    "total_matching": total_matching,
                    "last_synced_at": utc_now(),
                },
            )
        except Exception:
            logger.exception(
                "Failed to update corpus failure status: %s",
                slug,
            )

        raise
