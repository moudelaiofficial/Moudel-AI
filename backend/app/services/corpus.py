
import asyncio
import logging
from datetime import date, datetime, timezone

import httpx

from app.config import get_settings
from app.services.research.openalex import (
    fetch_openalex_cursor_page,
    fetch_openalex_topic_cursor_page,
    fetch_openalex_topics_cursor_page,
    fetch_openalex_work,
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

settings = get_settings()

CORPUS_BATCH_SIZE = settings.corpus_batch_size
OPENALEX_PAGE_SIZE = settings.corpus_page_size
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
    except (ValueError, TypeError):
        return False


def normalize_for_storage(paper: dict):
    openalex_id = extract_openalex_id(paper.get("id"))

    if not openalex_id:
        return None

    topics = paper.get("topics") or []

    topic_ids = []
    topic_names = []
    subfield_names = []
    field_names = []
    domain_names = []

    for topic in topics:
        if not isinstance(topic, dict):
            continue

        if topic.get("id"):
            topic_ids.append(topic["id"])

        if topic.get("display_name"):
            topic_names.append(topic["display_name"])

        subfield = topic.get("subfield") or {}
        field = topic.get("field") or {}
        domain = topic.get("domain") or {}

        if subfield.get("display_name"):
            subfield_names.append(subfield["display_name"])

        if field.get("display_name"):
            field_names.append(field["display_name"])

        if domain.get("display_name"):
            domain_names.append(domain["display_name"])

    primary_topic = paper.get("primary_topic")

    categories = list(dict.fromkeys(
        value
        for value in [
            paper.get("domain"),
            paper.get("field"),
            paper.get("subfield"),
            primary_topic,
            *domain_names,
            *field_names,
            *subfield_names,
            *topic_names,
        ]
        if value
    ))

    return {
        "openalex_id": openalex_id,
        "title": paper.get("title") or "Untitled paper",
        "authors": paper.get("authors") or [],
        "abstract": paper.get("abstract"),
        "doi": paper.get("doi"),
        "arxiv_id": None,
        "source": paper.get("source"),
        "publication_date": paper.get("publication_date"),
        "categories": categories,
        "paper_url": paper.get("paper_url"),
        "pdf_url": paper.get("pdf_url"),
        "metadata": {
            "provider": "openalex",
            "citation_count": paper.get("citation_count", 0),
            "type": paper.get("type"),
            "primary_topic": primary_topic,
            "primary_topic_id": paper.get("primary_topic_id"),
            "topics": topics,
            "topic_ids": list(dict.fromkeys(topic_ids)),
            "topic_names": list(dict.fromkeys(topic_names)),
            "subfields": list(dict.fromkeys(subfield_names)),
            "fields": list(dict.fromkeys(field_names)),
            "domains": list(dict.fromkeys(domain_names)),
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
    metadata: dict,
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
                "metadata": metadata,
            },
        )

        response.raise_for_status()
        return response.json()[0]


async def get_or_create_corpus(
    name: str,
    slug: str,
    description: str,
    collection_metadata: dict,
):
    corpus = await get_corpus(slug)

    if corpus:
        saved_metadata = corpus.get("metadata") or {}

        # Do not silently reuse a slug for a different collection.
        for key in ("collection_type", "query", "topic_id"):
            expected = collection_metadata.get(key)
            saved = saved_metadata.get(key)

            if expected != saved:
                raise ValueError(
                    f"Corpus slug '{slug}' already exists with "
                    f"a different {key}. Use another slug."
                )

        return corpus

    try:
        return await create_corpus(
            name=name,
            slug=slug,
            description=description,
            metadata={
                **collection_metadata,
                "provider": "openalex",
                "page_size": OPENALEX_PAGE_SIZE,
            },
        )

    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 409:
            corpus = await get_corpus(slug)

            if corpus:
                saved_metadata = corpus.get("metadata") or {}

                for key in ("collection_type", "query", "topic_id"):
                    if (
                        saved_metadata.get(key)
                        != collection_metadata.get(key)
                    ):
                        raise ValueError(
                            "Corpus slug already exists with "
                            "a different collection configuration."
                        )

                return corpus

        raise



async def fetch_page_with_retry(
    collection_type: str,
    value: str,
    cursor: str,
):
    for attempt in range(MAX_RETRIES):
        try:
            if collection_type == "topic":
                return await fetch_openalex_topic_cursor_page(
                    topic_id=value,
                    cursor=cursor,
                    per_page=OPENALEX_PAGE_SIZE,
                    has_abstract=True,
                )

            return await fetch_openalex_cursor_page(
                query=value,
                cursor=cursor,
                per_page=OPENALEX_PAGE_SIZE,
                has_abstract=True,
            )

        except httpx.HTTPStatusError as exc:
            if exc.response.status_code not in (
                429, 500, 502, 503, 504
            ):
                raise

            if attempt == MAX_RETRIES - 1:
                raise

            logger.warning(
                "OpenAlex HTTP error %s. Collection=%s "
                "attempt=%s",
                exc.response.status_code,
                value,
                attempt + 1,
            )

        except httpx.RequestError:
            if attempt == MAX_RETRIES - 1:
                raise

            logger.warning(
                "OpenAlex request failed. Collection=%s "
                "attempt=%s",
                value,
                attempt + 1,
            )

        await asyncio.sleep(min(2 ** attempt, 20))

    raise RuntimeError(
        f"OpenAlex retries exhausted for collection: {value}"
    )



async def count_corpus_membership(corpus_id: str):
    """
    Reconcile exact corpus membership and abstract counts.
    Run at the end of a collection request, not after every page.
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


async def _collect(
    *,
    name: str,
    slug: str,
    description: str,
    collection_type: str,
    value: str,
    max_pages: int,
    topic_id: str | None = None,
):
    if not value or not value.strip():
        raise ValueError("A collection query or topic ID is required.")

    if not 1 <= max_pages <= 1000:
        raise ValueError("max_pages must be between 1 and 1000.")

    metadata = {
        "collection_type": collection_type,
        "query": value if collection_type == "search" else None,
        "topic_id": topic_id,
    }

    corpus = await get_or_create_corpus(
        name=name,
        slug=slug,
        description=description,
        collection_metadata=metadata,
    )

    corpus_id = corpus["id"]

    if corpus.get("status") == "completed":
        return {
            "corpus_id": corpus_id,
            "slug": slug,
            "status": "completed",
            "message": "This collection has already completed.",
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
        {"status": "collecting"},
    )

    try:
        while page_number < max_pages:
            page = await fetch_page_with_retry(
                collection_type=collection_type,
                value=value,
                cursor=cursor,
            )

            results = page.get("results", [])

            if page_number == 0:
                total_matching = page.get("total_count", 0)

            if not results:
                cursor = None
                break

            valid_papers = []

            for paper in results:
                if not is_valid_publication_date(
                    paper.get("publication_date")
                ):
                    continue

                normalized = normalize_for_storage(paper)

                if normalized:
                    valid_papers.append(normalized)

            # Save and link every batch before checkpointing.
            for start in range(0, len(valid_papers), CORPUS_BATCH_SIZE):
                batch = valid_papers[
                    start:start + CORPUS_BATCH_SIZE
                ]

                resolved = await save_paper_batch(batch)

                paper_ids = list(dict.fromkeys(
                    resolved.values()
                ))

                await link_paper_batch(
                    corpus_id=corpus_id,
                    paper_ids=paper_ids,
                    discovery_query=value,
                )

            next_cursor = page.get("next_cursor")
            discovered += len(results)
            abstracts_discovered = int(
            (corpus.get("metadata") or {}).get(
                "abstracts_discovered", 0
            )
            )
            abstracts_discovered += len(valid_papers)
            page_number += 1

            # Save the cursor only after all page batches were saved.
            cursor = next_cursor

            await update_corpus_progress(
                corpus_id,
            {
                "last_cursor": cursor,
                "total_matching": total_matching,
                "discovered_count": discovered,
                "metadata": {
                    **(corpus.get("metadata") or {}),
                    "abstracts_discovered": abstracts_discovered,
                },
                "last_synced_at": utc_now(),
            }
            )

            logger.info(
                "Corpus %s: page=%s discovered=%s",
                slug,
                page_number,
                discovered,
            )

            if not cursor:
                break

        completed = cursor is None

        stored, abstracts = await count_corpus_membership(
            corpus_id
        )

        await update_corpus_progress(
            corpus_id,
            {
                "status": "completed" if completed else "paused",
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
            "collection_type": collection_type,
            "status": "completed" if completed else "paused",
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
                "Unable to save collection failure status: %s",
                slug,
            )

        raise


async def collect_corpus(
    name: str,
    slug: str,
    description: str,
    query: str,
    max_pages: int | None = None,
):
    """
    Backward-compatible search-based collection.

    A missing max_pages uses the configured per-run safety limit.
    """

    settings = get_settings()

    if max_pages is None:
        max_pages = settings.corpus_max_pages_per_run

    return await _collect(
        name=name,
        slug=slug,
        description=description,
        collection_type="search",
        value=query.strip(),
        max_pages=max_pages,
    )


async def collect_topic_corpus(
    name: str,
    slug: str,
    description: str,
    topic_id: str,
    max_pages: int | None = None,
):
    """
    Collect works associated with one OpenAlex topic.

    Each topic gets its own corpus row and cursor checkpoint.
    """

    settings = get_settings()

    if max_pages is None:
        max_pages = settings.corpus_max_pages_per_run

    topic_id = extract_openalex_id(topic_id)

    if not topic_id or not topic_id.startswith("T"):
        raise ValueError(
            "Invalid OpenAlex topic ID. Expected an ID such as T123456789."
        )

    return await _collect(
        name=name,
        slug=slug,
        description=description,
        collection_type="topic",
        value=topic_id,
        topic_id=topic_id,
        max_pages=max_pages,
    )


# ============================================================
# OPENALEX TOPIC CATALOGUE SYNCHRONIZATION
# ============================================================

async def save_topic_catalogue_page(topics: list[dict]):
    """
    Insert or update one page of OpenAlex topic metadata.
    """

    if not topics:
        return 0

    records = []

    for topic in topics:
        topic_id = topic.get("id")

        if not topic_id:
            continue

        domain = topic.get("domain") or {}
        field = topic.get("field") or {}
        subfield = topic.get("subfield") or {}

        records.append({
            "id": topic_id,
            "display_name": (
                topic.get("display_name") or topic_id
            ),
            "description": topic.get("description"),
            "keywords": topic.get("keywords") or [],
            "domain_id": domain.get("id"),
            "domain_name": domain.get("display_name"),
            "field_id": field.get("id"),
            "field_name": field.get("display_name"),
            "subfield_id": subfield.get("id"),
            "subfield_name": subfield.get("display_name"),
            "last_synced_at": utc_now(),
            "updated_at": utc_now(),
        })

    if not records:
        return 0

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        for batch in (
            records[index:index + 100]
            for index in range(0, len(records), 100)
        ):
            response = await client.post(
                get_url("research_topics"),
                headers=get_headers(
                    "resolution=merge-duplicates,return=minimal"
                ),
                params={
                    "on_conflict": "id",
                },
                json=batch,
            )

            response.raise_for_status()

    return len(records)


async def sync_openalex_topic_catalogue(
    cursor: str = "*",
    max_pages: int = 5,
):
    """
    Synchronize a bounded number of pages of the OpenAlex topic
    catalogue. Pass the returned next_cursor to continue.
    """

    if not 1 <= max_pages <= 10:
        raise ValueError("max_pages must be between 1 and 10.")

    current_cursor = cursor
    pages_processed = 0
    topics_saved = 0
    total_matching = 0

    while pages_processed < max_pages:
        page = await fetch_openalex_topics_cursor_page(
            cursor=current_cursor,
            per_page=200,
        )

        if pages_processed == 0:
            total_matching = page.get("total_count", 0)

        topics = page.get("results") or []

        if not topics:
            current_cursor = None
            break

        saved = await save_topic_catalogue_page(topics)

        topics_saved += saved
        pages_processed += 1

        current_cursor = page.get("next_cursor")

        logger.info(
            "OpenAlex catalogue: page=%s saved=%s",
            pages_processed,
            saved,
        )

        if not current_cursor:
            break

    return {
        "status": (
            "completed" if current_cursor is None else "paused"
        ),
        "total_matching": total_matching,
        "topics_saved": topics_saved,
        "pages_processed": pages_processed,
        "next_cursor": current_cursor,
    }


# ============================================================
# TOPIC COLLECTION ORCHESTRATOR
# ============================================================

async def claim_research_topics(limit: int = 2):
    """
    Atomically claim pending or recoverable topics through
    the PostgreSQL RPC function.
    """

    if not 1 <= limit <= 5:
        raise ValueError("Topic batch size must be between 1 and 5.")

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{get_url('rpc/claim_research_topics')}",
            headers=get_headers(),
            json={
                "p_limit": limit,
                "p_lease_minutes": 30,
            },
        )

        response.raise_for_status()

        return response.json()


async def update_research_topic(
    topic_id: str,
    updates: dict,
):
    """
    Update topic collection status and release its lease.
    """

    payload = {
        **updates,
        "updated_at": utc_now(),
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.patch(
            get_url("research_topics"),
            headers=get_headers("return=minimal"),
            params={
                "id": f"eq.{topic_id}",
            },
            json=payload,
        )

        response.raise_for_status()


async def collect_research_topic_batch(
    max_topics: int = 2,
    max_pages_per_topic: int = 1,
):
    """
    Collect a bounded number of OpenAlex topics sequentially.

    Each topic uses its own research_corpora record and cursor.
    """

    if not 1 <= max_topics <= 5:
        raise ValueError("max_topics must be between 1 and 5.")

    if not 1 <= max_pages_per_topic <= 5:
        raise ValueError(
            "max_pages_per_topic must be between 1 and 5."
        )

    claimed_topics = await claim_research_topics(max_topics)

    results = []

    for topic in claimed_topics:
        topic_id = topic["id"]
        display_name = topic.get("display_name") or topic_id

        slug = f"openalex-topic-{topic_id.lower()}"

        try:
            collection = await collect_topic_corpus(
                name=display_name[:100],
                slug=slug,
                description=(
                    f"OpenAlex research topic: {display_name}"
                ),
                topic_id=topic_id,
                max_pages=max_pages_per_topic,
            )

            corpus = await get_corpus(slug)

            collection_status = collection.get("status")

            if collection_status == "completed":
                topic_status = "completed"
            else:
                topic_status = "pending"

            await update_research_topic(
                topic_id,
                {
                    "status": topic_status,
                    "corpus_id": (
                        corpus.get("id") if corpus else None
                    ),
                    "total_matching": (
                        collection.get("total_matching", 0)
                    ),
                    "discovered_count": (
                        collection.get("discovered", 0)
                    ),
                    "lease_expires_at": None,
                    "last_error": None,
                    "last_synced_at": utc_now(),
                },
            )

            results.append({
                "topic_id": topic_id,
                "topic": display_name,
                "status": topic_status,
                "discovered": collection.get("discovered", 0),
                "stored": collection.get("stored", 0),
                "pages_processed": collection.get(
                    "pages_processed", 0
                ),
            })

        except Exception as exc:
            logger.exception(
                "Topic collection failed: %s",
                topic_id,
            )

            try:
                await update_research_topic(
                    topic_id,
                    {
                        "status": "failed",
                        "lease_expires_at": None,
                        "last_error": str(exc)[:1000],
                    },
                )
            except Exception:
                logger.exception(
                    "Unable to save topic failure status."
                )

            results.append({
                "topic_id": topic_id,
                "topic": display_name,
                "status": "failed",
                "error": str(exc)[:500],
            })

    return {
        "claimed": len(claimed_topics),
        "processed": len(results),
        "results": results,
    }


# ============================================================
# STORAGE MONITORING
# ============================================================

async def get_research_storage_stats():
    """
    Return approximate paper counts and actual table/index sizes.
    """

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{get_url('rpc/get_research_storage_stats')}",
            headers=get_headers(),
            json={},
        )

        response.raise_for_status()

        return response.json()


# ============================================================
# EXISTING PAPER ENRICHMENT
# ============================================================

async def fetch_existing_openalex_ids(
    offset: int = 0,
    limit: int = 10,
):
    """
    Retrieve a bounded page of existing OpenAlex IDs.
    Does not modify the papers table.
    """

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(
            get_url("papers"),
            headers=get_headers(),
            params={
                "select": "id,openalex_id",
                "openalex_id": "not.is.null",
                "order": "id.asc",
                "limit": limit,
                "offset": offset,
            },
        )

        response.raise_for_status()
        return response.json()


async def fetch_work_with_retry(openalex_id: str):
    """
    Fetch one OpenAlex work with bounded retries.
    """

    for attempt in range(MAX_RETRIES):
        try:
            return await fetch_openalex_work(openalex_id)

        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code

            if status not in (429, 500, 502, 503, 504):
                raise

            if attempt == MAX_RETRIES - 1:
                raise

        except httpx.RequestError:
            if attempt == MAX_RETRIES - 1:
                raise

        await asyncio.sleep(min(2 ** attempt, 20))


async def enrich_existing_papers(
    batch_size: int = 10,
    offset: int = 0,
):
    """
    Enrich existing Supabase papers with OpenAlex topic metadata.

    Important:
    - Does not insert new papers intentionally.
    - Does not delete existing papers.
    - Does not create corpus memberships.
    - Uses save_paper_batch to preserve existing UUIDs,
      abstracts, identifiers and metadata.
    """

    if not 1 <= batch_size <= 20:
        raise ValueError("batch_size must be between 1 and 20.")

    if offset < 0:
        raise ValueError("offset cannot be negative.")

    existing_records = await fetch_existing_openalex_ids(
        offset=offset,
        limit=batch_size,
    )

    if not existing_records:
        return {
            "status": "completed",
            "offset": offset,
            "processed": 0,
            "enriched": 0,
            "failed": 0,
            "message": "No more OpenAlex-linked papers found.",
            "results": [],
        }

    semaphore = asyncio.Semaphore(5)

    async def fetch_bounded(record):
        async with semaphore:
            return await fetch_work_with_retry(
                record["openalex_id"]
            )

    tasks = [
        fetch_bounded(record)
        for record in existing_records
    ]

    fetched = await asyncio.gather(
        *tasks,
        return_exceptions=True,
    )

    normalized_papers = []
    failed_results = []

    for record, result in zip(existing_records, fetched):
        if isinstance(result, BaseException):
            logger.warning(
                "Enrichment fetch failed for %s: %s",
                record["openalex_id"],
                str(result),
            )

            failed_results.append({
                "openalex_id": record["openalex_id"],
                "status": "failed",
                "error": str(result)[:300],
            })
            continue

        normalized = normalize_for_storage(result)

        if normalized:
            normalized_papers.append(normalized)

    saved_count = 0

    if normalized_papers:
        resolved = await save_paper_batch(normalized_papers)
        saved_count = len(resolved)

    topic_count = sum(
        1
        for paper in normalized_papers
        if paper.get("metadata", {}).get("topics")
    )

    return {
        "status": (
            "completed"
            if not failed_results
            else "partial"
        ),
        "offset": offset,
        "processed": len(existing_records),
        "fetched": len(normalized_papers),
        "enriched": saved_count,
        "with_topics": topic_count,
        "failed": len(failed_results),
        "next_offset": (
            offset + len(existing_records)
            if len(existing_records) == batch_size
            else None
        ),
        "results": failed_results,
    }
