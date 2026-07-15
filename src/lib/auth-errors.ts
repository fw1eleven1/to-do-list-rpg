// 순수 함수 — 서버 페이지(쿼리스트링 ?error=)와 클라이언트 폼(signIn 결과) 양쪽에서 쓴다.
// 그래서 'use client' 도 'server-only' 도 붙이지 않는다.

/** NextAuth 가 돌려주는 에러 코드를 사람이 읽을 수 있는 문장으로. */
export function signInErrorMessage(code: string | undefined | null): string | null {
  if (!code) return null;

  switch (code) {
    case 'CredentialsSignin':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    // 같은 이메일이 이미 다른 방식(비밀번호 등)으로 가입된 경우.
    // 자동 연결(allowDangerousEmailAccountLinking)은 일부러 켜지 않았다 — OAuth 제공자가
    // 이메일 소유를 검증했다고 가정하는 셈이라 MVP 가 질 리스크가 아니다.
    case 'OAuthAccountNotLinked':
      return '이미 다른 방식으로 가입된 이메일입니다. 기존 방식으로 로그인해주세요.';
    default:
      return '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
}
