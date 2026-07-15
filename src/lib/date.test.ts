import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  calendarGrid,
  diffCalendarDays,
  dueLabel,
  fromISODate,
  toISODate,
} from './date';

describe('toISODate / fromISODate', () => {
  it('로컬 캘린더 날짜를 그대로 왕복한다', () => {
    expect(toISODate(new Date(2026, 6, 20))).toBe('2026-07-20');
    expect(toISODate(fromISODate('2026-07-20'))).toBe('2026-07-20');
  });

  it('한 자리 월/일을 0 으로 채운다', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  // toISOString() 을 쓰면 UTC 로 환산돼 서울 기준 오전에 하루 밀린다.
  it('이른 아침에도 날짜가 밀리지 않는다', () => {
    expect(toISODate(new Date(2026, 6, 20, 0, 30))).toBe('2026-07-20');
    expect(toISODate(new Date(2026, 6, 20, 23, 59))).toBe('2026-07-20');
  });

  it("new Date('YYYY-MM-DD') 의 UTC 파싱 함정을 피한다", () => {
    // fromISODate 는 로컬 자정을 만든다 — getDate() 가 항상 그 날이어야 한다
    for (const iso of ['2026-01-01', '2026-07-20', '2026-12-31']) {
      expect(toISODate(fromISODate(iso))).toBe(iso);
    }
  });
});

describe('diffCalendarDays', () => {
  it('일수 차이를 낸다', () => {
    expect(diffCalendarDays('2026-07-20', '2026-07-22')).toBe(2);
    expect(diffCalendarDays('2026-07-22', '2026-07-20')).toBe(-2);
    expect(diffCalendarDays('2026-07-20', '2026-07-20')).toBe(0);
  });

  it('월/연 경계를 넘는다', () => {
    expect(diffCalendarDays('2026-07-31', '2026-08-01')).toBe(1);
    expect(diffCalendarDays('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('윤년 2월을 센다', () => {
    expect(diffCalendarDays('2028-02-28', '2028-03-01')).toBe(2); // 2028 은 윤년
    expect(diffCalendarDays('2026-02-28', '2026-03-01')).toBe(1);
  });
});

describe('addDays', () => {
  it('월 경계를 넘는다', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDays('2026-08-01', -1)).toBe('2026-07-31');
  });

  it('연 경계를 넘는다', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('달력 키보드 이동(±7)이 맞는다', () => {
    expect(addDays('2026-07-20', 7)).toBe('2026-07-27');
    expect(addDays('2026-07-01', -7)).toBe('2026-06-24');
  });
});

describe('addMonths', () => {
  it('해당 월 1일로 간다', () => {
    expect(toISODate(addMonths(new Date(2026, 6, 15), 1))).toBe('2026-08-01');
    expect(toISODate(addMonths(new Date(2026, 6, 15), -1))).toBe('2026-06-01');
  });

  // 1일로 고정하지 않으면 1/31 + 1개월이 3/3 으로 튄다
  it('31일에서 2월로 넘어가도 3월로 튀지 않는다', () => {
    expect(toISODate(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
  });

  it('연 경계를 넘는다', () => {
    expect(toISODate(addMonths(new Date(2026, 11, 10), 1))).toBe('2027-01-01');
    expect(toISODate(addMonths(new Date(2026, 0, 10), -1))).toBe('2025-12-01');
  });
});

describe('dueLabel', () => {
  it('마감 전은 D-, 당일은 오늘, 지난 뒤는 D+', () => {
    expect(dueLabel('2026-07-17', '2026-07-15')).toBe('7월 17일 (D-2)');
    expect(dueLabel('2026-07-15', '2026-07-15')).toBe('7월 15일 (오늘)');
    expect(dueLabel('2026-07-12', '2026-07-15')).toBe('7월 12일 (D+3)');
  });

  it('D-1 / D+1 이 하루 차이로 정확히 갈린다', () => {
    expect(dueLabel('2026-07-16', '2026-07-15')).toBe('7월 16일 (D-1)');
    expect(dueLabel('2026-07-14', '2026-07-15')).toBe('7월 14일 (D+1)');
  });

  // 0 은 앞뒤 어느 쪽도 아니라 D-0/D+0 이 헷갈린다
  it('당일은 D-0 이나 D+0 이 아니라 "오늘"', () => {
    const label = dueLabel('2026-07-15', '2026-07-15');
    expect(label).not.toContain('D-0');
    expect(label).not.toContain('D+0');
  });

  it('월/연 경계에서도 맞는다', () => {
    expect(dueLabel('2026-08-01', '2026-07-31')).toBe('8월 1일 (D-1)');
    expect(dueLabel('2026-07-31', '2026-08-01')).toBe('7월 31일 (D+1)');
    expect(dueLabel('2027-01-01', '2026-12-31')).toBe('1월 1일 (D-1)');
    expect(dueLabel('2026-12-31', '2027-01-01')).toBe('12월 31일 (D+1)');
  });

  it('한참 지난 마감도 D+ 로 센다', () => {
    expect(dueLabel('2026-07-05', '2026-07-15')).toBe('7월 5일 (D+10)');
    expect(dueLabel('2026-04-06', '2026-07-15')).toBe('4월 6일 (D+100)');
  });
});

describe('calendarGrid', () => {
  it('항상 42칸(6주)을 낸다 — 달마다 높이가 흔들리지 않게', () => {
    for (let m = 0; m < 12; m++) {
      expect(calendarGrid(new Date(2026, m, 1))).toHaveLength(42);
    }
  });

  it('항상 일요일로 시작한다', () => {
    for (let m = 0; m < 12; m++) {
      const grid = calendarGrid(new Date(2026, m, 1));
      expect(fromISODate(grid[0]).getDay(), `${m + 1}월`).toBe(0);
    }
  });

  it('해당 월의 모든 날짜를 포함한다', () => {
    const grid = calendarGrid(new Date(2026, 6, 1)); // 7월 = 31일
    for (let d = 1; d <= 31; d++) {
      expect(grid).toContain(`2026-07-${String(d).padStart(2, '0')}`);
    }
  });

  it('연속된 날짜다 (구멍 없음)', () => {
    const grid = calendarGrid(new Date(2026, 6, 1));
    for (let i = 1; i < grid.length; i++) {
      expect(diffCalendarDays(grid[i - 1], grid[i])).toBe(1);
    }
  });

  it('2026년 7월은 수요일에 1일이 시작한다', () => {
    const grid = calendarGrid(new Date(2026, 6, 1));
    // 일(0)~화(2) 는 6월, 수(3) 부터 7월 1일
    expect(grid[3]).toBe('2026-07-01');
    expect(grid[2]).toBe('2026-06-30');
  });

  it('1일이 일요일인 달도 앞이 비지 않는다', () => {
    // 2026-11-01 은 일요일
    const grid = calendarGrid(new Date(2026, 10, 1));
    expect(grid[0]).toBe('2026-11-01');
  });
});
