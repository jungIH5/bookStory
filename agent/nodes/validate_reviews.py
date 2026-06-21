"""
Node 2 — 서평 품질 및 관련성 검증

두 가지를 동시에 판단한다:
  1. 길이: 30자 이상
  2. 관련성: 블로그 글 본문에 책 제목(또는 제목 구성 단어)이 언급됐는가

book_metadata에 확인된 제목이 있으면 그걸 우선 사용한다.
이 값이 조건부 엣지에서 "retry"와 "proceed" 분기를 결정하는 데 사용된다.
"""
from state import BookAnalysisState


def _is_relevant(review: str, title: str) -> bool:
    """제목이 리뷰 본문에 언급됐는지 확인."""
    if len(review) < 30:
        return False

    r_lower = review.lower()
    title_lower = title.lower()

    # 전체 제목이 포함된 경우
    if title_lower in r_lower:
        return True

    # 제목을 단어 단위로 분리해서 절반 이상 포함된 경우 (긴 제목 대응)
    words = [w for w in title_lower.split() if len(w) > 1]
    if words and sum(1 for w in words if w in r_lower) >= max(1, len(words) // 2):
        return True

    return False


def validate_reviews_node(state: BookAnalysisState) -> dict:
    reviews = state.get("blog_reviews", [])

    # 확인된 메타데이터 제목 우선 사용
    meta = state.get("book_metadata", {})
    title = meta.get("title") or state["title"]

    meaningful = [r for r in reviews if _is_relevant(r, title)]
    quality = "sufficient" if len(meaningful) >= 2 else "insufficient"

    return {"review_quality": quality}


def route_after_validate(state: BookAnalysisState) -> str:
    if state["review_quality"] == "insufficient" and state.get("retry_count", 0) < 3:
        return "retry"
    return "proceed"
