'use client';

import { useState, useTransition } from 'react';

import { cancelTodoAction, completeTodoAction } from '@/actions/todo';
import { useQuestFeedback } from '@/components/feedback/FeedbackProvider';

export function QuestActions({ todoId }: { todoId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // 결과 표시는 이 컴포넌트가 하지 않는다 — 완료하면 카드가 목록에서 빠져 언마운트되기 때문.
  const showFeedback = useQuestFeedback();

  function complete() {
    setError(null);
    start(async () => {
      const res = await completeTodoAction({ todoId });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      showFeedback(res.data);
    });
  }

  function cancel() {
    setError(null);
    start(async () => {
      const res = await cancelTodoAction({ todoId });
      if (!res.ok) setError(res.error.message);
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={complete}
        disabled={pending}
        className="rounded border border-gold-600 bg-gold-600/20 px-3 py-1.5 text-sm text-gold-400 transition hover:bg-gold-600/30 disabled:opacity-50"
      >
        {pending ? '처리 중…' : '완료'}
      </button>

      <button
        type="button"
        onClick={cancel}
        disabled={pending}
        className="rounded border border-ink-600 px-3 py-1.5 text-sm text-parchment-500 transition hover:bg-ink-800 disabled:opacity-50"
      >
        파기
      </button>

      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
