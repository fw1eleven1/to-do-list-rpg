// 'YYYY-MM-DD' 캘린더 날짜를 다루는 순수 함수들.
//
// 원칙: toISOString() 을 쓰지 않는다. 그건 UTC 로 환산하므로 로컬 캘린더 날짜가 하루씩 밀린다
// (서울 유저가 오전 8시에 보면 UTC 로는 아직 전날이다). 항상 로컬 (연,월,일) 로만 다룬다.

/** Date → 'YYYY-MM-DD' (로컬 캘린더 기준) */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' → 로컬 자정 Date. new Date('2026-07-20') 은 UTC 로 파싱되므로 쓰면 안 된다. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** 두 캘린더 날짜의 일수 차이 (to - from). 양쪽 다 UTC 자정으로 환산해 빼므로 DST 영향이 없다. */
export function diffCalendarDays(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function addMonths(d: Date, delta: number): Date {
  // 1일로 고정한 뒤 옮긴다. 31일에서 2월로 넘어갈 때 3월로 튀는 걸 막는다.
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

export function addDays(iso: string, delta: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

/**
 * "7월 17일 (D-2)" — 마감일 표기. today 를 주입받아 순수하게 유지한다.
 *
 * 관례대로 D-n 은 마감 n일 전, D+n 은 마감 n일 후(=연체 n일)를 뜻한다.
 * 마감 당일만 D-0 대신 "오늘" 로 쓴다 — 0 은 앞뒤 어느 쪽도 아니라 헷갈린다.
 */
export function dueLabel(dueISO: string, todayIso: string): string {
  const [, m, d] = dueISO.split('-').map(Number);
  const diff = diffCalendarDays(todayIso, dueISO);

  const date = `${m}월 ${d}일`;
  if (diff === 0) return `${date} (오늘)`;
  if (diff > 0) return `${date} (D-${diff})`;
  return `${date} (D+${-diff})`;
}

/** 달력 그리드용 6주(42일). 높이가 달마다 흔들리지 않도록 항상 6주를 낸다. */
export function calendarGrid(viewMonth: Date): string[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // 그 주의 일요일까지 되감기

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toISODate(d);
  });
}
