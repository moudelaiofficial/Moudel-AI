
import os
import json
import asyncio
import logging

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


# ============================================================
# GROQ CONFIGURATION
# ============================================================

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_QUERY_MODEL = os.getenv(
    "GROQ_QUERY_MODEL",
    "openai/gpt-oss-20b",
)

GROQ_ANSWER_MODEL = os.getenv(
    "GROQ_ANSWER_MODEL",
    "openai/gpt-oss-120b",
)

GROQ_CONNECT_TIMEOUT = 10.0
GROQ_HTTP_TIMEOUT = 120.0

QUERY_GENERATION_TIMEOUT = 30
ANSWER_GENERATION_TIMEOUT = 90


# ============================================================
# GROQ API CLIENT
# ============================================================

async def call_groq(
    prompt: str,
    model: str,
    json_mode: bool = False,
) -> str:
    """
    Execute a Groq chat completion request.

    Uses Groq's OpenAI-compatible API.
    """

    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is missing from the backend environment."
        )

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
    }

    if json_mode:
        payload["response_format"] = {
            "type": "json_object",
        }

    logger.info(
        "ZERA calling Groq model: %s",
        model,
    )

    timeout = httpx.Timeout(
        GROQ_HTTP_TIMEOUT,
        connect=GROQ_CONNECT_TIMEOUT,
    )

    async with httpx.AsyncClient(timeout=timeout) as client:

        response = await client.post(
            GROQ_API_URL,
            headers=headers,
            json=payload,
        )

        if response.is_error:
            logger.error(
                "Groq API error | model=%s | status=%s | response=%s",
                model,
                response.status_code,
                response.text[:2000],
            )

        response.raise_for_status()

        data = response.json()

    choices = data.get("choices") or []

    if not choices:
        raise RuntimeError(
            f"Groq model {model} returned no choices."
        )

    message = choices[0].get("message") or {}

    content = message.get("content")

    if isinstance(content, list):
        content = "".join(
            item.get("text", "")
            for item in content
            if isinstance(item, dict)
        )

    if not isinstance(content, str) or not content.strip():
        raise RuntimeError(
            f"Groq model {model} returned empty output."
        )

    logger.info(
        "ZERA successfully generated response using Groq model: %s",
        model,
    )

    return content.strip()


# ============================================================
# RESEARCH QUERY GENERATION
# ============================================================

async def generate_research_queries(
    question: str,
) -> list[str]:
    """
    Convert a conversational question into focused academic
    literature search queries.

    Maximum execution time: 30 seconds.
    """

    prompt = f"""
You are an academic research search specialist.

Convert the user's question into 3 to 5 focused
academic literature search queries.

USER QUESTION:
{question}

RULES:

1. Preserve the actual research topic.
2. Use terminology commonly found in academic papers.
3. Include closely related technical concepts where useful.
4. Avoid conversational words such as explain, what, latest.
5. Do not generate broad unrelated queries.
6. Each query must be independently useful for academic search.
7. Do not invent a different research topic.

Return ONLY a JSON object containing a "queries" array.

Example:
{{
  "queries": [
    "parameter efficient fine tuning large language models",
    "low rank adaptation LoRA large language models",
    "prompt tuning and adapter based fine tuning",
    "parameter efficient fine tuning comparative evaluation"
  ]
}}
"""

    try:
        response_text = await asyncio.wait_for(
            call_groq(
                prompt=prompt,
                model=GROQ_QUERY_MODEL,
                json_mode=True,
            ),
            timeout=QUERY_GENERATION_TIMEOUT,
        )

        result = json.loads(response_text)

        if isinstance(result, dict):
            queries = result.get("queries")
        elif isinstance(result, list):
            queries = result
        else:
            queries = None

        if not isinstance(queries, list):
            raise ValueError(
                "Groq returned an invalid query format."
            )

        cleaned = [
            item.strip()
            for item in queries
            if isinstance(item, str) and item.strip()
        ]

        if not cleaned:
            raise ValueError(
                "No valid search queries were generated."
            )

        return list(dict.fromkeys(cleaned))[:5]

    except asyncio.TimeoutError:
        logger.warning(
            "Groq query generation exceeded %s seconds. "
            "Using the original research question.",
            QUERY_GENERATION_TIMEOUT,
        )

        return [question]

    except Exception:
        logger.exception(
            "Groq query generation failed. "
            "Using the original research question."
        )

        return [question]


# ============================================================
# RESEARCH ANSWER GENERATION
# ============================================================

async def generate_research_answer(
    question: str,
    papers: list[dict],
) -> str:
    """
    Generate a grounded academic research synthesis
    using retrieved paper abstracts.

    Maximum execution time: 90 seconds.
    """

    paper_context = []

    for index, paper in enumerate(papers, start=1):

        abstract = paper.get("abstract")

        if not abstract:
            continue

        authors = paper.get("authors") or []

        if not isinstance(authors, list):
            authors = []

        author_names = [
            str(author)
            for author in authors
        ]

        paper_context.append(
            f"""
[SOURCE {index}]
Title: {paper.get("title")}
Authors: {", ".join(author_names)}
Publication date: {paper.get("publication_date")}
DOI: {paper.get("doi")}

Abstract:
{abstract[:2500]}
"""
        )

    context = "\n\n".join(paper_context)

    if not context.strip():
        return (
            "I couldn't find research papers with usable abstracts "
            "for this question. Try a more specific research topic."
        )

    prompt = f"""
You are ZERA, the research intelligence assistant inside Moudel AI.

Your role is to communicate academic research with the clarity
of an excellent research analyst and the readability of a
high-quality editorial publication.

USER QUESTION:
{question}

RETRIEVED RESEARCH:
{context}

EVIDENCE RULES:

1. Answer the actual question directly.
2. Base research claims strictly on the supplied abstracts.
3. Cite claims using [1], [2], [3], etc.
4. Each citation must refer to the corresponding SOURCE number.
5. Never invent paper titles, authors, dates, findings or statistics.
6. Distinguish established findings from interpretations.
7. Explicitly acknowledge insufficient or conflicting evidence.
8. Never pretend abstracts contain full-paper details.
9. Do not claim the retrieved sample represents the entire field.

WRITING AND PRESENTATION:

1. Start with a short, insightful opening that directly answers
   the user's question.
2. Use descriptive Markdown headings (## and ###).
3. Organize findings into meaningful research themes.
4. Give each theme a clear, memorable heading.
5. Explain findings in natural paragraphs rather than
   excessively long bullet lists.
6. Use bold text selectively for important concepts.
7. Explain technical terminology when necessary.
8. Separate distinct research findings into individual paragraphs.
9. Avoid repeating the same finding in multiple sections.
10. Include citations immediately after the claims they support.
11. Avoid generic introductory statements and repetitive conclusions.
12. Never use unsupported claims to make the answer sound impressive.

RESPONSE STRUCTURE:

## Research overview

A concise synthesis of the main findings.

## Key research directions

Organize the most important findings into 3-6 themes.

For each theme:
- Use a descriptive heading.
- Explain what the research indicates.
- Discuss important developments and technical approaches.
- Identify relevant limitations or unanswered questions.
- Cite the supporting papers.

## Emerging opportunities

Identify research opportunities supported by the supplied
literature. Clearly distinguish interpretation from established
findings.

## Overall assessment

Give a concise assessment of the evidence, its limitations
and the most important takeaway.

STYLE:

- Write like a human research analyst.
- Be precise, thoughtful and readable.
- Avoid textbook-style enumeration.
- Avoid unnecessarily long paragraphs.
- Do not force every section if the evidence does not support it.
- Do not fabricate trends or claim that a topic is growing
  without sufficient evidence.

Return the answer in Markdown.
"""

    try:
        return await asyncio.wait_for(
            call_groq(
                prompt=prompt,
                model=GROQ_ANSWER_MODEL,
                json_mode=False,
            ),
            timeout=ANSWER_GENERATION_TIMEOUT,
        )

    except asyncio.TimeoutError as exc:
        logger.error(
            "Groq research answer exceeded %s seconds.",
            ANSWER_GENERATION_TIMEOUT,
        )

        raise TimeoutError(
            "Research answer generation exceeded 90 seconds. "
            "Please try again."
        ) from exc
