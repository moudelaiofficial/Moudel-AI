
import logging
import re

import httpx

from app.config import get_settings


logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(30.0, connect=5.0)

BATCH_SIZE = 50
LINK_BATCH_SIZE = 100

PAPER_SELECT = (
    "id,openalex_id,doi,arxiv_id,title,authors,abstract,"
    "source,publication_date,categories,paper_url,pdf_url,metadata"
)

SEARCH_STOP_WORDS = {
    "what", "which", "who", "when", "where", "why", "how",
    "the", "a", "an", "is", "are", "was", "were",
    "of", "in", "on", "for", "to", "and", "or", "with",
    "about", "from", "their", "its", "this", "that",
    "research", "study", "studies", "paper", "papers",
    "explain", "discuss", "describe",
}


def get_headers(prefer: str | None = None):
    settings = get_settings()
    key = settings.supabase_service_role_key

    if not key:
        raise RuntimeError(
            "SUPABASE_SERVICE_ROLE_KEY is not configured."
        )

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    if prefer:
        headers["Prefer"] = prefer

    return headers


def get_url(table: str):
    settings = get_settings()

    return (
        f"{settings.supabase_url.rstrip('/')}"
        f"/rest/v1/{table}"
    )


def chunks(items: list, size: int = BATCH_SIZE):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def normalize_doi(value: str | None):
    if not value:
        return None

    value = value.strip().lower()

    for prefix in (
        "https://doi.org/",
        "http://doi.org/",
        "https://dx.doi.org/",
        "http://dx.doi.org/",
        "doi:",
    ):
        if value.startswith(prefix):
            value = value[len(prefix):]
            break

    return value.strip() or None


def normalize_arxiv_id(value: str | None):
    if not value:
        return None

    value = value.strip()

    for prefix in (
        "https://arxiv.org/abs/",
        "http://arxiv.org/abs/",
        "https://arxiv.org/pdf/",
        "http://arxiv.org/pdf/",
        "arxiv:",
    ):
        if value.lower().startswith(prefix):
            value = value[len(prefix):]
            break

    if value.lower().endswith(".pdf"):
        value = value[:-4]

    return value.strip() or None


def paper_identifiers(paper: dict):
    return {
        "openalex_id": paper.get("openalex_id"),
        "doi": normalize_doi(paper.get("doi")),
        "arxiv_id": normalize_arxiv_id(
            paper.get("arxiv_id")
        ),
    }


def _index_record(index: dict, record: dict):
    identifiers = paper_identifiers(record)

    for identifier_type, value in identifiers.items():
        if value:
            key = (identifier_type, value)

            previous = index.get(key)

            if previous and previous["id"] != record["id"]:
                raise ValueError(
                    f"Database identity conflict for {identifier_type}: "
                    f"{value}"
                )

            index[key] = record


async def fetch_existing_papers(
    client: httpx.AsyncClient,
    papers: list[dict],
):
    """
    Retrieve existing papers using OpenAlex ID, DOI and arXiv ID.

    DOI matching uses PostgREST ilike for case-insensitive
    matching. Results are verified using normalized DOI values.
    """

    identifiers = {
        "openalex_id": set(),
        "doi": set(),
        "arxiv_id": set(),
    }

    for paper in papers:
        for key, value in paper_identifiers(paper).items():
            if value:
                identifiers[key].add(value)

    existing = {}

    for column in ("openalex_id", "arxiv_id"):
        values = sorted(identifiers[column])

        for batch in chunks(values):
            if not batch:
                continue

            response = await client.get(
                get_url("papers"),
                headers=get_headers(),
                params={
                    "select": PAPER_SELECT,
                    column: "in.(" + ",".join(batch) + ")",
                    "limit": len(batch) + 10,
                },
            )

            response.raise_for_status()

            for record in response.json():
                _index_record(existing, record)

    for doi in sorted(identifiers["doi"]):
        response = await client.get(
            get_url("papers"),
            headers=get_headers(),
            params={
                "select": PAPER_SELECT,
                "doi": f"ilike.{doi}",
                "limit": 100,
            },
        )

        response.raise_for_status()

        for record in response.json():
            if normalize_doi(record.get("doi")) == doi:
                _index_record(existing, record)

    return existing


def find_existing_record(paper: dict, existing: dict):
    """
    Return one consistent existing record.

    Never automatically merge two different Supabase rows.
    """

    matches = {}

    for identifier_type, value in paper_identifiers(paper).items():
        if not value:
            continue

        record = existing.get((identifier_type, value))

        if record:
            matches[record["id"]] = record

    if len(matches) > 1:
        raise ValueError(
            "Paper identity conflict: incoming identifiers "
            "match multiple existing database records. "
            "Manual reconciliation is required."
        )

    return next(iter(matches.values()), None)


def prepare_paper_record(
    paper: dict,
    existing: dict | None = None,
):
    """
    Merge incoming metadata without erasing useful existing data.
    """

    existing = existing or {}

    old_metadata = existing.get("metadata") or {}
    new_metadata = paper.get("metadata") or {}

    metadata = {
        **old_metadata,
        **{
            key: value
            for key, value in new_metadata.items()
            if value is not None
        },
    }

    incoming_title = paper.get("title")

    if not incoming_title or incoming_title == "Untitled paper":
        incoming_title = existing.get("title") or "Untitled paper"

    authors = paper.get("authors") or existing.get("authors") or []

    categories = (
        paper.get("categories")
        or existing.get("categories")
        or []
    )

    return {
        "title": incoming_title,
        "authors": authors,
        "abstract": paper.get("abstract") or existing.get("abstract"),
        "doi": paper.get("doi") or existing.get("doi"),
        "arxiv_id": (
            paper.get("arxiv_id")
            or existing.get("arxiv_id")
        ),
        "source": paper.get("source") or existing.get("source"),
        "publication_date": (
            paper.get("publication_date")
            or existing.get("publication_date")
        ),
        "categories": categories,
        "paper_url": paper.get("paper_url") or existing.get("paper_url"),
        "pdf_url": paper.get("pdf_url") or existing.get("pdf_url"),
        "openalex_id": (
            paper.get("openalex_id")
            or existing.get("openalex_id")
        ),
        "metadata": metadata,
    }


async def _resolve_insert_conflict(
    client: httpx.AsyncClient,
    batch: list[dict],
):
    """
    Recover from a concurrent unique-index conflict.

    Re-fetch records instead of creating duplicate identities.
    """

    existing = await fetch_existing_papers(client, batch)

    resolved = {}

    for paper in batch:
        record = find_existing_record(paper, existing)

        if not record:
            raise RuntimeError(
                "Paper insert conflicted with a unique constraint, "
                "but the existing record could not be resolved."
            )

        resolved[paper["openalex_id"]] = record["id"]

    return resolved


async def save_paper_batch(papers: list[dict]):
    """
    Save a batch of papers.

    Returns:
        {
            openalex_id: supabase_paper_uuid
        }

    Existing UUIDs and relationships are preserved.
    """

    if not papers:
        return {}

    for paper in papers:
        if not paper.get("openalex_id"):
            raise ValueError(
                "Cannot store an OpenAlex paper without openalex_id."
            )

    unique_papers = {}

    for paper in papers:
        openalex_id = paper["openalex_id"]

        if openalex_id in unique_papers:
            previous = unique_papers[openalex_id]

            if paper_identifiers(previous) != paper_identifiers(paper):
                raise ValueError(
                    f"Conflicting incoming records for {openalex_id}"
                )

            continue

        unique_papers[openalex_id] = paper

    papers = list(unique_papers.values())

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        existing = await fetch_existing_papers(client, papers)

        resolved = {}
        updates = []
        inserts = []

        for paper in papers:
            record = find_existing_record(paper, existing)

            if record:
                paper_id = record["id"]

                resolved[paper["openalex_id"]] = paper_id

                updates.append(
                    (
                        paper_id,
                        prepare_paper_record(paper, record),
                    )
                )
            else:
                inserts.append(
                    prepare_paper_record(paper)
                )

        for paper_id, payload in updates:
            response = await client.patch(
                get_url("papers"),
                headers=get_headers("return=minimal"),
                params={
                    "id": f"eq.{paper_id}",
                },
                json=payload,
            )

            response.raise_for_status()

        for batch in chunks(inserts):
            response = await client.post(
                get_url("papers"),
                headers=get_headers("return=representation"),
                json=batch,
            )

            if response.status_code == 409:
                recovered = await _resolve_insert_conflict(
                    client,
                    [
                        paper for paper in papers
                        if paper["openalex_id"] in {
                            item["openalex_id"] for item in batch
                        }
                    ],
                )

                resolved.update(recovered)
                continue

            response.raise_for_status()

            returned_records = response.json()

            returned_by_id = {
                record.get("openalex_id"): record
                for record in returned_records
            }

            for item in batch:
                record = returned_by_id.get(item.get("openalex_id"))

                if not record:
                    raise RuntimeError(
                        "Supabase did not return an inserted paper."
                    )

                resolved[record["openalex_id"]] = record["id"]

    if len(resolved) != len(papers):
        raise RuntimeError(
            "Not all papers could be resolved after persistence."
        )

    return resolved


async def link_paper_batch(
    corpus_id: str,
    paper_ids: list[str],
    discovery_query: str | None = None,
):
    """
    Link papers to a corpus using the composite primary key.

    Repeated links are ignored.
    """

    if not paper_ids:
        return

    unique_ids = list(dict.fromkeys(paper_ids))

    headers = get_headers(
        "resolution=ignore-duplicates,return=minimal"
    )

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        for batch in chunks(unique_ids, LINK_BATCH_SIZE):
            records = [
                {
                    "corpus_id": corpus_id,
                    "paper_id": paper_id,
                    "discovery_query": discovery_query,
                }
                for paper_id in batch
            ]

            response = await client.post(
                get_url("research_corpus_papers"),
                headers=headers,
                params={
                    "on_conflict": "corpus_id,paper_id",
                },
                json=records,
            )

            response.raise_for_status()


async def update_corpus_progress(
    corpus_id: str,
    updates: dict,
):
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.patch(
            get_url("research_corpora"),
            headers=get_headers("return=minimal"),
            params={
                "id": f"eq.{corpus_id}",
            },
            json=updates,
        )

        response.raise_for_status()


# ============================================================
# SHARED RESEARCH CORPUS RETRIEVAL
# ============================================================

def extract_search_terms(query: str) -> list[str]:
    """Extract useful searchable terms from a research query."""

    words = re.findall(r"[a-zA-Z0-9-]+", query.lower())

    terms = [
        word for word in words
        if len(word) > 1 and word not in SEARCH_STOP_WORDS
    ]

    return list(dict.fromkeys(terms))[:8]


def rank_corpus_papers(
    papers: list[dict],
    query: str,
) -> list[dict]:
    """
    Rank papers using title and abstract keyword relevance.

    Citation count and publication date are secondary signals.
    """

    terms = extract_search_terms(query)
    phrase = query.lower().strip()

    ranked = []

    for paper in papers:
        title = (paper.get("title") or "").lower()
        abstract = (paper.get("abstract") or "").lower()

        score = 0

        if phrase and phrase in title:
            score += 20

        if phrase and phrase in abstract:
            score += 8

        for term in terms:
            if term in title:
                score += 5

            if term in abstract:
                score += 1

        if score > 0:
            ranked.append((score, paper))

    ranked.sort(
        key=lambda item: (
            item[0],
            item[1].get("metadata", {}).get("citation_count", 0) or 0,
            item[1].get("publication_date") or "",
        ),
        reverse=True,
    )

    return [paper for _, paper in ranked]


async def search_corpus_papers(
    query: str,
    limit: int = 50,
) -> list[dict]:
    """
    Search the shared Supabase research library.

    Searches titles and abstracts across all stored research domains.
    No corpus filter is applied, so interdisciplinary papers remain
    discoverable regardless of their primary category.
    """

    if not query or not query.strip():
        return []

    if not 1 <= limit <= 100:
        raise ValueError("limit must be between 1 and 100.")

    terms = extract_search_terms(query)

    if not terms:
        return []

    conditions = []

    for term in terms:
        # Escape PostgREST filter syntax characters.
        safe_term = (
            term.replace("\\", "\\\\")
            .replace("*", "\\*")
            .replace(",", "\\,")
            .replace("(", "\\(")
            .replace(")", "\\)")
        )

        conditions.extend([
            f"title.ilike.*{safe_term}*",
            f"abstract.ilike.*{safe_term}*",
        ])

    params = {
        "select": PAPER_SELECT,
        "or": f"({','.join(conditions)})",
        "abstract": "not.is.null",
        "limit": min(limit * 4, 400),
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(
            get_url("papers"),
            headers=get_headers(),
            params=params,
        )

        response.raise_for_status()

        papers = response.json()

    ranked = rank_corpus_papers(papers, query)

    return ranked[:limit]
