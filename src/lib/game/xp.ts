import { TZDate } from '@date-fns/tz';

/**
 * 마감일 하루 초과당 깎이는 비율 — 퍼센트 정수로 둔다.
 *
 * 0.1 같은 소수로 두면 안 된다: 1 - 0.1*9 는 0.1 이 아니라 0.09999999999999998 이라
 * floor(100 * 그것) 이 10 이 아니라 9 가 되어 유저가 1 XP 를 손해 본다.
 * 정수 퍼센트로 계산하면 나눗셈 한 번만 남아 오차가 끼어들 자리가 없다.
 */
export const DECAY_PERCENT_PER_DAY = 10;

/** 아무리 늦어도 이만큼은 준다. */
export const MIN_XP = 1;

export type XpInput = {
  /** quests.base_xp — DB 에서 읽은 값. 클라이언트가 보낸 값이 아니다. */
  baseXp: number;
  /** 'YYYY-MM-DD'. 없으면 감쇠 없음. */
  dueDate: string | null;
  /** 서버 시각(new Date()). 클라이언트 값을 받으면 백데이트로 감쇠를 회피할 수 있다. */
  completedAt: Date;
  /** characters.timezone — IANA */
  timezone: string;
};

/** 'YYYY-MM-DD' 를 (연, 월, 일) 로. */
function parseDueDate(dueDate: string): [number, number, number] {
  const [y, m, d] = dueDate.split('-').map(Number);
  return [y, m, d];
}

/**
 * 마감일을 며칠 넘겼는지. 밀리초 차이가 아니라 "캘린더 일 차이"다.
 *
 * (now - due) / 86400000 은 틀린다: LA 유저가 7/20 저녁에 완료하면 UTC 로는 이미 7/21 이라
 * 없는 연체 1일이 생겨 10% 를 강탈당한다. 유저 타임존의 캘린더 날짜로 비교해야 한다.
 *
 * 함정: new TZDate('2026-07-20T00:00:00', tz) 는 문자열을 그 타임존의 벽시계로 읽지 않는다.
 * 시스템 타임존으로 파싱한 뒤 tz 로 환산하므로, 서버 로케일에 따라 마감일이 하루씩 밀린다.
 * 그래서 타임존 변환은 completedAt → 캘린더 날짜를 뽑는 데만 쓰고, 비교는 순수 (연,월,일) 로 한다.
 * 양쪽 다 UTC 자정으로 환산해서 빼면 DST 로 하루가 23/25시간이 되어도 영향이 없다.
 */
export function overdueDaysFor(
  dueDate: string,
  completedAt: Date,
  timezone: string,
): number {
  const local = new TZDate(completedAt, timezone);
  const completedDay = Date.UTC(local.getFullYear(), local.getMonth(), local.getDate());

  const [y, m, d] = parseDueDate(dueDate);
  const dueDay = Date.UTC(y, m - 1, d);

  const days = Math.round((completedDay - dueDay) / 86_400_000);
  return Math.max(0, days);
}

/**
 * 실제 획득 XP.
 *
 *   amount = max(1, floor(baseXp * (100 - 10 * 연체일수) / 100))
 *
 * - 연체 0일(마감 당일 완료 포함) → 전액. 당일은 몇 시에 완료하든 전액이다.
 * - 연체 10일 → 계수 0 → max(1, 0) = 1. 최소치 도달.
 * - 연체 11일 이상 → 계수 음수 → 여전히 1. 하한 유지.
 */
export function calcAwardedXp(input: XpInput): {
  amount: number;
  overdueDays: number;
} {
  const { baseXp, dueDate, completedAt, timezone } = input;

  if (!dueDate) return { amount: baseXp, overdueDays: 0 };

  const overdueDays = overdueDaysFor(dueDate, completedAt, timezone);

  // 분자까지는 전부 정수 연산이라 오차가 없다. 나눗셈 결과가 정수여야 할 때는
  // 부동소수점도 정확히 그 정수를 내므로 floor 가 한 칸 밀리지 않는다.
  const remainingPercent = 100 - DECAY_PERCENT_PER_DAY * overdueDays;
  const decayed = Math.floor((baseXp * remainingPercent) / 100);

  return { amount: Math.max(MIN_XP, decayed), overdueDays };
}
