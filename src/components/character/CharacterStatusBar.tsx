import { levelProgress } from '@/lib/game/level';
import { NicknameEditor } from './NicknameEditor';

export function CharacterStatusBar({
  nickname,
  totalXp,
}: {
  nickname: string | null;
  totalXp: number;
}) {
  const { level, xpIntoLevel, xpForNextLevel, ratio } = levelProgress(totalXp);

  return (
    <section className="rounded-lg border border-ink-600 bg-ink-900/60 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <NicknameEditor nickname={nickname} />
          <p className="font-display text-2xl text-gold-400">Lv. {level}</p>
        </div>
        <p className="shrink-0 text-right text-xs text-parchment-500">
          누적 {totalXp.toLocaleString()} XP
        </p>
      </div>

      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={xpForNextLevel}
        aria-valuenow={xpIntoLevel}
        aria-label={`레벨 ${level} 진행도`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400 transition-[width] duration-700 ease-out"
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>

      <p className="mt-1.5 text-right text-xs text-parchment-500">
        다음 레벨까지 {(xpForNextLevel - xpIntoLevel).toLocaleString()} XP
      </p>

      {/* 2차 확장: 칭호 슬롯 · 아이템 배치 캔버스가 이 아래에 들어온다 */}
    </section>
  );
}
