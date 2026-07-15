import type { Difficulty } from '@/lib/game/difficulty';

/** 퀘스트 생성 결과. AI 가 만들든 폴백이 만들든 이 모양이다. */
export type GeneratedQuest = {
  title: string;
  description: string;
  questGiver: string | null;
  difficulty: Difficulty;
  /** 서버가 difficulty 로부터 산출한다. AI 는 이 값을 정하지 않는다. */
  baseXp: number;
  source: 'ai' | 'fallback';
  model: string | null;
  promptVersion: string | null;
};
