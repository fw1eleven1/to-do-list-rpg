import { z } from 'zod';

/**
 * 닉네임 규칙. 가입(signUpAction)과 수정(updateNicknameAction)이 같은 걸 쓴다 —
 * 한쪽만 고쳐서 규칙이 갈라지는 걸 막는다.
 *
 * 유니크 제약은 걸지 않는다: 소셜 기능이 없어 닉네임은 식별자가 아니라 표시용이고,
 * 유니크로 만들면 "이미 사용 중인 닉네임입니다" 마찰만 생긴다. (docs/architecture.md 참고)
 */
export const nicknameSchema = z
  .string()
  .trim()
  .min(2, '닉네임은 2자 이상이어야 합니다.')
  .max(16, '닉네임은 16자를 넘을 수 없습니다.');

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 16;

/** 닉네임이 없는 옛 계정(이름 없이 만들어진 것)을 위한 표시용 기본값. */
export const NICKNAME_FALLBACK = '이름 없는 모험가';
