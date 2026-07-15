export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

/**
 * 모든 Server Action 의 반환 타입.
 *
 * 원시 에러를 throw 하면 스택이 클라이언트로 새어나가므로, 판별 유니온으로 감싸서
 * 호출부가 ok 로 분기하게 만든다.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: ErrorCode,
  message: string,
): ActionResult<T> {
  return { ok: false, error: { code, message } };
}
