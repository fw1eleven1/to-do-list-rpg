import type { QuestListItem } from '@/db/queries/todos';
import { QuestCard } from './QuestCard';

// 'all' 만 todos.status 값이 아니다 — 나머지 셋은 status 와 키가 같아서 그대로 필터에 쓴다.
const TABS = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '진행 중' },
  { key: 'completed', label: '완료' },
  { key: 'cancelled', label: '파기됨' },
] as const;

export type BoardTab = (typeof TABS)[number]['key'];

export const DEFAULT_TAB: BoardTab = 'active';

export function isBoardTab(v: unknown): v is BoardTab {
  return TABS.some((t) => t.key === v);
}

const EMPTY: Record<BoardTab, string> = {
  all: '게시판이 비어 있습니다. 할 일을 적어 첫 의뢰서를 붙이세요.',
  active: '진행 중인 의뢰가 없습니다. 할 일을 적어 새 의뢰서를 붙이세요.',
  completed: '아직 완수한 의뢰가 없습니다.',
  cancelled: '파기된 의뢰가 없습니다.',
};

export function QuestBoard({ items, tab }: { items: QuestListItem[]; tab: BoardTab }) {
  const counts: Record<BoardTab, number> = {
    all: items.length,
    active: items.filter((i) => i.status === 'active').length,
    completed: items.filter((i) => i.status === 'completed').length,
    cancelled: items.filter((i) => i.status === 'cancelled').length,
  };

  // 전체 탭에서는 아직 손대야 할 의뢰가 위로 온다. 그 안에서는 쿼리의 최신순(createdAt DESC)이
  // 그대로 유지된다 — sort 가 안정 정렬이라 같은 그룹의 순서는 건드리지 않는다.
  // 끝난 의뢰(완수/파기)끼리는 서로 재배치하지 않는다: 둘 다 "지나간 기록" 이라 날짜순이 자연스럽다.
  // items 는 서버가 준 배열이라 복사해서 정렬한다.
  const visible =
    tab === 'all'
      ? [...items].sort(
          (a, b) => Number(b.status === 'active') - Number(a.status === 'active'),
        )
      : items.filter((i) => i.status === tab);

  return (
    <section>
      <nav className="flex gap-1 border-b border-ink-700">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={t.key === DEFAULT_TAB ? '/quests' : `/quests?tab=${t.key}`}
            aria-current={tab === t.key ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              tab === t.key
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-parchment-500 hover:text-parchment-300'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-parchment-700">{counts[t.key]}</span>
          </a>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-parchment-700">{EMPTY[tab]}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {visible.map((item) => (
            <QuestCard key={item.todoId} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
