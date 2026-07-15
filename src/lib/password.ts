import 'server-only';

import bcrypt from 'bcryptjs';

const COST = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * 존재하지 않는 이메일로 로그인을 시도했을 때 비교할 더미 해시.
 *
 * 이게 없으면 "유저 없음"은 즉시 반환되고 "비밀번호 틀림"은 bcrypt 비교(~100ms)를 거쳐서,
 * 응답 시간 차이만으로 가입된 이메일인지 아닌지가 새어나간다.
 * 유저가 없을 때도 같은 비용의 비교를 한 번 돌려 타이밍을 맞춘다.
 */
export const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', COST);
