import { z } from 'zod';

import { DIFFICULTIES } from '@/lib/game/difficulty';

/**
 * AI 가 채워야 할 필드.
 *
 * xp 필드가 없는 게 핵심이다. AI 는 난이도만 고르고 baseXp 는 서버가 매핑 테이블로 산출한다 —
 * XP 는 게임 경제의 화폐라, 어느 날 모델이 9999 를 뱉으면 경제가 끝난다.
 * 난이도는 5지선다라 집합이 닫혀 있어 최악의 경우도 "약간 후한 판정" 수준이다.
 *
 * strict 모드 함정: 모든 필드가 required 여야 하고 additionalProperties:false 여야 한다.
 * 그래서 .optional() 은 쓸 수 없고 .nullable() 을 써야 한다 (questGiver).
 */
export const questSchema = z.object({
  title: z.string().min(1).max(60).describe('퀘스트 제목. 20자 내외.'),
  description: z.string().min(1).max(400).describe('의뢰 서술문. 2~3문장.'),
  difficulty: z.enum(DIFFICULTIES).describe('난이도 판정.'),
  questGiver: z.string().max(40).nullable().describe('의뢰인 이름. 마땅치 않으면 null.'),
});

export type QuestSchema = z.infer<typeof questSchema>;
