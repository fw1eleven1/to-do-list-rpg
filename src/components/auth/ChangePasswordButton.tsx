'use client';

import { type FormEvent, useEffect, useRef, useState, useTransition } from 'react';

import { changePasswordAction } from '@/actions/auth';

const field =
  'w-full rounded border border-ink-600 bg-ink-900/70 px-3 py-2 text-parchment-50 outline-none placeholder:text-parchment-700 focus:border-gold-600 disabled:opacity-50';

const primaryButton =
  'w-full rounded border border-gold-600 bg-gold-600/20 px-4 py-2 font-medium text-gold-400 transition hover:bg-gold-600/30 disabled:cursor-not-allowed disabled:opacity-50';

export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open]);

  // 열려 있는 동안만 Escape 로 닫는다 — 항상 리스너를 걸어두면 다른 곳의 Escape 를 삼킨다.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setError(null);
    setDone(false);
  }

  // action={fn} 대신 onSubmit 을 쓴다: React 19 는 form action 이 끝나면 폼을 자동으로 비우는데,
  // 검증 실패로 early-return 해도 초기화가 일어나 입력한 내용이 날아간다. preventDefault 로 그걸 막는다.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const currentPassword = String(formData.get('currentPassword') ?? '');
    const newPassword = String(formData.get('newPassword') ?? '');
    const newPasswordConfirm = String(formData.get('newPasswordConfirm') ?? '');

    // 서버까지 갔다 오지 않고 바로 알려준다. 실제 검증은 액션이 다시 한다.
    if (newPassword !== newPasswordConfirm) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    start(async () => {
      const res = await changePasswordAction({
        currentPassword,
        newPassword,
        newPasswordConfirm,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setDone(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs leading-none text-parchment-500 transition hover:text-parchment-300"
      >
        비밀번호 변경
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          // 배경(오버레이 자체)을 클릭했을 때만 닫는다. 폼 위 클릭은 버블링돼도 무시한다.
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="비밀번호 변경"
            className="w-full max-w-sm rounded-lg border border-ink-600 bg-ink-900 p-6 shadow-xl"
          >
            <h2 className="mb-4 font-display text-lg text-gold-400">비밀번호 변경</h2>

            {done ? (
              <div className="space-y-4">
                <p className="text-sm text-parchment-300">
                  비밀번호가 변경되었습니다.
                </p>
                <button type="button" onClick={close} className={primaryButton}>
                  닫기
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-3">
                <input
                  ref={firstFieldRef}
                  name="currentPassword"
                  type="password"
                  required
                  placeholder="현재 비밀번호"
                  autoComplete="current-password"
                  disabled={pending}
                  className={field}
                />
                <input
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  placeholder="새 비밀번호 (8자 이상)"
                  autoComplete="new-password"
                  disabled={pending}
                  className={field}
                />
                <input
                  name="newPasswordConfirm"
                  type="password"
                  required
                  placeholder="새 비밀번호 확인"
                  autoComplete="new-password"
                  disabled={pending}
                  className={field}
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    disabled={pending}
                    className="w-full rounded border border-ink-600 px-4 py-2 text-parchment-400 transition hover:bg-ink-800 disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button type="submit" disabled={pending} className={primaryButton}>
                    {pending ? '변경 중…' : '변경'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
