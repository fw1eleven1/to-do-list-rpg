// AI 응답을 DB/화면에 안전한 값으로 다듬는 순수 함수들.
// 'server-only' 를 붙이지 않아 단위 테스트가 가능하다.

/**
 * 모델이 "의뢰인이 없으면 null" 지시를 문자열 "null" 로 적어내는 경우가 있다.
 * 그대로 두면 화면에 "의뢰인: null" 이 찍힌다 — nullable 스키마도 이건 막지 못한다.
 * 값 없음을 뜻하는 표현들을 진짜 null 로 정규화한다.
 */
const NULLISH = new Set(['null', 'none', 'nil', 'n/a', 'na', 'undefined', '없음', '미상', '-', '?']);

export function normalizeQuestGiver(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (NULLISH.has(trimmed.toLowerCase())) return null;
  return trimmed.slice(0, 40);
}

/** 공백을 정리하고 DB 안전 길이로 자른다. 스키마 강제는 API 쪽 기능이고 DB 제약은 우리 책임이다. */
export function clampText(raw: string, max: number): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, max);
}
