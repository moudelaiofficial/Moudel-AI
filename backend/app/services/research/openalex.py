
import httpx

from app.config import get_settings


OPENALEX_URL = "https://api.openalex.org"
TIMEOUT = httpx.Timeout(30.0, connect=5.0)

OPENALEX_PAGE_SIZE = 100


FIELD_CATEGORIES = {
    "computer-science": ["Computer Science"],
    "engineering": ["Engineering"],
    "medicine": [
        "Biomedical and Clinical Sciences",
        "Health Sciences",
    ],
    "physics": ["Physical Sciences"],
}

CATEGORY_ALIASES = {
    "computer science": "computer-science",
    "artificial intelligence": "artificial-intelligence",
    "medicine": "medicine",
    "engineering": "engineering",
    "physics": "physics",
    "all research": None,
}

WORK_SELECT = (
    "id,doi,title,publication_date,authorships,"
    "abstract_inverted_index,primary_location,"
    "best_oa_location,open_access,cited_by_count,"
    "type,primary_topic,topics"
)


def get_openalex_params():
    settings = get_settings()

    if not settings.openalex_api_key:
        raise RuntimeError(
            "OPENALEX_API_KEY is not configured."
        )

    return {"api_key": settings.openalex_api_key}


def extract_openalex_id(value):
    if not value:
        return None

    return str(value).rstrip("/").split("/")[-1]


def reconstruct_abstract(inverted_index):
    if not inverted_index:
        return None

    words = []

    for word, positions in inverted_index.items():
        for position in positions:
            words.append((position, word))

    words.sort(key=lambda item: item[0])

    return " ".join(word for _, word in words)


def normalize_topic(topic):
    if not topic:
        return None

    subfield = topic.get("subfield") or {}
    field = topic.get("field") or {}
    domain = topic.get("domain") or {}

    return {
        "id": extract_openalex_id(topic.get("id")),
        "display_name": topic.get("display_name"),
        "score": topic.get("score"),
        "subfield": {
            "id": extract_openalex_id(subfield.get("id")),
            "display_name": subfield.get("display_name"),
        } if subfield else None,
        "field": {
            "id": extract_openalex_id(field.get("id")),
            "display_name": field.get("display_name"),
        } if field else None,
        "domain": {
            "id": extract_openalex_id(domain.get("id")),
            "display_name": domain.get("display_name"),
        } if domain else None,
    }


def normalize_paper(paper):
    authors = [
        authorship.get("author", {}).get("display_name")
        for authorship in paper.get("authorships", [])
        if authorship.get("author")
        and authorship.get("author", {}).get("display_name")
    ]

    best_location = paper.get("best_oa_location") or {}
    primary_location = paper.get("primary_location") or {}
    source = primary_location.get("source") or {}

    primary_topic = normalize_topic(
        paper.get("primary_topic")
    )

    topics = [
        normalized
        for topic in paper.get("topics", [])
        if (normalized := normalize_topic(topic))
    ]

    if not topics and primary_topic:
        topics = [primary_topic]

    primary_topic_name = (
        primary_topic.get("display_name")
        if primary_topic else None
    )

    primary_subfield = (
        primary_topic.get("subfield") or {}
        if primary_topic else {}
    )

    primary_field = (
        primary_topic.get("field") or {}
        if primary_topic else {}
    )

    primary_domain = (
        primary_topic.get("domain") or {}
        if primary_topic else {}
    )

    return {
        "id": paper.get("id"),
        "title": paper.get("title") or "Untitled paper",
        "authors": authors,
        "abstract": reconstruct_abstract(
            paper.get("abstract_inverted_index")
        ),
        "doi": paper.get("doi"),
        "publication_date": paper.get("publication_date"),
        "source": source.get("display_name"),
        "paper_url": (
            best_location.get("landing_page_url")
            or primary_location.get("landing_page_url")
        ),
        "pdf_url": best_location.get("pdf_url"),
        "is_open_access": (
            paper.get("open_access") or {}
        ).get("is_oa", False),
        "citation_count": paper.get("cited_by_count", 0),
        "type": paper.get("type"),
        "primary_topic": primary_topic_name,
        "subfield": primary_subfield.get("display_name"),
        "field": primary_field.get("display_name"),
        "domain": primary_domain.get("display_name"),
        "primary_topic_id": (
            primary_topic.get("id")
            if primary_topic else None
        ),
        "topics": topics,
    }


async def resolve_field_ids(client, field_names):
    field_ids = []

    for field_name in field_names:
        response = await client.get(
            f"{OPENALEX_URL}/fields",
            params={
                "search": field_name,
                "per-page": 50,
                "select": "id,display_name",
            },
        )

        response.raise_for_status()

        for field in response.json().get("results", []):
            if (
                field.get("display_name", "").casefold()
                == field_name.casefold()
            ):
                field_ids.append(
                    extract_openalex_id(field["id"])
                )

    return list(dict.fromkeys(field_ids))


async def resolve_ai_subfield_ids(client):
    response = await client.get(
        f"{OPENALEX_URL}/subfields",
        params={
            "search": "artificial intelligence",
            "per-page": 50,
            "select": "id,display_name",
        },
    )

    response.raise_for_status()

    subfield_ids = []

    for subfield in response.json().get("results", []):
        if (
            subfield.get("display_name", "").casefold()
            == "artificial intelligence"
        ):
            subfield_ids.append(
                extract_openalex_id(subfield["id"])
            )

    return list(dict.fromkeys(subfield_ids))


async def resolve_category_filter(client, category):
    if not category:
        return None

    normalized = category.strip().casefold()

    category_key = CATEGORY_ALIASES.get(
        normalized,
        normalized,
    )

    if category_key is None:
        return None

    if category_key == "artificial-intelligence":
        subfield_ids = await resolve_ai_subfield_ids(client)

        if not subfield_ids:
            raise ValueError(
                "Could not resolve Artificial Intelligence in OpenAlex."
            )

        return (
            f"topics.subfield.id:{'|'.join(subfield_ids)}"
        )

    field_names = FIELD_CATEGORIES.get(category_key)

    if not field_names:
        raise ValueError(
            f"Unsupported category: {category}"
        )

    field_ids = await resolve_field_ids(
        client,
        field_names,
    )

    if not field_ids:
        raise ValueError(
            f"Could not resolve OpenAlex fields for: {category}"
        )

    return f"topics.field.id:{'|'.join(field_ids)}"


async def search_openalex(
    query: str | None,
    page: int,
    limit: int,
    sort: str,
    category: str | None,
    year: int | None,
):
    sort_options = {
        "relevance": None,
        "newest": "publication_date:desc",
        "oldest": "publication_date:asc",
    }

    if sort not in sort_options:
        raise ValueError("Invalid sort option.")

    if page < 1:
        raise ValueError("page must be at least 1.")

    if not 1 <= limit <= OPENALEX_PAGE_SIZE:
        raise ValueError(
            f"limit must be between 1 and {OPENALEX_PAGE_SIZE}."
        )

    filters = []

    if year is not None:
        filters.append(f"publication_year:{year}")

    auth_params = get_openalex_params()

    async with httpx.AsyncClient(
        timeout=TIMEOUT,
        params=auth_params,
    ) as client:

        category_filter = await resolve_category_filter(
            client,
            category,
        )

        if category_filter:
            filters.append(category_filter)

        params = {
            "page": page,
            "per-page": limit,
            "select": WORK_SELECT,
        }

        if query and query.strip():
            params["search"] = query.strip()

        if filters:
            params["filter"] = ",".join(filters)

        if sort_options[sort]:
            params["sort"] = sort_options[sort]

        response = await client.get(
            f"{OPENALEX_URL}/works",
            params=params,
        )

        response.raise_for_status()

    payload = response.json()

    return {
        "total_count": payload.get("meta", {}).get("count", 0),
        "page": page,
        "limit": limit,
        "query": query,
        "category": category,
        "year": year,
        "results": [
            normalize_paper(paper)
            for paper in payload.get("results", [])
        ],
    }


async def fetch_openalex_cursor_page(
    query: str,
    cursor: str = "*",
    per_page: int = OPENALEX_PAGE_SIZE,
    has_abstract: bool = False,
):
    """
    Retrieve matching OpenAlex works using cursor pagination.

    has_abstract=True filters out records without abstracts.
    Existing callers remain compatible by default.
    """

    if not query or not query.strip():
        raise ValueError(
            "OpenAlex search query cannot be empty."
        )

    if not 1 <= per_page <= OPENALEX_PAGE_SIZE:
        raise ValueError(
            f"per_page must be between 1 and {OPENALEX_PAGE_SIZE}."
        )

    params = {
        "search": query.strip(),
        "cursor": cursor,
        "per-page": per_page,
        "select": WORK_SELECT,
    }

    if has_abstract:
        params["filter"] = "has_abstract:true"

    return await _fetch_works_page(params)


async def fetch_openalex_topic_cursor_page(
    topic_id: str,
    cursor: str = "*",
    per_page: int = OPENALEX_PAGE_SIZE,
    has_abstract: bool = False,
):
    """
    Retrieve works associated with an OpenAlex topic.
    """

    topic_id = extract_openalex_id(topic_id)

    if not topic_id:
        raise ValueError("A valid OpenAlex topic ID is required.")

    if not 1 <= per_page <= OPENALEX_PAGE_SIZE:
        raise ValueError(
            f"per_page must be between 1 and {OPENALEX_PAGE_SIZE}."
        )

    filters = [f"topics.id:{topic_id}"]

    if has_abstract:
        filters.append("has_abstract:true")

    params = {
        "filter": ",".join(filters),
        "cursor": cursor,
        "per-page": per_page,
        "select": WORK_SELECT,
    }

    return await _fetch_works_page(params)


async def _fetch_works_page(params):
    auth_params = get_openalex_params()

    async with httpx.AsyncClient(
        timeout=TIMEOUT,
        params=auth_params,
    ) as client:

        response = await client.get(
            f"{OPENALEX_URL}/works",
            params=params,
        )

        response.raise_for_status()

    payload = response.json()
    meta = payload.get("meta", {})

    return {
        "total_count": meta.get("count", 0),
        "next_cursor": meta.get("next_cursor"),
        "results": [
            normalize_paper(paper)
            for paper in payload.get("results", [])
        ],
    }


async def fetch_openalex_topics_cursor_page(
    cursor: str = "*",
    per_page: int = 100,
):
    """
    Retrieve OpenAlex's topic catalogue.
    """

    if not 1 <= per_page <= OPENALEX_PAGE_SIZE:
        raise ValueError(
            f"per_page must be between 1 and {OPENALEX_PAGE_SIZE}."
        )

    params = {
        "cursor": cursor,
        "per-page": per_page,
        "select": (
            "id,display_name,description,keywords,"
            "subfield,field,domain"
        ),
    }

    auth_params = get_openalex_params()

    async with httpx.AsyncClient(
        timeout=TIMEOUT,
        params=auth_params,
    ) as client:

        response = await client.get(
            f"{OPENALEX_URL}/topics",
            params=params,
        )

        response.raise_for_status()

    payload = response.json()
    meta = payload.get("meta", {})

    topics = []

    for topic in payload.get("results", []):
        normalized = normalize_topic(topic)

        if normalized:
            normalized["description"] = topic.get("description")
            normalized["keywords"] = topic.get("keywords") or []
            topics.append(normalized)

    return {
        "total_count": meta.get("count", 0),
        "next_cursor": meta.get("next_cursor"),
        "results": topics,
    }


async def fetch_openalex_work(openalex_id: str):
    """
    Fetch one existing OpenAlex work by its ID.
    """

    work_id = extract_openalex_id(openalex_id)

    if not work_id or not work_id.startswith("W"):
        raise ValueError("Invalid OpenAlex work ID.")

    auth_params = get_openalex_params()

    async with httpx.AsyncClient(
        timeout=TIMEOUT,
        params=auth_params,
    ) as client:
        response = await client.get(
            f"{OPENALEX_URL}/works/{work_id}",
            params={"select": WORK_SELECT},
        )
        response.raise_for_status()

    return normalize_paper(response.json())
