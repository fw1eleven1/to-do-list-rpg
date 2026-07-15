import { describe, expect, it } from 'vitest';

import { DIFFICULTIES, DIFFICULTY_BASE_XP, baseXpFor } from './difficulty';
import { levelFrom, levelProgress, totalXpForLevel } from './level';
import { MIN_XP, calcAwardedXp, overdueDaysFor } from './xp';

describe('레벨 곡선', () => {
  it('0 XP 는 레벨 1', () => {
    expect(levelFrom(0)).toBe(1);
    expect(totalXpForLevel(1)).toBe(0);
  });

  it('문서에 적힌 임계값과 일치한다', () => {
    expect(totalXpForLevel(2)).toBe(50);
    expect(totalXpForLevel(3)).toBe(200);
    expect(totalXpForLevel(5)).toBe(800);
    expect(totalXpForLevel(10)).toBe(4050);
    expect(totalXpForLevel(20)).toBe(18050);
    expect(totalXpForLevel(30)).toBe(42050);
  });

  // sqrt 부동소수점 때문에 경계에서 한 칸 밀리는 걸 잡는 속성 테스트.
  // 유저는 1 XP 차이로 레벨이 튀는 걸 바로 알아챈다.
  it('L=1..200 에서 왕복이 정확하다', () => {
    for (let level = 1; level <= 200; level++) {
      const need = totalXpForLevel(level);
      expect(levelFrom(need), `레벨 ${level} 도달 XP(${need})`).toBe(level);

      if (level > 1) {
        expect(levelFrom(need - 1), `레벨 ${level} 도달 1 XP 전`).toBe(level - 1);
      }
      expect(levelFrom(need + 1), `레벨 ${level} 도달 1 XP 후`).toBe(level);
    }
  });

  it('XP 가 늘면 레벨은 절대 내려가지 않는다', () => {
    let prev = 1;
    for (let xp = 0; xp <= 50_000; xp += 7) {
      const level = levelFrom(xp);
      expect(level).toBeGreaterThanOrEqual(prev);
      prev = level;
    }
  });

  it('진행도는 0..1 안에 있고 경계에서 정확하다', () => {
    expect(levelProgress(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForNextLevel: 50, ratio: 0 });
    expect(levelProgress(25)).toMatchObject({ level: 1, xpIntoLevel: 25, ratio: 0.5 });
    // 레벨 2 시작 직후: 구간은 50→200 이라 길이 150
    expect(levelProgress(50)).toMatchObject({ level: 2, xpIntoLevel: 0, xpForNextLevel: 150, ratio: 0 });
    expect(levelProgress(125)).toMatchObject({ level: 2, xpIntoLevel: 75, ratio: 0.5 });

    for (let xp = 0; xp <= 20_000; xp += 13) {
      const { ratio } = levelProgress(xp);
      expect(ratio).toBeGreaterThanOrEqual(0);
      expect(ratio).toBeLessThan(1);
    }
  });
});

describe('난이도', () => {
  it('첫 normal 퀘스트 완료로 바로 레벨 2 가 된다 (온보딩 훅)', () => {
    expect(levelFrom(DIFFICULTY_BASE_XP.normal)).toBe(2);
  });

  it('난이도가 오를수록 XP 도 오른다', () => {
    const xps = DIFFICULTIES.map(baseXpFor);
    for (let i = 1; i < xps.length; i++) {
      expect(xps[i]).toBeGreaterThan(xps[i - 1]);
    }
  });

  it('모든 난이도가 최소 1 XP 이상이다 (DB CHECK 제약과 일치)', () => {
    for (const d of DIFFICULTIES) expect(baseXpFor(d)).toBeGreaterThanOrEqual(1);
  });
});

describe('XP 감쇠', () => {
  const tz = 'Asia/Seoul';
  // 서울 기준 2026-07-20 12:00
  const at = (iso: string) => new Date(iso);

  it('마감일이 없으면 감쇠하지 않는다', () => {
    expect(
      calcAwardedXp({ baseXp: 100, dueDate: null, completedAt: at('2030-01-01T00:00:00Z'), timezone: tz }),
    ).toEqual({ amount: 100, overdueDays: 0 });
  });

  it('마감 전에 끝내면 전액', () => {
    expect(
      calcAwardedXp({ baseXp: 100, dueDate: '2026-07-20', completedAt: at('2026-07-18T03:00:00Z'), timezone: tz }),
    ).toEqual({ amount: 100, overdueDays: 0 });
  });

  it('마감 당일은 몇 시에 끝내든 전액', () => {
    // 서울 2026-07-20 08:00 과 23:59 (= UTC 07-19 23:00, 07-20 14:59)
    for (const iso of ['2026-07-19T23:00:00Z', '2026-07-20T14:59:00Z']) {
      expect(calcAwardedXp({ baseXp: 100, dueDate: '2026-07-20', completedAt: at(iso), timezone: tz })).toEqual({
        amount: 100,
        overdueDays: 0,
      });
    }
  });

  // 계획서에 명시된 감쇠 표
  it.each([
    [0, 100],
    [1, 90],
    [5, 50],
    [9, 10],
    [10, MIN_XP], // 계수 0 → 최소치 도달
    [11, MIN_XP], // 계수 음수 → 하한 유지
    [100, MIN_XP],
  ])('연체 %i일 → %i XP (baseXp 100)', (days, expected) => {
    const completedAt = new Date(Date.UTC(2026, 6, 20 + days, 3, 0, 0));
    const res = calcAwardedXp({ baseXp: 100, dueDate: '2026-07-20', completedAt, timezone: tz });
    expect(res.overdueDays).toBe(days);
    expect(res.amount).toBe(expected);
  });

  it('모든 난이도 × 연체일수에서 하한 1 이 지켜지고 baseXp 를 넘지 않는다', () => {
    for (const d of DIFFICULTIES) {
      const baseXp = baseXpFor(d);
      for (const days of [0, 1, 5, 9, 10, 11, 100]) {
        const completedAt = new Date(Date.UTC(2026, 6, 20 + days, 3, 0, 0));
        const { amount } = calcAwardedXp({ baseXp, dueDate: '2026-07-20', completedAt, timezone: tz });
        expect(amount, `${d} / 연체 ${days}일`).toBeGreaterThanOrEqual(MIN_XP);
        expect(amount, `${d} / 연체 ${days}일`).toBeLessThanOrEqual(baseXp);
      }
    }
  });

  it('trivial(10 XP)도 10일 연체 시 정확히 1 이 된다', () => {
    const completedAt = new Date(Date.UTC(2026, 6, 30, 3, 0, 0));
    expect(calcAwardedXp({ baseXp: 10, dueDate: '2026-07-20', completedAt, timezone: tz }).amount).toBe(1);
  });
});

describe('타임존 경계', () => {
  // 이 테스트가 characters.timezone 컬럼의 존재 이유다.
  it('LA 유저가 마감일 저녁에 끝내면 연체 0일 (UTC 로는 다음날이지만)', () => {
    // UTC 2026-07-21 03:00 = LA 2026-07-20 20:00
    const completedAt = new Date('2026-07-21T03:00:00Z');

    expect(overdueDaysFor('2026-07-20', completedAt, 'America/Los_Angeles')).toBe(0);
    // 같은 순간을 서울 기준으로 보면 이미 7/21 이라 연체 1일
    expect(overdueDaysFor('2026-07-20', completedAt, 'Asia/Seoul')).toBe(1);
  });

  it('서울 자정 직전/직후에서 하루가 정확히 넘어간다', () => {
    // 서울 2026-07-20 23:59:59 = UTC 14:59:59
    expect(overdueDaysFor('2026-07-20', new Date('2026-07-20T14:59:59Z'), 'Asia/Seoul')).toBe(0);
    // 서울 2026-07-21 00:00:01 = UTC 15:00:01
    expect(overdueDaysFor('2026-07-20', new Date('2026-07-20T15:00:01Z'), 'Asia/Seoul')).toBe(1);
  });

  it('DST 전환을 건너뛰어도 캘린더 일수가 어긋나지 않는다', () => {
    // 미국 DST 종료: 2026-11-01. 10/30 마감 → 11/03 완료 = 캘린더로 4일
    const completedAt = new Date('2026-11-03T19:00:00Z'); // LA 11-03 11:00
    expect(overdueDaysFor('2026-10-30', completedAt, 'America/Los_Angeles')).toBe(4);
  });

  it('마감일보다 이른 완료는 음수가 아니라 0 이다', () => {
    expect(overdueDaysFor('2026-07-20', new Date('2026-07-01T00:00:00Z'), 'Asia/Seoul')).toBe(0);
  });
});
