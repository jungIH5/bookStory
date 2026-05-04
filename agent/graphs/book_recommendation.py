from langgraph.graph import StateGraph, END
from state import RecommendationState
from nodes.extract_preferences import extract_preferences_node
from nodes.search_book_candidates import search_book_candidates_node
from nodes.rank_recommendations import rank_recommendations_node

builder = StateGraph(RecommendationState)

builder.add_node("extract_preferences", extract_preferences_node)
builder.add_node("search_book_candidates", search_book_candidates_node)
builder.add_node("rank_recommendations", rank_recommendations_node)

builder.set_entry_point("extract_preferences")
builder.add_edge("extract_preferences", "search_book_candidates")
builder.add_edge("search_book_candidates", "rank_recommendations")
builder.add_edge("rank_recommendations", END)

recommendation_graph = builder.compile()
