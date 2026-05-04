from langgraph.graph import StateGraph, END
from state import RecordingState
from nodes.transcribe_audio import transcribe_audio_node
from nodes.diarize_speakers import diarize_speakers_node
from nodes.identify_user_speaker import identify_user_speaker_node
from nodes.analyze_discussion import analyze_discussion_node
from nodes.generate_recording_questions import generate_recording_questions_node

# 그래프 구조
# transcribe_audio
#   → diarize_speakers      (pyannote: 화자 분리)
#   → identify_user_speaker (음성 샘플 매칭 + 레이블 트랜스크립트 생성)
#   → analyze_discussion    (Claude: 요약 + 핵심 주제)
#   → generate_recording_questions (Claude: 후속 질문)
#   → END

builder = StateGraph(RecordingState)

builder.add_node("transcribe_audio", transcribe_audio_node)
builder.add_node("diarize_speakers", diarize_speakers_node)
builder.add_node("identify_user_speaker", identify_user_speaker_node)
builder.add_node("analyze_discussion", analyze_discussion_node)
builder.add_node("generate_recording_questions", generate_recording_questions_node)

builder.set_entry_point("transcribe_audio")
builder.add_edge("transcribe_audio", "diarize_speakers")
builder.add_edge("diarize_speakers", "identify_user_speaker")
builder.add_edge("identify_user_speaker", "analyze_discussion")
builder.add_edge("analyze_discussion", "generate_recording_questions")
builder.add_edge("generate_recording_questions", END)

recording_analysis_graph = builder.compile()
