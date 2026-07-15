import { KO_DIFFICULTY, type Difficulty } from '@/lib/game/difficulty';

// MMO 희귀도 관례를 그대로 차용해서 학습이 필요 없게 한다.
// 2차의 아이템 등급(common..legendary)이 같은 스케일을 재사용한다.
const STYLE: Record<Difficulty, string> = {
  trivial: 'border-tier-trivial/50 text-tier-trivial',
  easy: 'border-tier-easy/50 text-tier-easy',
  normal: 'border-tier-normal/50 text-tier-normal',
  hard: 'border-tier-hard/50 text-tier-hard',
  legendary: 'border-tier-legendary/60 text-tier-legendary',
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide ${STYLE[difficulty]}`}
    >
      {KO_DIFFICULTY[difficulty]}
    </span>
  );
}
