
import asyncio
import json
import logging
from functools import lru_cache

from google import genai
from google.genai import types

from app.config import get_settings


logger = logging.getLogger(__name__)


@lru_cache
def get_gemini_client():
    settings = get_settings()

    return genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(
            timeout=settings.gemini_request_timeout_ms,
        ),
    )


def get_model_chain():
    settings = get_settings()

    fallbacks = [
        model.strip()
        for model in settings.gemini_fallback_models.split(",")
        if model.strip()
    ]

    return list(dict.fromkeys([
        settings.gemini_model,
        *fallbacks,
    ]))


def get_error_status(exc):
    """Extract an HTTP status code from Gemini SDK errors."""

    code = getattr(exc, "code", None)

    if isinstance(code, int):
        return code

    status = getattr(exc, "status_code", None)

    if isinstance(status, int):
        return status

    for value in (code, status):
        if value is not None:
            error_text = str(value)

            for candidate in (408, 429, 500, 502, 503, 504):
                if str(candidate) in error_text:
                    return candidate

    return None


def is_temporary_error(exc):
    if isinstance(exc, (asyncio.TimeoutError, TimeoutError)):
        return True

    return get_error_status(exc) in (
        408, 429, 500, 502, 503, 504
    )


async def call_gemini(prompt: str, json_mode: bool = False) -> str:
    """
    Execute a Gemini request using the configured model fallback chain.

    Each model is attempted once. Temporary failures and unavailable
    models cause an immediate switch to the next model.
    """

    client = get_gemini_client()
    settings = get_settings()

    timeout_seconds = settings.gemini_request_timeout_ms / 1000

    config = None

    if json_mode:
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
        )

    for model in get_model_chain():

        logger.info("ZERA trying Gemini model: %s", model)

        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config,
                ),
                timeout=timeout_seconds,
            )

            if not response.text:
                raise RuntimeError(
                    f"Gemini model {model} returned empty output."
                )

            logger.info(
                "ZERA successfully generated response using %s",
                model,
            )

            return response.text

        except asyncio.TimeoutError:
            logger.warning(
                "Gemini model %s timed out after %s seconds.",
                model,
                timeout_seconds,
            )

        except Exception as exc:

            status = get_error_status(exc)

            if status == 404:
                logger.warning(
                    "Gemini model %s is unavailable: %s",
                    model,
                    exc,
                )
                continue

            if is_temporary_error(exc):
                logger.warning(
                    "Gemini model %s temporarily unavailable: %s",
                    model,
                    exc,
                )
                continue

            logger.exception(
                "Non-retryable Gemini error for model %s",
                model,
            )
            raise

    raise RuntimeError(
        "ZERA is temporarily unavailable. "
        "All configured Gemini models failed."
    )


async def generate_research_queries(question: str) -> list[str]:
    """
    Convert a conversational question into focused academic
    literature search queries.
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

Return ONLY a JSON array of strings.

Example:
[
  "parameter efficient fine tuning large language models",
  "low rank adaptation LoRA large language models",
  "prompt tuning and adapter based fine tuning",
  "parameter efficient fine tuning comparative evaluation"
]
"""

    try:
        response_text = await call_gemini(
            prompt=prompt,
            json_mode=True,
        )

        queries = json.loads(response_text)

        if not isinstance(queries, list):
            raise ValueError("Gemini returned an invalid query format.")

        cleaned = [
            item.strip()
            for item in queries
            if isinstance(item, str) and item.strip()
        ]

        if not cleaned:
            raise ValueError("No valid search queries were generated.")

        return list(dict.fromkeys(cleaned))[:5]

    except Exception as exc:
        logger.warning(
            "Query generation failed. Using original question: %s",
            exc,
        )

        # Preserve research functionality when query generation fails.
        return [question]


async def generate_research_answer(
    question: str,
    papers: list[dict],
) -> str:

    paper_context = []

    for index, paper in enumerate(papers, start=1):

        abstract = paper.get("abstract")

        if not abstract:
            continue

        paper_context.append(
            f"""
[SOURCE {index}]
Title: {paper.get("title")}
Authors: {", ".join(paper.get("authors") or [])}
Publication date: {paper.get("publication_date")}
DOI: {paper.get("doi")}

Abstract:
{abstract[:6000]}
"""
        )

    context = "\n\n".join(paper_context)


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


    return await call_gemini(
        prompt=prompt,
        json_mode=False,
    )
