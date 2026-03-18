import logging

from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)


def perform_web_search(query: str, max_results: int = 3) -> list:
    """
    Search the web for real-time information such as ATS rules or recruiter expectations.
    """
    results = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", "")
                })
    except Exception as e:
        logger.error("Web search failed: %s", e, exc_info=True)
    return results
