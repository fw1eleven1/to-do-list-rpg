import 'server-only';

import { zodResponseFormat } from 'openai/helpers/zod';

import { baseXpFor } from '@/lib/game/difficulty';
import { env } from '@/lib/env';
import { openai } from './client';
import { fallbackQuest } from './fallback';
import { clampText, normalizeQuestGiver } from './normalize';
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import { questSchema } from './quest-schema';
import type { GeneratedQuest } from './types';

/** 폼 제출자를 붙잡아둘 수 있는 최대 시간. 초과하면 폴백. */
const TIMEOUT_MS = 10_000;

export type GenerateQuestInput = {
  todoTitle: string;
  /** 'YYYY-MM-DD' | null */
  dueDate: string | null;
  /** 오늘 날짜. 테스트에서 고정하기 위해 주입 가능하게 둔다. */
  today?: string;
};

/**
 * 할 일 → 퀘스트.
 *
 * AI 가 실패해도 절대 throw 하지 않는다. 할 일은 사용자의 데이터이고 퀘스트는 장식이다 —
 * 서드파티 API 가 딸꾹질했다고 사용자가 방금 타이핑한 내용을 잃는 건 변호할 수 없다.
 * 폴백 퀘스트로 채워서 "모든 todo 는 정확히 하나의 quest 를 가진다"는 불변식을 지킨다.
 *
 * 이 함수는 반드시 트랜잭션 밖에서 호출해야 한다 (todo-service.ts 주석 참고).
 */
export async function generateQuest(input: GenerateQuestInput): Promise<GeneratedQuest> {
  try {
    return await callOpenAI(input);
  } catch (e) {
    // 스키마 파싱 실패는 빠르게 실패하므로 1회만 재시도한다.
    // 타임아웃/5xx 는 재시도하지 않는다 — 폼 제출자를 20초 붙잡느니 폴백이 낫다.
    if (e instanceof SchemaError) {
      try {
        return await callOpenAI(input);
      } catch (retryError) {
        console.error('퀘스트 생성 재시도 실패 — 폴백', retryError);
        return fallbackQuest(input.todoTitle);
      }
    }

    console.error('퀘스트 생성 실패 — 폴백', e);
    return fallbackQuest(input.todoTitle);
  }
}

class SchemaError extends Error {}

async function callOpenAI(input: GenerateQuestInput): Promise<GeneratedQuest> {
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  const completion = await openai.chat.completions.parse(
    {
      model: env.OPENAI_MODEL,
      // 서술의 다양성과 난이도 판정의 일관성 사이 절충
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildUserPrompt({
            todoTitle: input.todoTitle,
            dueDate: input.dueDate,
            today,
          }),
        },
      ],
      response_format: zodResponseFormat(questSchema, 'quest'),
    },
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );

  const message = completion.choices[0]?.message;

  // 안전 필터 등으로 모델이 생성을 거부한 경우
  if (message?.refusal) {
    throw new Error(`모델이 생성을 거부함: ${message.refusal}`);
  }

  const parsed = message?.parsed;
  if (!parsed) {
    throw new SchemaError('구조화된 응답을 받지 못했습니다.');
  }

  // Structured Outputs 가 거의 보장해주지만 검증은 우리 책임이다.
  // 스키마 강제는 API 측 기능이고, DB 제약을 지키는 건 우리 쪽 일이다.
  const result = questSchema.safeParse(parsed);
  if (!result.success) {
    throw new SchemaError(result.error.issues[0].message);
  }

  const quest = result.data;

  return {
    // 심층 방어: DB 안전 길이로 한 번 더 자른다
    title: clampText(quest.title, 60),
    description: clampText(quest.description, 400),
    questGiver: normalizeQuestGiver(quest.questGiver),
    difficulty: quest.difficulty,
    // AI 가 아니라 서버가 정한다
    baseXp: baseXpFor(quest.difficulty),
    source: 'ai',
    model: completion.model,
    promptVersion: PROMPT_VERSION,
  };
}
