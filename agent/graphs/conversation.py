from langgraph.graph import StateGraph, END
from state import ConversationState
from nodes.analyze_user_answer import analyze_user_answer_node
from nodes.generate_followup import generate_followup_node

builder = StateGraph(ConversationState)

builder.add_node("analyze_user_answer", analyze_user_answer_node)
builder.add_node("generate_followup", generate_followup_node)

builder.set_entry_point("analyze_user_answer")
builder.add_edge("analyze_user_answer", "generate_followup")
builder.add_edge("generate_followup", END)

conversation_graph = builder.compile()
