'use client';

import { useRef, useState, useSyncExternalStore, useTransition } from 'react';

import { createTodoAction } from '@/actions/todo';
import { todayISO } from '@/lib/date';
import { DueDatePicker } from './DueDatePicker';

// 오늘 날짜는 세션 중에 바뀌지 않는다고 본다 (자정을 넘겨 켜둔 탭은 새로고침하면 맞춰진다).
const subscribe = () => () => {};

/**
 * 브라우저 기준 오늘 날짜. 서버에서는 null 이다.
 *
 * 렌더 중에 todayISO() 를 부르면 안 된다: 서버(프로덕션은 대개 UTC)와 브라우저(KST)의
 * 캘린더 날짜가 하루 중 9시간 동안 달라서 하이드레이션이 어긋난다.
 * useSyncExternalStore 는 서버/클라 스냅샷을 따로 주는 게 본래 용도라, effect 로
 * setState 하는 우회 없이 이 문제를 정확히 해결한다.
 */
function useToday(): string | null {
  return useSyncExternalStore(subscribe, todayISO, () => null);
}

export function QuestComposer() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const today = useToday();
  // 사용자가 고른 값. null 이면 오늘로 떨어진다 — 덕분에 초기화가 setDueDate(null) 한 줄이다.
  const [picked, setPicked] = useState<string | null>(null);
  const dueDate = picked ?? today;

  function onSubmit(formData: FormData) {
    setError(null);
    const title = String(formData.get('title') ?? '').trim();

    if (!dueDate) {
      setError('마감일을 선택해주세요.');
      return;
    }

    start(async () => {
      const res = await createTodoAction({ title, dueDate });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      formRef.current?.reset();
      // 날짜는 React 가 들고 있어서 form.reset() 이 건드리지 못한다. 직접 오늘로 되돌린다.
      setPicked(null);
    });
  }

  return (
    <section className="rounded-lg border border-ink-600 bg-ink-900/60 p-4">
      <form ref={formRef} action={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          name="title"
          required
          maxLength={200}
          disabled={pending}
          placeholder="할 일을 적으면 의뢰서가 됩니다"
          className="min-w-0 flex-1 rounded border border-ink-600 bg-ink-950/60 px-3 py-2 text-parchment-50 outline-none placeholder:text-parchment-700 focus:border-gold-600 disabled:opacity-50"
        />

        {today && dueDate ? (
          <DueDatePicker value={dueDate} onChange={setPicked} today={today} disabled={pending} />
        ) : (
          // 마운트 전 자리 지킴 — 레이아웃이 튀지 않게 같은 크기로
          <div className="h-[42px] rounded border border-ink-600 bg-ink-950/60 sm:w-44" aria-hidden="true" />
        )}

        <button
          type="submit"
          disabled={pending || !dueDate}
          className="shrink-0 rounded border border-gold-600 bg-gold-600/20 px-5 py-2 font-medium text-gold-400 transition hover:bg-gold-600/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? '작성 중…' : '의뢰'}
        </button>
      </form>

      {/* AI 생성은 이 앱의 하이라이트 순간이라, 기다림을 감추는 대신 연출한다. */}
      {pending && (
        <div className="mt-3 animate-pulse rounded border border-ink-700 bg-ink-950/40 p-3">
          <p className="text-sm text-parchment-500">서기가 의뢰서를 작성하는 중…</p>
          <div className="mt-2 space-y-1.5">
            <div className="h-2 w-1/3 rounded bg-ink-700" />
            <div className="h-2 w-full rounded bg-ink-700" />
            <div className="h-2 w-2/3 rounded bg-ink-700" />
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}
