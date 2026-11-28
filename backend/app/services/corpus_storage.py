
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

TOPIC_METADATA_LISTS = (
    "topics",
    "topic_ids",
    "topic_names",
    "subfields",
    "fields",
    "domains",
)


# ============================================================
# SUPABASE CONNECTION
# ============================================================

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


# ============================================================
# IDENTIFIER NORMALIZATION
# ============================================================

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


# ============================================================
# METADATA MERGING
# ============================================================

def merge_string_lists(*values):
    """
    Merge lists of strings while preserving order.
    """

    result = []
    seen = set()

    for value_list in values:
        if not isinstance(value_list, list):
            continue

        for value in value_list:
            if not isinstance(value, str) or not value.strip():
                continue

            normalized = value.strip()

            key = normalized.casefold()

            if key not in seen:
                seen.add(key)
                result.append(normalized)

    return result


def merge_topic_objects(*values):
    """
    Merge OpenAlex topic dictionaries using their topic IDs.

    Topics without IDs are deduplicated using their display names.
    Incoming non-empty metadata enriches existing topic records.
    """

    result = []
    positions = {}

    for topic_list in values:
        if not isinstance(topic_list, list):
            continue

        for topic in topic_list:
            if not isinstance(topic, dict):
                continue

            topic_id = topic.get("id")
            display_name = topic.get("display_name")

            if topic_id:
                key = str(topic_id).casefold()
            elif display_name:
                key = str(display_name).casefold()
            else:
                continue

            if key not in positions:
                positions[key] = len(result)
                result.append(dict(topic))
                continue

            index = positions[key]
            previous = result[index]

            merged = dict(previous)

            for field, value in topic.items():
                if value is None or value == "":
                    continue

                if isinstance(value, dict):
                    old_nested = merged.get(field) or {}

                    if isinstance(old_nested, dict):
                        merged[field] = {
                            **old_nested,
                            **{
                                nested_key: nested_value
                                for nested_key, nested_value in value.items()
                                if nested_value is not None
                                and nested_value != ""
                            },
                        }
                elif not merged.get(field):
                    merged[field] = value

            result[index] = merged

    return result


def merge_metadata(
    old_metadata: dict | None,
    new_metadata: dict | None,
):
    """
    Merge metadata without losing existing topic classifications.
    """

    old_metadata = old_metadata or {}
    new_metadata = new_metadata or {}

    metadata = {
        **old_metadata,
        **{
            key: value
            for key, value in new_metadata.items()
            if value is not None
        },
    }

    for key in TOPIC_METADATA_LISTS:
        old_values = old_metadata.get(key) or []
        new_values = new_metadata.get(key) or []

        if key == "topics":
            merged = merge_topic_objects(
                old_values,
                new_values,
            )
        else:
            merged = merge_string_lists(
                old_values,
                new_values,
            )

        if merged:
            metadata[key] = merged

    return metadata


# ============================================================
# EXISTING PAPER LOOKUP
# ============================================================

def _index_record(index: dict, record: dict):
    identifiers = paper_identifiers(record)

    for identifier_type, value in identifiers.items():
        if not value:
            continue

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

    Existing Supabase UUIDs are retained.
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

    # OpenAlex and arXiv identifiers can be fetched in batches.
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

    # DOI lookup uses case-insensitive matching.
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


def find_existing_record(
    paper: dict,
    existing: dict,
):
    """
    Find one consistent existing Supabase record.

    Never silently merge two different database rows.
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


# ============================================================
# PAPER RECORD PREPARATION
# ============================================================

def prepare_paper_record(
    paper: dict,
    existing: dict | None = None,
):
    """
    Merge incoming paper information with existing Supabase data.

    Preserves:
    - Existing UUID
    - Existing useful abstracts
    - DOI and arXiv identifiers
    - Existing classifications
    - All discovered OpenAlex topics
    """

    existing = existing or {}

    old_metadata = existing.get("metadata") or {}
    new_metadata = paper.get("metadata") or {}

    metadata = merge_metadata(
        old_metadata,
        new_metadata,
    )

    incoming_title = paper.get("title")

    if not incoming_title or incoming_title == "Untitled paper":
        incoming_title = (
            existing.get("title")
            or "Untitled paper"
        )

    authors = (
        paper.get("authors")
        or existing.get("authors")
        or []
    )

    categories = merge_string_lists(
        existing.get("categories") or [],
        paper.get("categories") or [],
    )

    return {
        "title": incoming_title,
        "authors": authors,
        "abstract": (
            paper.get("abstract")
            or existing.get("abstract")
        ),
        "doi": (
            paper.get("doi")
            or existing.get("doi")
        ),
        "arxiv_id": (
            paper.get("arxiv_id")
            or existing.get("arxiv_id")
        ),
        "source": (
            paper.get("source")
            or existing.get("source")
        ),
        "publication_date": (
            paper.get("publication_date")
            or existing.get("publication_date")
        ),
        "categories": categories,
        "paper_url": (
            paper.get("paper_url")
            or existing.get("paper_url")
        ),
        "pdf_url": (
            paper.get("pdf_url")
            or existing.get("pdf_url")
        ),
        "openalex_id": (
            paper.get("openalex_id")
            or existing.get("openalex_id")
        ),
        "metadata": metadata,
    }


# ============================================================
# INSERT CONFLICT RECOVERY
# ============================================================

async def _resolve_insert_conflict(
    client: httpx.AsyncClient,
    batch: list[dict],
):
    """
    Recover from concurrent unique-index conflicts.
    """

    existing = await fetch_existing_papers(
        client,
        batch,
    )

    resolved = {}

    for paper in batch:
        record = find_existing_record(
            paper,
            existing,
        )

        if not record:
            raise RuntimeError(
                "Paper insert conflicted with a unique constraint, "
                "but the existing record could not be resolved."
            )

        resolved[paper["openalex_id"]] = record["id"]

    return resolved


# ============================================================
# SAVE PAPER BATCH
# ============================================================

async def save_paper_batch(papers: list[dict]):
    """
    Save or update a batch of OpenAlex papers.

    Returns:
        {
            openalex_id: supabase_paper_uuid
        }

    Existing records are enriched rather than duplicated.
    """

    if not papers:
        return {}

    for paper in papers:
        if not paper.get("openalex_id"):
            raise ValueError(
                "Cannot store a paper without openalex_id."
            )

    unique_papers = {}

    for paper in papers:
        openalex_id = paper["openalex_id"]

        if openalex_id in unique_papers:
            previous = unique_papers[openalex_id]

            if (
                paper_identifiers(previous)
                != paper_identifiers(paper)
            ):
                raise ValueError(
                    f"Conflicting incoming records for {openalex_id}"
                )

            unique_papers[openalex_id] = prepare_paper_record(
                paper,
                previous,
            )

            continue

        unique_papers[openalex_id] = paper

    papers = list(unique_papers.values())

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        existing = await fetch_existing_papers(
            client,
            papers,
        )

        resolved = {}
        updates = []
        inserts = []

        for paper in papers:
            record = find_existing_record(
                paper,
                existing,
            )

            if record:
                paper_id = record["id"]

                resolved[paper["openalex_id"]] = paper_id

                payload = prepare_paper_record(
                    paper,
                    record,
                )

                updates.append((paper_id, payload))

            else:
                inserts.append(
                    prepare_paper_record(paper)
                )

        # Update existing records while preserving their UUIDs.
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

        # Insert genuinely new papers in batches.
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
                        paper
                        for paper in papers
                        if paper["openalex_id"] in {
                            item["openalex_id"]
                            for item in batch
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
                record = returned_by_id.get(
                    item.get("openalex_id")
                )

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


# ============================================================
# CORPUS MEMBERSHIP
# ============================================================

async def link_paper_batch(
    corpus_id: str,
    paper_ids: list[str],
    discovery_query: str | None = None,
):
    """
    Link papers to a corpus.

    The composite primary key prevents duplicate memberships.
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
    """
    Update collection progress and checkpoints.
    """

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
    """
    Extract useful searchable terms from a research query.
    """

    words = re.findall(
        r"[a-zA-Z0-9-]+",
        query.lower(),
    )

    terms = [
        word
        for word in words
        if len(word) > 1
        and word not in SEARCH_STOP_WORDS
    ]

    return list(dict.fromkeys(terms))[:8]


def rank_corpus_papers(
    papers: list[dict],
    query: str,
) -> list[dict]:
    """
    Rank papers using:
    - Exact phrase matches
    - Title relevance
    - Abstract relevance
    - OpenAlex topic metadata
    - Citation count
    - Publication date
    """

    terms = extract_search_terms(query)
    phrase = query.lower().strip()

    ranked = []

    for paper in papers:
        title = (
            paper.get("title") or ""
        ).lower()

        abstract = (
            paper.get("abstract") or ""
        ).lower()

        metadata = paper.get("metadata") or {}

        topic_text = " ".join(
            str(value)
            for key in (
                "topic_names",
                "subfields",
                "fields",
                "domains",
            )
            for value in (metadata.get(key) or [])
        ).lower()

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

            if term in topic_text:
                score += 3

        if score > 0:
            ranked.append((score, paper))

    ranked.sort(
        key=lambda item: (
            item[0],
            item[1].get(
                "metadata", {}
            ).get("citation_count", 0) or 0,
            item[1].get("publication_date") or "",
        ),
        reverse=True,
    )

    return [
        paper
        for _, paper in ranked
    ]


async def search_corpus_papers(
    query: str,
    limit: int = 50,
) -> list[dict]:
    """
    Search the shared research library.

    Searches titles and abstracts across all stored domains.
    The candidate pool is configurable independently of the
    final number of papers returned.
    """

    if not query or not query.strip():
        return []

    if not 1 <= limit <= 100:
        raise ValueError(
            "limit must be between 1 and 100."
        )

    terms = extract_search_terms(query)

    if not terms:
        return []

    settings = get_settings()

    candidate_limit = getattr(
        settings,
        "corpus_retrieval_candidates",
        400,
    )

    candidate_limit = max(
        limit,
        min(int(candidate_limit), 1000),
    )

    conditions = []

    for term in terms:
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
        "limit": candidate_limit,
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(
            get_url("papers"),
            headers=get_headers(),
            params=params,
        )

        response.raise_for_status()

        papers = response.json()

    ranked = rank_corpus_papers(
        papers,
        query,
    )

    return ranked[:limit]
