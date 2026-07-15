import 'server-only';

import { z } from 'zod';

// .env 파일에서 `KEY=` 처럼 비워둔 값은 process.env 에 빈 문자열로 들어온다.
// 그대로 두면 min(1) 에 걸려 "미설정"이 아니라 "잘못된 값"으로 죽으므로 undefined 로 정규화한다.
const optional = () =>
  z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional());

// 서버에서만 읽는 값들. 클라이언트 번들에 절대 실려서는 안 되므로 'server-only' 로 잠근다.
// 하나라도 없으면 부팅 시점에 죽는다 — 런타임에 undefined 로 이상하게 실패하는 것보다 낫다.
const schema = z
  .object({
    DATABASE_URL: z.string().min(1),

    OPENAI_API_KEY: z.string().min(1),
    OPENAI_MODEL: z.string().min(1).default('gpt-4o-mini'),
    // 폴백 동작을 실측할 때 응답 없는 주소로 돌려놓기 위한 탈출구
    OPENAI_BASE_URL: optional(),

    AUTH_SECRET: z.string().min(1),
    // Google 자격증명은 선택. 채워져 있으면 Google 로그인 버튼이 켜지고,
    // 비어 있으면 이메일+비밀번호만으로 동작한다.
    // 필수로 잡으면 콘솔에서 OAuth 앱을 만들기 전까지 앱이 부팅조차 못 한다.
    AUTH_GOOGLE_ID: optional(),
    AUTH_GOOGLE_SECRET: optional(),
  })
  // 한쪽만 채우는 건 십중팔구 실수다. 조용히 Google 버튼이 사라지는 것보다 여기서 죽는 게 낫다.
  .refine(
    (v) => Boolean(v.AUTH_GOOGLE_ID) === Boolean(v.AUTH_GOOGLE_SECRET),
    'AUTH_GOOGLE_ID 와 AUTH_GOOGLE_SECRET 은 둘 다 채우거나 둘 다 비워야 합니다.',
  );

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
    .join('\n  - ');
  throw new Error(
    `환경변수 설정이 잘못되었습니다:\n  - ${detail}\n.env.example 을 참고해 .env.local 을 채우세요.`,
  );
}

export const env = parsed.data;

/** Google 로그인을 쓸 수 있는지. 로그인 화면에서 버튼 노출 여부를 정한다. */
export const isGoogleEnabled = Boolean(env.AUTH_GOOGLE_ID);
