// CHARACTER_PERSONAS.md 와 동일한 8종 페르소나 (프론트 공용 — RecordingTab / UserLibraryModal / DiveRoomModal에서 사용)
// description은 CHARACTER_PERSONAS.md의 "질문 목적/질문 스타일 예시"를 한 줄로 요약한 것 — 페르소나 선택 UI의 설명(?)에 쓰인다.
export const PERSONAS = [
  { id: 'child', name: '호기심 많은 어린이', image: '/characters/1_curious_child.png', description: '정답이 하나가 아님을 깨닫게 하는, 순수하고 직관적인 "왜?" 질문을 던져요.' },
  { id: 'youth', name: '경제에 관심 많은 청년', image: '/characters/2_economy_youth.png', description: '책 속 선택을 실제 경제적 판단·리스크 관리 훈련 소재로 다뤄요.' },
  { id: 'philosopher', name: '철학적 사색가 중년', image: '/characters/3_philosopher_middle_aged.png', description: '삶을 돌아보고, 주체적으로 사는 데 필요한 성찰을 끌어내는 질문을 해요.' },
  { id: 'teen', name: '사춘기 청소년', image: '/characters/4_puberty_teenager.png', description: '인물의 감정에 공감하며 자기 이해를 기르는 질문을 던져요.' },
  { id: 'retiree', name: '인생 2막 은퇴자', image: '/characters/5_retiree_elderly.png', description: '인생을 회고하고, 다음 세대에 전할 의미를 정리하는 질문을 해요.' },
  { id: 'challenger', name: '도전하는 실행가', image: null, description: '책에서 얻은 통찰을 실제 행동 계획으로 연결하는 질문을 해요.' },
  { id: 'critical', name: '비판적 사고 훈련형', image: null, description: '주장의 근거와 반론을 날카롭게 검증하는 질문을 던져요.' },
  { id: 'otter', name: '관계 치유형 (수달)', image: null, description: '감정을 억누르지 않고, 다정한 톤으로 천천히 들여다보게 해요.' },
];

export const DEFAULT_PERSONA_ID = 'child';

export const getPersona = (id) => PERSONAS.find(p => p.id === id) || PERSONAS.find(p => p.id === DEFAULT_PERSONA_ID);
