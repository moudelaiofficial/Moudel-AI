
import asyncio
import logging
from datetime import date

import httpx

from app.services.research.openalex import (
    fetch_openalex_cursor_page,
)
from app.services.gemini import (
    generate_research_answer,
    generate_research_queries,
)
from app.services.corpus_storage import (
    search_corpus_papers,
    save_paper_batch,
    normalize_doi,
    rank_corpus_papers,
)
from app.services.corpus import normalize_for_storage


logger = logging.getLogger(__name__)


# ============================================================
# RETRIEVAL CONFIGURATION
# ============================================================

CORPUS_RETRIEVAL_LIMIT = 100


OPENALEX_PAGE_SIZE = 100
OPENALEX_MAX_QUERIES = 5
OPENALEX_CONCURRENT_QUERIES = 2

# Live chat should retrieve only a small number of pages.
OPENALEX_MAX_PAGES_PER_QUERY = 1

# Prevent slow requests and excessive retries.
OPENALEX_PAGE_TIMEOUT = 15
OPENALEX_TOTAL_TIMEOUT = 120

OPENALEX_MAX_RETRIES = 2


SUPABASE_QUERY_TIMEOUT = 30
PAPER_PERSIST_TIMEOUT = 30

TOTAL_RESEARCH_TIMEOUT = 240

# Keep Gemini evidence selection bounded.
MAX_EVIDENCE_COUNT = 10

# Existing storage currently performs individual DOI lookups.
# Keep ingestion conservative until bulk lookup is optimized.
MAX_PAPERS_TO_PERSIST = 50

MAX_RETRIES = 4


# ============================================================
# VALIDATION AND IDENTITY
# ============================================================

def is_valid_publication_date(value: str | None) -> bool:
    if not value:
        return True

    try:
        published = date.fromisoformat(value[:10])
        return published <= date.today()
    except (ValueError, TypeError):
        return False


def paper_identity_keys(paper: dict) -> list[str]:
    """
    Generate all known identity aliases for a paper.
    """

    keys = []

    doi = normalize_doi(paper.get("doi"))

    if doi:
        keys.append(f"doi:{doi}")

    openalex_id = (
        paper.get("openalex_id")
        or paper.get("id")
    )

    if openalex_id:
        openalex_id = (
            str(openalex_id)
            .rstrip("/")
            .split("/")[-1]
            .lower()
        )
        keys.append(f"openalex:{openalex_id}")

    arxiv_id = paper.get("arxiv_id")

    if arxiv_id:
        arxiv_id = str(arxiv_id).strip().lower()
        keys.append(f"arxiv:{arxiv_id}")

    return list(dict.fromkeys(keys))


def get_paper_key(paper: dict) -> str:
    keys = paper_identity_keys(paper)
    return keys[0] if keys else ""


def merge_paper_metadata(
    existing: dict,
    incoming: dict,
) -> dict:
    """
    Preserve useful metadata from both discovery sources.
    """

    merged = dict(existing)

    for key, value in incoming.items():
        if value is None or value == "":
            continue

        if key in ("authors", "categories", "topics"):
            old_values = merged.get(key) or []

            if isinstance(value, list):
                combined = old_values + value
                seen = set()
                unique = []

                for item in combined:
                    if isinstance(item, dict):
                        identity = (
                            item.get("id")
                            or item.get("display_name")
                            or str(item)
                        )
                    else:
                        identity = str(item)

                    identity = identity.casefold()

                    if identity not in seen:
                        seen.add(identity)
                        unique.append(item)

                merged[key] = unique

            continue

        if key == "metadata":
            old_metadata = merged.get("metadata") or {}
            new_metadata = value or {}

            metadata = {
                **old_metadata,
                **{
                    k: v
                    for k, v in new_metadata.items()
                    if v is not None
                },
            }

            merged["metadata"] = metadata
            continue

        if not merged.get(key):
            merged[key] = value

    return merged


def deduplicate_papers(papers: list[dict]) -> list[dict]:
    """
    Deduplicate using all known identifiers.

    This also catches a paper discovered once by DOI and
    again by OpenAlex ID.
    """

    unique = []
    key_to_index = {}

    for paper in papers:
        keys = paper_identity_keys(paper)

        if not keys:
            continue

        matching_indices = {
            key_to_index[key]
            for key in keys
            if key in key_to_index
        }

        if not matching_indices:
            index = len(unique)
            unique.append(dict(paper))

        else:
            index = min(matching_indices)

            merged = dict(unique[index])

            for duplicate_index in sorted(
                matching_indices - {index},
                reverse=True,
            ):
                merged = merge_paper_metadata(
                    merged,
                    unique[duplicate_index],
                )

                unique.pop(duplicate_index)

                # Rebuild aliases after removing a duplicate.
                key_to_index = {}

                for current_index, current in enumerate(unique):
                    for current_key in paper_identity_keys(current):
                        key_to_index[current_key] = current_index

            unique[index] = merge_paper_metadata(
                merged,
                paper,
            )

        for key in paper_identity_keys(unique[index]):
            key_to_index[key] = index

    return unique


# ============================================================
# NORMALIZATION
# ============================================================

def prepare_openalex_paper(paper: dict) -> dict | None:
    if not paper.get("id"):
        return None

    return normalize_for_storage(paper)


# ============================================================
# RETRIEVE FROM SUPABASE
# ============================================================

async def retrieve_from_corpus(
    queries: list[str],
) -> list[dict]:

    semaphore = asyncio.Semaphore(3)

    async def search_one(query):
        async with semaphore:
            try:
                papers = await asyncio.wait_for(
                    search_corpus_papers(
                        query=query,
                        limit=CORPUS_RETRIEVAL_LIMIT,
                    ),
                    timeout=SUPABASE_QUERY_TIMEOUT,
                )

                logger.info(
                    "Supabase retrieval: query=%s results=%s",
                    query,
                    len(papers),
                )

                return papers

            except asyncio.TimeoutError:
                logger.warning(
                    "Supabase query timed out after %s seconds: %s",
                    SUPABASE_QUERY_TIMEOUT,
                    query,
                )
                return []

            except Exception:
                logger.exception(
                    "Supabase retrieval failed: %s",
                    query,
                )
                return []

    results = await asyncio.gather(
        *(search_one(query) for query in queries)
    )

    retrieved = [
        paper
        for batch in results
        for paper in batch
    ]

    return deduplicate_papers(retrieved)


# ============================================================
# OPENALEX PAGINATION
# ============================================================

async def fetch_openalex_page_with_retry(
    query: str,
    cursor: str,
):
    for attempt in range(OPENALEX_MAX_RETRIES):
        try:
            return await asyncio.wait_for(
                fetch_openalex_cursor_page(
                    query=query,
                    cursor=cursor,
                    per_page=OPENALEX_PAGE_SIZE,
                ),
                timeout=OPENALEX_PAGE_TIMEOUT,
            )

        except httpx.HTTPStatusError as exc:
            if exc.response.status_code not in (
                429, 500, 502, 503, 504
            ):
                raise

            if attempt == OPENALEX_MAX_RETRIES - 1:
                raise

            logger.warning(
                "OpenAlex HTTP error %s for query=%s attempt=%s",
                exc.response.status_code,
                query,
                attempt + 1,
            )

        except (httpx.RequestError, asyncio.TimeoutError):
            if attempt == MAX_RETRIES - 1:
                raise

            logger.warning(
                "OpenAlex request failed or timed out. "
                "query=%s attempt=%s",
                query,
                attempt + 1,
            )

        await asyncio.sleep(min(2 ** attempt, 20))

    raise RuntimeError(
        f"OpenAlex retries exhausted for query: {query}"
    )


async def retrieve_openalex_query(
    query: str,
    max_pages: int = OPENALEX_MAX_PAGES_PER_QUERY,
) -> list[dict]:
    """
    Retrieve matching OpenAlex works using cursor pagination.

    max_pages is a safety limit per execution, not a
    permanent limit on the query's total matching results.
    """

    cursor = "*"
    discovered = []

    for page_number in range(max_pages):
        page = await fetch_openalex_page_with_retry(
            query=query,
            cursor=cursor,
        )

        results = page.get("results") or []

        if not results:
            break

        discovered.extend(results)

        logger.info(
            "OpenAlex query=%s page=%s retrieved=%s total_matching=%s",
            query,
            page_number + 1,
            len(results),
            page.get("total_count", 0),
        )

        next_cursor = page.get("next_cursor")

        if not next_cursor:
            break

        cursor = next_cursor

    return discovered


# ============================================================
# RETRIEVE FROM OPENALEX
# ============================================================

async def retrieve_from_openalex(
    queries: list[str],
) -> list[dict]:
    """
    Retrieve papers across multiple OpenAlex queries.

    Limits concurrent queries and total execution time.

    Completed query results are retained if the overall
    retrieval deadline is reached.
    """

    semaphore = asyncio.Semaphore(
        OPENALEX_CONCURRENT_QUERIES
    )

    async def search_one(query: str) -> list[dict]:
        async with semaphore:
            try:
                raw_papers = await retrieve_openalex_query(
                    query=query,
                    max_pages=OPENALEX_MAX_PAGES_PER_QUERY,
                )

                papers = [
                    prepare_openalex_paper(paper)
                    for paper in raw_papers
                ]

                return [
                    paper for paper in papers
                    if paper is not None
                ]

            except asyncio.CancelledError:
                raise

            except Exception:
                logger.exception(
                    "OpenAlex query failed: %s",
                    query,
                )
                return []

    tasks = [
        asyncio.create_task(search_one(query))
        for query in queries
    ]

    done, pending = await asyncio.wait(
        tasks,
        timeout=OPENALEX_TOTAL_TIMEOUT,
    )

    if pending:
        logger.warning(
            "OpenAlex total retrieval deadline reached after %s "
            "seconds. Completed queries=%s pending queries=%s",
            OPENALEX_TOTAL_TIMEOUT,
            len(done),
            len(pending),
        )

        for task in pending:
            task.cancel()

        await asyncio.gather(
            *pending,
            return_exceptions=True,
        )

    results = []

    for task in done:
        try:
            results.extend(task.result())

        except Exception:
            logger.exception(
                "An OpenAlex retrieval task failed."
            )

    unique_papers = deduplicate_papers(results)

    logger.info(
        "OpenAlex retrieval finished: queries=%s completed=%s "
        "raw=%s unique=%s",
        len(queries),
        len(done),
        len(results),
        len(unique_papers),
    )

    return unique_papers


# ============================================================
# RANKING
# ============================================================

def rank_across_queries(
    papers: list[dict],
    queries: list[str],
) -> list[dict]:

    ranked = []

    for query in queries:
        ranked.extend(
            rank_corpus_papers(
                papers,
                query,
            )
        )

    ranked = deduplicate_papers(ranked)

    ranked_keys = {
        get_paper_key(paper)
        for paper in ranked
    }

    # Retain candidates not matched by lexical ranking.
    for paper in papers:
        key = get_paper_key(paper)

        if key and key not in ranked_keys:
            ranked.append(paper)
            ranked_keys.add(key)

    return ranked


# ============================================================
# PERSIST DISCOVERED PAPERS
# ============================================================

async def persist_discovered_papers(
    papers: list[dict],
) -> int:

    if not papers:
        return 0

    selected = papers[:MAX_PAPERS_TO_PERSIST]

    try:
        resolved = await asyncio.wait_for(
            save_paper_batch(selected),
            timeout=PAPER_PERSIST_TIMEOUT,
        )

        logger.info(
            "Persisted/resolved %s of %s selected papers.",
            len(resolved),
            len(selected),
        )

        return len(resolved)

    except asyncio.TimeoutError:
        logger.warning(
            "Paper persistence exceeded %s seconds.",
            PAPER_PERSIST_TIMEOUT,
        )
        return 0

    except Exception:
        logger.exception(
            "Failed to persist discovered papers."
        )
        return 0


# ============================================================
# MAIN ZERA RESEARCH WORKFLOW
# ============================================================

async def _answer_research_question(question: str):

    if not question or not question.strip():
        raise ValueError(
            "Please provide a research question."
        )

    # STEP 1: Generate targeted academic queries.

    queries = await generate_research_queries(question)

    if not queries:
        raise ValueError(
            "Unable to generate useful research queries."
        )

    queries = list(dict.fromkeys(
        query.strip()
        for query in queries
        if isinstance(query, str) and query.strip()
    ))[:OPENALEX_MAX_QUERIES]

    if not queries:
        raise ValueError(
            "Unable to generate useful research queries."
        )

    logger.info(
        "ZERA generated %s research queries.",
        len(queries),
    )

    # STEP 2: Search Supabase and OpenAlex concurrently.

    corpus_task = retrieve_from_corpus(queries)
    openalex_task = retrieve_from_openalex(queries)

    corpus_papers, openalex_papers = await asyncio.gather(
        corpus_task,
        openalex_task,
    )

    corpus_papers = [
        paper for paper in corpus_papers
        if is_valid_publication_date(
            paper.get("publication_date")
        )
    ]

    openalex_papers = [
        paper for paper in openalex_papers
        if is_valid_publication_date(
            paper.get("publication_date")
        )
    ]

    logger.info(
        "Retrieval completed: corpus=%s openalex=%s",
        len(corpus_papers),
        len(openalex_papers),
    )

    # STEP 3: Merge and deduplicate both sources.

    combined_papers = deduplicate_papers(
        corpus_papers + openalex_papers
    )

    papers_with_abstracts = [
        paper
        for paper in combined_papers
        if paper.get("abstract")
    ]

    # STEP 4: Rank the combined evidence.

    ranked_papers = rank_across_queries(
        papers_with_abstracts,
        queries,
    )

    selected_papers = ranked_papers[:MAX_EVIDENCE_COUNT]

    # STEP 5: Persist newly discovered OpenAlex papers.

    ranked_openalex = rank_across_queries(
        openalex_papers,
        queries,
    )

    persisted_count = await persist_discovered_papers(
        ranked_openalex
    )

    # STEP 6: Generate grounded research answer.

    if selected_papers:
        answer = await generate_research_answer(
            question=question,
            papers=selected_papers,
        )
    else:
        answer = (
            "I couldn't find research papers with usable abstracts "
            "for this question. Try a more specific research topic."
        )

    # STEP 7: Build citation sources.

    sources = []

    for paper in selected_papers:
        metadata = paper.get("metadata") or {}

        sources.append({
            "id": paper.get("id"),
            "openalex_id": paper.get("openalex_id"),
            "title": paper.get("title"),
            "authors": paper.get("authors") or [],
            "publication_date": paper.get("publication_date"),
            "doi": paper.get("doi"),
            "paper_url": paper.get("paper_url"),
            "pdf_url": paper.get("pdf_url"),
            "citation_count": (
                metadata.get("citation_count", 0)
            ),
            "abstract": paper.get("abstract"),
        })

    # STEP 8: Return retrieval statistics.

    return {
        "answer": answer,
        "sources": sources,
        "research": {
            "total_found": len(combined_papers),
            "corpus_retrieved": len(corpus_papers),
            "openalex_discovered": len(openalex_papers),
            "unique_combined": len(combined_papers),
            "analysed": len(selected_papers),
            "new_papers_persisted": persisted_count,
            "queries": queries,
            "openalex_pages_per_query": (
                OPENALEX_MAX_PAGES_PER_QUERY
            ),
            "openalex_page_size": OPENALEX_PAGE_SIZE,
        },
    }


# ============================================================
# PUBLIC RESEARCH ENTRY POINT
# ============================================================

async def answer_research_question(question: str):
    """
    Execute the complete ZERA workflow with a global deadline.

    Maximum execution time: 240 seconds.
    """

    try:
        return await asyncio.wait_for(
            _answer_research_question(question),
            timeout=TOTAL_RESEARCH_TIMEOUT,
        )

    except asyncio.TimeoutError as exc:
        logger.error(
            "ZERA research workflow exceeded %s seconds.",
            TOTAL_RESEARCH_TIMEOUT,
        )

        raise TimeoutError(
            "ZERA research request exceeded its 240-second "
            "execution limit. Please try again."
        ) from exc
