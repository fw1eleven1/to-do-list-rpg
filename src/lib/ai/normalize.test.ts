import { describe, expect, it } from 'vitest';

import { clampText, normalizeQuestGiver } from './normalize';

describe('normalizeQuestGiver', () => {
  it('정상적인 이름은 그대로 둔다', () => {
    expect(normalizeQuestGiver('늙은 마녀 그레타')).toBe('늙은 마녀 그레타');
  });

  // 실제로 겪은 버그: 모델이 "없으면 null" 지시를 문자열 "null" 로 적어내
  // 화면에 "의뢰인: null" 이 찍혔다. nullable 스키마로는 못 막는다.
  it.each(['null', 'NULL', 'None', 'nil', 'N/A', 'undefined', '없음', '미상', '-', '?'])(
    '"%s" 는 진짜 null 로 정규화한다',
    (raw) => {
      expect(normalizeQuestGiver(raw)).toBeNull();
    },
  );

  it('빈 문자열/공백/null/undefined 는 null', () => {
    expect(normalizeQuestGiver('')).toBeNull();
    expect(normalizeQuestGiver('   ')).toBeNull();
    expect(normalizeQuestGiver(null)).toBeNull();
    expect(normalizeQuestGiver(undefined)).toBeNull();
  });

  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeQuestGiver('  대장장이 보린  ')).toBe('대장장이 보린');
    expect(normalizeQuestGiver('  null  ')).toBeNull();
  });

  it('DB 안전 길이(40)로 자른다', () => {
    expect(normalizeQuestGiver('가'.repeat(100))).toHaveLength(40);
  });

  it('이름 안에 null 이 포함된 건 살린다 (완전 일치일 때만 제거)', () => {
    expect(normalizeQuestGiver('널 감시자')).toBe('널 감시자');
    expect(normalizeQuestGiver('Nullaria 의 사제')).toBe('Nullaria 의 사제');
  });
});

describe('clampText', () => {
  it('길이를 제한한다', () => {
    expect(clampText('가'.repeat(500), 400)).toHaveLength(400);
  });

  it('연속 공백과 개행을 한 칸으로 접는다', () => {
    expect(clampText('첫 문장.\n\n  둘째   문장.', 400)).toBe('첫 문장. 둘째 문장.');
  });

  it('짧은 텍스트는 건드리지 않는다', () => {
    expect(clampText('짧다', 400)).toBe('짧다');
  });
});
