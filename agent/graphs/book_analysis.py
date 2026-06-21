"""
책 분석 LangGraph 그래프

흐름:
  START
    ↓
  prepare_book_analysis   ← Naver Book API(verify) + Blog API(fetch) 병렬 실행
    ↓
  validate_reviews        ← 길이 + 제목 키워드 관련성 판단
    ↓ (조건부 엣지)
    ├─ "retry"   → fetch_blog_reviews (book_metadata 활용한 개선된 검색, 최대 2회)
    │                 ↓
    │             validate_reviews
    └─ "proceed" → analyze_and_questions
                      ↓
                   generate_shift_questions
                      ↓
                    END

개선 포인트:
  - prepare_book_analysis: asyncio.gather로 verify_book + fetch_blog_reviews 병렬 실행
    → 기존 순차 대비 Naver API 레이턴시 추가 없음
  - validate_reviews: 단순 길이 체크 → 제목 키워드 포함 여부까지 확인
  - fetch_blog_reviews(retry): book_metadata의 출판사/확정 제목으로 정확도 향상
  - Claude 추가 호출 없음 → 전체 레이턴시 변화 없음
"""
from langgraph.graph import StateGraph, END

from state import BookAnalysisState
from nodes.prepare_book_analysis import prepare_book_analysis_node
from nodes.fetch_blog_reviews import fetch_blog_reviews_node
from nodes.validate_reviews import validate_reviews_node, route_after_validate
from nodes.analyze_and_questions import analyze_and_questions_node
from nodes.generate_shift_questions import generate_shift_questions_node


def build_book_analysis_graph():
    builder = StateGraph(BookAnalysisState)

    # ── 노드 등록 ──────────────────────────────────────────────────────────
    builder.add_node("prepare_book_analysis", prepare_book_analysis_node)
    builder.add_node("fetch_blog_reviews", fetch_blog_reviews_node)    # retry 전용
    builder.add_node("validate_reviews", validate_reviews_node)
    builder.add_node("analyze_and_questions", analyze_and_questions_node)
    builder.add_node("generate_shift_questions", generate_shift_questions_node)

    # ── 엣지 연결 ──────────────────────────────────────────────────────────
    builder.set_entry_point("prepare_book_analysis")
    builder.add_edge("prepare_book_analysis", "validate_reviews")
    builder.add_edge("fetch_blog_reviews", "validate_reviews")  # retry 후 재검증

    builder.add_conditional_edges(
        "validate_reviews",
        route_after_validate,
        {
            "retry":   "fetch_blog_reviews",      # 관련 서평 부족 → 재검색
            "proceed": "analyze_and_questions",   # 충분 → 분석
        },
    )

    builder.add_edge("analyze_and_questions", "generate_shift_questions")
    builder.add_edge("generate_shift_questions", END)

    return builder.compile()


book_analysis_graph = build_book_analysis_graph()
