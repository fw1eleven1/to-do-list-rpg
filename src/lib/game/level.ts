/**
 * 레벨 곡선.
 *
 *   totalXpForLevel(L) = 50 * (L - 1)²
 *   levelFrom(xp)      = floor(sqrt(xp / 50)) + 1
 *
 * 누적이 2차식 = 레벨당 요구량이 선형 증가(50*(2L-1)) → 초반은 후하고 후반은 완만히 무거워지는
 * 전형적인 RPG 체감. 튜닝 노브는 상수 XP_SCALE 하나뿐이다.
 *
 * 양방향 닫힌 형식이라 임계값 테이블이 필요 없고 levelFrom 이 O(1) 이라 XP 바 계산이 공짜다.
 */
const XP_SCALE = 50;

/** L 레벨에 도달하는 데 필요한 누적 XP. */
export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return XP_SCALE * (level - 1) ** 2;
}

/** 누적 XP 로부터 현재 레벨. */
export function levelFrom(totalXp: number): number {
  if (totalXp <= 0) return 1;

  // sqrt 는 부동소수점이라 경계에서 한 칸 밀릴 수 있다 (예: sqrt(x²) 가 x-1.9999… 로 나오는 경우).
  // 유저는 1 XP 차이로 레벨이 튀는 걸 바로 알아채므로, 정수 연산으로 한 칸 보정한다.
  let level = Math.floor(Math.sqrt(totalXp / XP_SCALE)) + 1;
  while (totalXpForLevel(level + 1) <= totalXp) level += 1;
  while (level > 1 && totalXpForLevel(level) > totalXp) level -= 1;
  return level;
}

/** XP 바 렌더용 진행도. */
export function levelProgress(totalXp: number) {
  const level = levelFrom(totalXp);
  const current = totalXpForLevel(level);
  const next = totalXpForLevel(level + 1);
  const span = next - current;
  const into = totalXp - current;

  return {
    level,
    /** 현재 레벨 구간에서 얼마나 왔는지 */
    xpIntoLevel: into,
    /** 현재 레벨 구간의 총 길이 */
    xpForNextLevel: span,
    /** 0..1 */
    ratio: span > 0 ? into / span : 0,
  };
}
