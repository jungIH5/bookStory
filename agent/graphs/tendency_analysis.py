from langgraph.graph import StateGraph, END
from state import TendencyState
from nodes.analyze_tendency import analyze_tendency_node

builder = StateGraph(TendencyState)

builder.add_node("analyze_tendency", analyze_tendency_node)

builder.set_entry_point("analyze_tendency")
builder.add_edge("analyze_tendency", END)

tendency_graph = builder.compile()
