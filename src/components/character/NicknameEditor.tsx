'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { updateNicknameAction } from '@/actions/auth';
import { NICKNAME_FALLBACK, NICKNAME_MAX, NICKNAME_MIN } from '@/lib/nickname';

export function NicknameEditor({ nickname }: { nickname: string | null }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nickname ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  function open() {
    setDraft(nickname ?? '');
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save() {
    const next = draft.trim();

    if (next === (nickname ?? '')) {
      cancel();
      return;
    }

    setError(null);
    start(async () => {
      const res = await updateNicknameAction({ nickname: next });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      // 화면의 닉네임은 revalidatePath 로 서버가 다시 내려준다 — 여기서 따로 들고 있지 않는다.
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={open}
        title="닉네임 변경"
        className="group flex min-w-0 items-center gap-1.5 text-left"
      >
        <span className="truncate text-sm text-parchment-300 group-hover:text-parchment-100">
          {nickname?.trim() || NICKNAME_FALLBACK}
        </span>
        <PencilIcon />
      </button>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          // 폼 밖에서 저장/취소를 직접 처리하므로 blur 로 닫지 않는다 —
          // 저장 버튼을 누르려는 클릭이 blur 를 먼저 일으켜 창이 닫히는 걸 막는다.
          disabled={pending}
          minLength={NICKNAME_MIN}
          maxLength={NICKNAME_MAX}
          aria-label="닉네임"
          className="min-w-0 flex-1 rounded border border-ink-600 bg-ink-950/60 px-2 py-1 text-sm text-parchment-50 outline-none focus:border-gold-600 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="shrink-0 rounded border border-gold-600 bg-gold-600/20 px-2 py-1 text-xs text-gold-400 transition hover:bg-gold-600/30 disabled:opacity-50"
        >
          {pending ? '저장 중…' : '저장'}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="shrink-0 rounded border border-ink-600 px-2 py-1 text-xs text-parchment-500 transition hover:bg-ink-800 disabled:opacity-50"
        >
          취소
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-3 w-3 shrink-0 text-parchment-700 transition group-hover:text-gold-400"
      aria-hidden="true"
    >
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
