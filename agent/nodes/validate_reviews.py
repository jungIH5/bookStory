"""
Node 2 — 서평 품질 검증

리뷰가 충분한지 판단해서 review_quality를 세팅한다.
이 값이 그래프의 조건부 엣지(conditional edge)에서
"retry"와 "proceed" 분기를 결정하는 데 사용된다.
"""
from state import BookAnalysisState


def validate_reviews_node(state: BookAnalysisState) -> dict:
    reviews = state.get("blog_reviews", [])

    # 내용이 있는 리뷰가 2개 이상이면 충분하다고 판단
    meaningful = [r for r in reviews if len(r) > 30]
    quality = "sufficient" if len(meaningful) >= 2 else "insufficient"

    return {"review_quality": quality}


# ── 조건부 엣지 라우팅 함수 ───────────────────────────────────────────────
# 그래프에서 add_conditional_edges()의 두 번째 인자로 사용된다.
# state를 받아 다음으로 이동할 노드 이름(문자열)을 반환한다.
def route_after_validate(state: BookAnalysisState) -> str:
    if state["review_quality"] == "insufficient" and state.get("retry_count", 0) < 2:
        return "retry"          # fetch_blog_reviews 노드로 다시
    return "proceed"            # analyze_and_questions 노드로 진행
