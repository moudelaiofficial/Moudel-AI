
import logging
from datetime import date

from app.services.research.openalex import search_openalex
from app.services.gemini import (
    generate_research_answer,
    generate_research_queries,
)
from app.services.corpus_storage import (
    search_corpus_papers,
    save_paper_batch,
    normalize_doi,
)
from app.services.corpus import normalize_for_storage


logger = logging.getLogger(__name__)

# Retrieval configuration
CORPUS_RETRIEVAL_LIMIT = 50
MINIMUM_EVIDENCE_COUNT = 15
MAX_EVIDENCE_COUNT = 20
OPENALEX_RESULTS_PER_QUERY = 15


def is_valid_publication_date(value: str | None) -> bool:
    if not value:
        return True

    try:
        published = date.fromisoformat(value[:10])
        return published <= date.today()
    except (ValueError, TypeError):
        return False


def get_paper_key(paper: dict) -> str:
    """
    Generate a stable identity key for deduplication.
    """

    doi = normalize_doi(paper.get("doi"))

    if doi:
        return f"doi:{doi}"

    openalex_id = paper.get("openalex_id")

    if not openalex_id:
        openalex_id = paper.get("id")

    if openalex_id:
        return f"openalex:{openalex_id.rstrip('/').split('/')[-1].lower()}"

    paper_id = paper.get("id")

    if paper_id:
        return f"id:{paper_id}"

    return ""


def merge_paper_metadata(
    existing: dict,
    incoming: dict,
) -> dict:
    """
    Preserve useful metadata when the same paper is discovered
    through different retrieval sources.
    """

    merged = dict(existing)

    for key, value in incoming.items():
        if value is None or value == "":
            continue

        if key == "authors" and not value:
            continue

        if key == "abstract" and not value:
            continue

        if not merged.get(key):
            merged[key] = value

    return merged


def deduplicate_papers(papers: list[dict]) -> list[dict]:
    """
    Deduplicate papers using DOI and OpenAlex identity.
    """

    unique = {}

    for paper in papers:
        key = get_paper_key(paper)

        if not key:
            continue

        if key in unique:
            unique[key] = merge_paper_metadata(
                unique[key],
                paper,
            )
        else:
            unique[key] = paper

    return list(unique.values())


def prepare_openalex_paper(paper: dict) -> dict | None:
    """
    Convert an OpenAlex result into the shared Supabase schema.
    """

    if not paper.get("id"):
        return None

    openalex_id = paper["id"].rstrip("/").split("/")[-1]

    if not openalex_id:
        return None

    return normalize_for_storage({
        **paper,
        "id": paper["id"],
    })


async def retrieve_from_corpus(
    queries: list[str],
) -> list[dict]:
    """
    Search the shared research library across all generated queries.
    """

    retrieved = []

    for query in queries:
        try:
            papers = await search_corpus_papers(
                query=query,
                limit=CORPUS_RETRIEVAL_LIMIT,
            )

            retrieved.extend(papers)

            logger.info(
                "Corpus retrieval: query=%s results=%s",
                query,
                len(papers),
            )

        except Exception:
            logger.exception(
                "Corpus retrieval failed for query: %s",
                query,
            )

    return deduplicate_papers(retrieved)


async def retrieve_from_openalex(
    queries: list[str],
) -> tuple[list[dict], list[dict]]:
    """
    Discover additional papers through OpenAlex.

    Returns:
        answer_papers: Normalized OpenAlex results.
        storage_papers: Records ready for Supabase persistence.
    """

    discovered = []

    for query in queries:
        try:
            research = await search_openalex(
                query=query,
                page=1,
                limit=OPENALEX_RESULTS_PER_QUERY,
                sort="relevance",
                category=None,
                year=None,
            )

            results = research.get("results", [])

            discovered.extend(results)

            logger.info(
                "OpenAlex discovery: query=%s results=%s total=%s",
                query,
                len(results),
                research.get("total_count", 0),
            )

        except Exception:
            logger.exception(
                "OpenAlex discovery failed for query: %s",
                query,
            )

    discovered = deduplicate_papers(discovered)

    answer_papers = [
        paper for paper in discovered
        if is_valid_publication_date(
            paper.get("publication_date")
        )
    ]

    storage_papers = []

    for paper in answer_papers:
        try:
            normalized = prepare_openalex_paper(paper)

            if normalized:
                storage_papers.append(normalized)

        except Exception:
            logger.exception(
                "Unable to normalize discovered paper: %s",
                paper.get("id"),
            )

    return answer_papers, storage_papers


async def persist_discovered_papers(
    papers: list[dict],
) -> int:
    """
    Persist newly discovered OpenAlex papers in the shared
    papers table so future research questions can reuse them.
    """

    if not papers:
        return 0

    try:
        resolved = await save_paper_batch(papers)

        logger.info(
            "Persisted or resolved %s discovered papers.",
            len(resolved),
        )

        return len(resolved)

    except Exception:
        logger.exception(
            "Failed to persist discovered research papers."
        )

        return 0


async def answer_research_question(question: str):
    """
    Main ZERA research workflow.

    1. Generate related academic queries.
    2. Search the shared Supabase corpus.
    3. Assess available abstract evidence.
    4. Supplement insufficient evidence through OpenAlex.
    5. Persist newly discovered papers.
    6. Generate a grounded research answer.
    """

    if not question or not question.strip():
        raise ValueError(
            "Please provide a research question."
        )

    # --------------------------------------------------------
    # STEP 1: Generate related academic queries
    # --------------------------------------------------------

    queries = await generate_research_queries(question)

    if not queries:
        raise ValueError(
            "Please provide a clearer research question or topic."
        )

    queries = list(dict.fromkeys(
        query.strip()
        for query in queries
        if isinstance(query, str) and query.strip()
    ))[:5]

    if not queries:
        raise ValueError(
            "Unable to generate useful research queries."
        )

    logger.info(
        "ZERA generated %s research queries.",
        len(queries),
    )

    # --------------------------------------------------------
    # STEP 2: Search the shared Supabase corpus
    # --------------------------------------------------------

    corpus_papers = await retrieve_from_corpus(queries)

    corpus_papers = [
        paper for paper in corpus_papers
        if is_valid_publication_date(
            paper.get("publication_date")
        )
    ]

    corpus_with_abstracts = [
        paper for paper in corpus_papers
        if paper.get("abstract")
    ]

    logger.info(
        "ZERA retrieved %s corpus papers, %s with abstracts.",
        len(corpus_papers),
        len(corpus_with_abstracts),
    )

    # --------------------------------------------------------
    # STEP 3: Supplement insufficient evidence using OpenAlex
    # --------------------------------------------------------

    openalex_papers = []
    persisted_count = 0

    if len(corpus_with_abstracts) < MINIMUM_EVIDENCE_COUNT:

        logger.info(
            "Corpus evidence insufficient. Starting OpenAlex discovery."
        )

        openalex_papers, storage_papers = (
            await retrieve_from_openalex(queries)
        )

        persisted_count = await persist_discovered_papers(
            storage_papers
        )

    # --------------------------------------------------------
    # STEP 4: Combine and deduplicate all retrieved papers
    # --------------------------------------------------------

    combined_papers = deduplicate_papers(
        corpus_papers + openalex_papers
    )

    combined_papers = [
        paper for paper in combined_papers
        if is_valid_publication_date(
            paper.get("publication_date")
        )
    ]

    papers_with_abstracts = [
        paper for paper in combined_papers
        if paper.get("abstract")
    ]

    # --------------------------------------------------------
    # STEP 5: Rank and select evidence
    # --------------------------------------------------------

    from app.services.corpus_storage import rank_corpus_papers

    ranked_papers = []

    # Use each generated query to contribute relevant results.
    for query in queries:
        ranked_papers.extend(
            rank_corpus_papers(
                papers_with_abstracts,
                query,
            )
        )

    ranked_papers = deduplicate_papers(ranked_papers)

    # Preserve any retrieved papers not matched by keyword ranking.
    ranked_keys = {
        get_paper_key(paper)
        for paper in ranked_papers
    }

    for paper in papers_with_abstracts:
        if get_paper_key(paper) not in ranked_keys:
            ranked_papers.append(paper)

    selected_papers = ranked_papers[:MAX_EVIDENCE_COUNT]

    # --------------------------------------------------------
    # STEP 6: Generate the research answer
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # STEP 7: Build citation sources
    # --------------------------------------------------------

    sources = []

    for paper in selected_papers:
        metadata = paper.get("metadata") or {}

        sources.append({
            "id": paper.get("id"),
            "openalex_id": paper.get("openalex_id"),
            "title": paper.get("title"),
            "authors": paper.get("authors", []),
            "publication_date": paper.get("publication_date"),
            "doi": paper.get("doi"),
            "paper_url": paper.get("paper_url"),
            "pdf_url": paper.get("pdf_url"),
            "citation_count": (
                paper.get("citation_count")
                or metadata.get("citation_count", 0)
            ),
            "abstract": paper.get("abstract"),
        })

    # --------------------------------------------------------
    # STEP 8: Return research results and retrieval statistics
    # --------------------------------------------------------

    return {
        "answer": answer,
        "sources": sources,
        "research": {
            "total_found": len(combined_papers),
            "retrieved": len(combined_papers),
            "corpus_retrieved": len(corpus_papers),
            "openalex_discovered": len(openalex_papers),
            "new_papers_persisted": persisted_count,
            "analysed": len(selected_papers),
            "queries": queries,
        },
    }
