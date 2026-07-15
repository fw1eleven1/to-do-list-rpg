export const DIFFICULTIES = ['trivial', 'easy', 'normal', 'hard', 'legendary'] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * 난이도 → 기본 경험치.
 *
 * AI 는 난이도만 고르고 XP 는 서버가 이 표로 산출한다. XP 는 게임 경제의 화폐라
 * LLM 에 발행권을 주면 안 되기 때문. 리밸런싱은 이 표만 고치면 끝난다.
 *
 * normal 50 = 레벨 2 도달에 필요한 누적 XP 와 같다 → 첫 퀘스트 완료 = 즉시 레벨업 (온보딩 훅).
 */
export const DIFFICULTY_BASE_XP: Record<Difficulty, number> = {
  trivial: 10, // 5분 내
  easy: 25, // 30분 내
  normal: 50, // 수 시간
  hard: 100, // 하루 이상 / 여러 단계
  legendary: 200, // 수 주간의 대장정
};

/** 프롬프트에 그대로 넣는 판정 기준. 이게 없으면 모델이 매번 다른 잣대를 쓴다. */
export const DIFFICULTY_GUIDE: Record<Difficulty, string> = {
  trivial: '5분 안에 끝나는 사소한 일',
  easy: '30분 안에 끝나는 가벼운 일',
  normal: '수 시간 걸리는 보통의 일',
  hard: '하루 이상 걸리거나 여러 단계를 거쳐야 하는 일',
  legendary: '수 주간 매달려야 하는 대장정',
};

export const KO_DIFFICULTY: Record<Difficulty, string> = {
  trivial: '하찮음',
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
  legendary: '전설',
};

export function baseXpFor(difficulty: Difficulty): number {
  return DIFFICULTY_BASE_XP[difficulty];
}
