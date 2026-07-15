'use client';

import { useEffect, useRef, useState } from 'react';

import {
  WEEKDAYS_KO,
  addDays,
  addMonths,
  calendarGrid,
  dueLabel,
  fromISODate,
  toISODate,
} from '@/lib/date';

type Props = {
  /** 'YYYY-MM-DD' */
  value: string;
  onChange: (value: string) => void;
  /** 오늘 날짜. 서버/클라 타임존이 달라도 어긋나지 않도록 부모가 마운트 후 주입한다. */
  today: string;
  disabled?: boolean;
};

export function DueDatePicker({ value, onChange, today, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => fromISODate(value));
  // 키보드 커서. 선택과 별개다 — 화살표로 돌아다니다 Enter 를 눌러야 선택된다.
  const [cursor, setCursor] = useState(value);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // 여는 시점에 선택값 기준으로 맞춘다. 지난달을 보다가 닫았어도 다시 열면 선택된 달부터.
  //
  // 이걸 effect 로 하면 안 된다: 아래 포커스 effect 가 같은 커밋에서 "직전 렌더의 낡은 커서" 를
  // 보고 그 날짜에 포커스를 주고, onFocus 가 커서를 낡은 값으로 되돌려버린다.
  // (달을 넘겨보다 닫고 다시 열면 키보드 커서가 엉뚱한 날에서 출발하던 버그)
  // 세 setState 가 한 렌더로 배치되므로 여기서 동기적으로 정하면 그 경합 자체가 사라진다.
  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setViewMonth(fromISODate(value));
    setCursor(value);
    setOpen(true);
  }

  // 커서가 움직이면 그 날짜 버튼으로 포커스를 옮긴다 — 스크린리더가 날짜를 읽어준다.
  useEffect(() => {
    if (!open) return;
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${cursor}"]`);
    el?.focus();
  }, [open, cursor]);

  // 바깥 클릭으로 닫기
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function close(focusTrigger = true) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function select(iso: string) {
    onChange(iso);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;

    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };

    if (e.key in moves) {
      e.preventDefault();
      const next = addDays(cursor, moves[e.key]);
      setCursor(next);
      setViewMonth(fromISODate(next)); // 달을 넘어가면 화면도 따라간다
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        select(cursor);
        break;
      case 'PageUp':
      case 'PageDown': {
        e.preventDefault();
        const m = addMonths(viewMonth, e.key === 'PageUp' ? -1 : 1);
        setViewMonth(m);
        setCursor(toISODate(new Date(m.getFullYear(), m.getMonth(), 1)));
        break;
      }
      case 'Home':
        e.preventDefault();
        setCursor(today);
        setViewMonth(fromISODate(today));
        break;
    }
  }

  const days = calendarGrid(viewMonth);
  const viewY = viewMonth.getFullYear();
  const viewM = viewMonth.getMonth();

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded border border-ink-600 bg-ink-950/60 px-3 py-2 text-left text-parchment-100 transition hover:border-parchment-700 focus:border-gold-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-44"
      >
        <span className="truncate">{dueLabel(value, today)}</span>
        <CalendarIcon />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="마감일 선택"
          // 좁은 화면에서는 컨테이너 폭에 맞춘다. 고정 w-72(288px)로 두면 320px 기기에서
          // 우측 정렬 탓에 왼쪽이 화면 밖으로 잘린다.
          className="absolute right-0 top-full z-40 mt-2 w-full rounded-lg border border-parchment-700 bg-ink-900 p-3 shadow-xl shadow-black/60 sm:w-72"
        >
          <div className="flex items-center justify-between">
            <MonthButton label="이전 달" onClick={() => setViewMonth(addMonths(viewMonth, -1))}>
              ‹
            </MonthButton>
            <p className="font-display text-sm text-gold-400" aria-live="polite">
              {viewY}년 {viewM + 1}월
            </p>
            <MonthButton label="다음 달" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
              ›
            </MonthButton>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-0.5" aria-hidden="true">
            {WEEKDAYS_KO.map((w, i) => (
              <div
                key={w}
                className={`py-1 text-center text-[11px] ${
                  i === 0 ? 'text-red-400/70' : i === 6 ? 'text-tier-normal/70' : 'text-parchment-700'
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          <div ref={gridRef} role="grid" className="grid grid-cols-7 gap-0.5">
            {days.map((iso) => {
              const d = fromISODate(iso);
              const outside = d.getMonth() !== viewM;
              const selected = iso === value;
              const isToday = iso === today;

              return (
                <button
                  key={iso}
                  type="button"
                  data-date={iso}
                  role="gridcell"
                  aria-selected={selected}
                  // 커서에 있는 날짜만 탭 순서에 남긴다 — 42개를 다 훑게 하지 않는다.
                  tabIndex={iso === cursor ? 0 : -1}
                  onClick={() => select(iso)}
                  onFocus={() => setCursor(iso)}
                  className={[
                    // h-9 = 36px — 손가락으로 누를 만한 최소한
                    'relative h-9 rounded text-sm transition focus:outline-none focus:ring-1 focus:ring-gold-400',
                    selected
                      ? 'bg-gold-600/30 font-bold text-gold-400 ring-1 ring-gold-400'
                      : outside
                        ? 'text-parchment-700/50 hover:bg-ink-800'
                        : 'text-parchment-100 hover:bg-ink-800',
                  ].join(' ')}
                >
                  {d.getDate()}
                  {/* 오늘 표시 — 선택과 구분되도록 점으로 */}
                  {isToday && !selected && (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold-400" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-ink-700 pt-2">
            <button
              type="button"
              onClick={() => select(today)}
              className="rounded px-2 py-1 text-xs text-parchment-500 transition hover:bg-ink-800 hover:text-parchment-100"
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => close()}
              className="rounded px-2 py-1 text-xs text-parchment-500 transition hover:bg-ink-800 hover:text-parchment-100"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="h-7 w-7 rounded text-parchment-300 transition hover:bg-ink-800 hover:text-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
    >
      {children}
    </button>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4 shrink-0 text-parchment-500"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
