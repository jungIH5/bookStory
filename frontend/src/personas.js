// CHARACTER_PERSONAS.md 와 동일한 8종 페르소나 (프론트 공용 — RecordingTab / UserLibraryModal / DiveRoomModal에서 사용)
export const PERSONAS = [
  { id: 'child', name: '호기심 많은 어린이', image: '/characters/1_curious_child.png' },
  { id: 'youth', name: '경제에 관심 많은 청년', image: '/characters/2_economy_youth.png' },
  { id: 'philosopher', name: '철학적 사색가 중년', image: '/characters/3_philosopher_middle_aged.png' },
  { id: 'teen', name: '사춘기 청소년', image: '/characters/4_puberty_teenager.png' },
  { id: 'retiree', name: '인생 2막 은퇴자', image: '/characters/5_retiree_elderly.png' },
  { id: 'challenger', name: '도전하는 실행가', image: null },
  { id: 'critical', name: '비판적 사고 훈련형', image: null },
  { id: 'otter', name: '관계 치유형', image: null },
];

export const DEFAULT_PERSONA_ID = 'child';

export const getPersona = (id) => PERSONAS.find(p => p.id === id) || PERSONAS.find(p => p.id === DEFAULT_PERSONA_ID);
