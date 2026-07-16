import type { QuestListItem } from '@/db/queries/todos';
import { dueLabel, todayISO } from '@/lib/date';
import { DifficultyBadge } from './DifficultyBadge';
import { QuestActions } from './QuestActions';

export function QuestCard({ item }: { item: QuestListItem }) {
  const cancelled = item.status === 'cancelled';
  const completed = item.status === 'completed';

  // 연체된 채로 완료한 의뢰만 보상이 깎였다. 그때는 약속된 기본 XP 대신
  // 실제로 받은 XP 를 빨간색으로 보여준다 — 왜 적은지는 마감일의 D+n 이 말해준다.
  // (awardedXp/overdueDays 는 xp_events 의 지급 시점 스냅샷이라 공식이 바뀌어도 거짓말하지 않는다.)
  const decayed =
    completed && item.awardedXp != null && (item.overdueDays ?? 0) > 0;

  return (
    <article
      className={`rounded-lg border p-4 transition ${
        cancelled
          ? 'border-ink-700 bg-ink-900/30 opacity-50'
          : completed
            ? 'border-ink-600 bg-ink-900/40'
            : 'border-ink-600 bg-ink-900/60 hover:border-parchment-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {item.difficulty && <DifficultyBadge difficulty={item.difficulty} />}
          {/* 취소 표시 — 완전 삭제하지 않고 취소선으로 남긴다 */}
          <h3
            className={`font-medium text-parchment-50 ${cancelled ? 'line-through' : ''}`}
          >
            {item.questTitle ?? item.todoTitle}
          </h3>
          {/* 완료 표시는 제목 옆에 둔다 — 카드 맨 아래에 있으면 긴 의뢰서에 묻혀서,
              전체 탭에서 완수 여부를 알려면 카드를 끝까지 읽어야 했다. */}
          {completed && (
            <span className="rounded-full border border-gold-600/50 px-2 py-0.5 text-[11px] font-medium tracking-wide text-gold-400">
              완수
            </span>
          )}
        </div>
        <span
          className={`shrink-0 text-sm ${decayed ? 'text-red-400' : 'text-gold-400'}`}
          // 화면에서는 숫자 하나만 보이므로, 왜 깎였는지는 툴팁으로만 남긴다.
          title={
            decayed
              ? `${item.overdueDays}일 연체로 기본 ${item.baseXp} XP 에서 감소`
              : undefined
          }
        >
          {decayed ? item.awardedXp : item.baseXp} XP
        </span>
      </div>

      {item.questDescription && (
        <p
          className={`mt-2 text-sm leading-relaxed text-parchment-300 ${cancelled ? 'line-through' : ''}`}
        >
          {item.questDescription}
        </p>
      )}

      {item.questGiver && (
        <p className="mt-2 text-xs text-parchment-500">의뢰인: {item.questGiver}</p>
      )}

      {/* 원문 할 일을 반드시 노출한다. 퀘스트 제목만 보이면 자기가 뭘 적었는지 알 수 없고,
          은유가 과하면 앱이 쓸모없어진다. */}
      <p className="mt-3 border-t border-ink-700 pt-2 text-xs text-parchment-500">
        <span className={cancelled ? 'line-through' : ''}>원문: {item.todoTitle}</span>
        {item.dueDate && <span> · 마감 {dueLabel(item.dueDate, todayISO())}</span>}
        {item.source === 'fallback' && (
          <span className="ml-1 text-parchment-700">· 서기가 자리를 비워 임시 의뢰서로 붙였습니다</span>
        )}
      </p>

      {cancelled && <p className="mt-2 text-xs text-parchment-700">파기된 의뢰</p>}

      {item.status === 'active' && <QuestActions todoId={item.todoId} />}
    </article>
  );
}
