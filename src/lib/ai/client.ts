import 'server-only';

import OpenAI from 'openai';

import { env } from '@/lib/env';

// maxRetries: 0 — SDK 기본 재시도(2회)를 끄는 이유는 이 호출이 폼 제출 요청 경로 안에 있어서다.
// 기본값이면 실패 시 사용자가 최대 25초를 기다린다. 재시도 정책은 generate-quest.ts 가 직접 정한다.
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL,
  maxRetries: 0,
});
