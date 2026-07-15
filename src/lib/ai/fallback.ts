import { baseXpFor } from '@/lib/game/difficulty';
import type { GeneratedQuest } from './types';

/**
 * AI 호출이 실패했을 때 쓰는 결정적 생성기.
 *
 * 퀘스트 행을 비워두지 않고 여기서 채우는 이유:
 * "모든 todo 는 정확히 하나의 quest 를 가진다"는 불변식이 서면 UI 전체에서 null 분기가 사라진다.
 * 할 일은 사용자의 데이터이고 퀘스트는 장식이다 — 서드파티 API 가 딸꾹질했다고
 * 사용자가 방금 타이핑한 내용을 잃는 건 변호할 수 없다.
 *
 * 난이도를 추측하지 않고 normal 로 고정한다. AI 없이 제목만 보고 난이도를 매기는 건
 * 그럴듯한 거짓말이지 판정이 아니다. 2차에서 source='fallback' 인 것만 골라 재생성하면 된다.
 */
export function fallbackQuest(todoTitle: string): GeneratedQuest {
  const difficulty = 'normal' as const;

  return {
    title: `「${todoTitle}」의 의뢰`,
    description:
      '길드 게시판에 낡은 양피지가 한 장 붙어 있다. 잉크가 번져 자세한 사정은 알 수 없으나, ' +
      '의뢰인이 급히 사람을 찾는다는 것만은 분명하다. 서명은 없다.',
    questGiver: null,
    difficulty,
    baseXp: baseXpFor(difficulty),
    source: 'fallback',
    model: null,
    promptVersion: null,
  };
}
