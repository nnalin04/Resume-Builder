from duckduckgo_search import DDGS

def perform_web_search(query: str, max_results: int = 3) -> list:
    """
    Search the web for real-time information such as ATS rules or recruiter expectations.
    """
    results = []
    try:
        with DDGS() as ddgs:
            # We use text() to perform standard web search
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", "")
                })
    except Exception as e:
        print(f"Error performing web search: {e}")
    return results

