"""
책 분석 LangGraph 그래프

흐름:
  START
    ↓
  fetch_blog_reviews  ← Naver Blog API 호출
    ↓
  validate_reviews    ← 리뷰 품질 판단
    ↓ (조건부 엣지)
    ├─ "retry"   → fetch_blog_reviews (키워드 변형 재시도, 최대 2회)
    └─ "proceed" → analyze_and_questions
                      ↓
                   generate_shift_questions
                      ↓
                    END

핵심 LangGraph 개념:
  - State: 노드 간 공유되는 데이터 (BookAnalysisState)
  - Node: 상태를 받아 변경된 필드만 반환하는 함수
  - Conditional Edge: 상태값에 따라 다음 노드를 동적으로 결정
"""
from langgraph.graph import StateGraph, END

from state import BookAnalysisState
from nodes.fetch_blog_reviews import fetch_blog_reviews_node
from nodes.validate_reviews import validate_reviews_node, route_after_validate
from nodes.analyze_and_questions import analyze_and_questions_node
from nodes.generate_shift_questions import generate_shift_questions_node


def build_book_analysis_graph():
    builder = StateGraph(BookAnalysisState)

    # ── 노드 등록 ──────────────────────────────────────────────────────────
    builder.add_node("fetch_blog_reviews", fetch_blog_reviews_node)
    builder.add_node("validate_reviews", validate_reviews_node)
    builder.add_node("analyze_and_questions", analyze_and_questions_node)
    builder.add_node("generate_shift_questions", generate_shift_questions_node)

    # ── 엣지 연결 ──────────────────────────────────────────────────────────
    builder.set_entry_point("fetch_blog_reviews")
    builder.add_edge("fetch_blog_reviews", "validate_reviews")

    # 조건부 엣지: route_after_validate가 반환하는 문자열로 분기
    builder.add_conditional_edges(
        "validate_reviews",
        route_after_validate,
        {
            "retry": "fetch_blog_reviews",      # 리뷰 부족 → 재검색
            "proceed": "analyze_and_questions", # 리뷰 충분 → 분석
        },
    )

    builder.add_edge("analyze_and_questions", "generate_shift_questions")
    builder.add_edge("generate_shift_questions", END)

    return builder.compile()


# 앱 시작 시 한 번만 컴파일해서 재사용
book_analysis_graph = build_book_analysis_graph()
