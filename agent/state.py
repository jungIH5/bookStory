from typing import TypedDict, List, Dict, Optional


class BookAnalysisState(TypedDict):
    # 입력
    title: str
    author: str

    # Node 1: prepare_book_analysis 결과 (verify_book + fetch_blog_reviews 병렬)
    book_metadata: Dict   # {isbn, title, author, publisher, description}
    blog_reviews: List[str]
    retry_count: int

    # Node 2: validate_reviews 결과 — 조건부 엣지 판단에 사용
    review_quality: str  # "sufficient" | "insufficient"

    # Node 3: analyze_and_questions 결과
    analysis: str
    pages: int
    thematic_questions: List[str]

    # Node 4: generate_shift_questions 결과
    shift_questions: List[Dict[str, str]]  # [{"perspective": "...", "question": "..."}]


class QATurn(TypedDict):
    question: str
    answer: Optional[str]
    question_type: str
    turn_order: int


class ConversationState(TypedDict):
    # 입력
    session_id: int
    book_title: str
    book_author: str
    book_analysis: str
    history: List[QATurn]      # 지금까지의 Q&A 이력
    current_answer: str        # 방금 사용자가 입력한 답변

    # Node 1: analyze_user_answer 결과
    user_perspective: str      # 답변에서 추출한 사용자 관점 요약

    # Node 2: generate_followup 결과
    next_question: str


class TendencyState(TypedDict):
    user_id: int
    qa_history: List[Dict]       # [{book_title, book_author, question, answer}]

    # Node: analyze_tendency 결과
    tendency_summary: str        # 종합 성향 요약
    reading_lenses: List[str]    # 자주 쓰는 관점 (예: "인문학적 시각", "개인 경험 연결")
    strong_areas: List[str]      # 관점 전환이 잘 되는 영역
    growth_areas: List[str]      # 더 탐구하면 좋을 영역


class RecommendationState(TypedDict):
    user_id: int
    read_books: List[Dict]       # [{title, author}]

    # Node 1: extract_preferences 결과
    preference_text: str         # 취향 요약 텍스트 (다음 노드에 전달)
    search_keywords: List[str]   # Naver 검색 키워드

    # Node 2: search_book_candidates 결과
    candidates: List[Dict]       # Naver 검색 결과

    # Node 3: rank_recommendations 결과
    recommendations: List[Dict]  # [{title, author, image, reason}]


class RecordingState(TypedDict):
    # 입력
    recording_id: int
    audio_path: str
    voice_sample_path: Optional[str]   # 사용자 목소리 샘플 경로 (없으면 None)

    # Node 1: transcribe_audio 결과
    transcript: str
    transcript_segments: List[Dict]    # [{start, end, text}]

    # Node 2: diarize_speakers 결과
    diarized_segments: List[Dict]      # [{start, end, speaker}]

    # Node 3: identify_user_speaker 결과
    user_speaker_label: str            # 유저에 해당하는 화자 레이블 (예: "SPEAKER_00")
    labeled_transcript: str            # "나: ...\n화자 1: ..." 형식

    # Node 4: analyze_discussion 결과
    summary: str
    key_topics: List[str]
    user_contributions: List[str]      # 유저 발화 목록

    # Node 5: generate_recording_questions 결과
    followup_questions: List[str]
