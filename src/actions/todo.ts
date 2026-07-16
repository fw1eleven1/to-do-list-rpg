'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { generateQuest } from '@/lib/ai/generate-quest';
import { getUser } from '@/lib/guard';
import {
  ServiceError,
  assertWithinRateLimit,
  cancelTodo,
  completeTodo,
  createTodoWithQuest,
  type CompletionResult,
} from '@/lib/services/todo-service';
import { fail, ok, type ActionResult } from './types';

// 액션은 얇은 껍데기다: 인증 → Zod 파싱 → 서비스 호출 → revalidatePath.
// 유스케이스는 lib/services 가 소유한다.

const createInput = z.object({
  title: z.string().trim().min(1, '할 일을 입력해주세요.').max(200, '할 일은 200자를 넘을 수 없습니다.'),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '마감일 형식이 올바르지 않습니다.')
    .nullable(),
});

const todoIdInput = z.object({ todoId: z.uuid() });

export async function createTodoAction(input: unknown): Promise<ActionResult<{ todoId: string }>> {
  const user = await getUser();
  if (!user?.id) return fail('UNAUTHORIZED', '로그인이 필요합니다.');

  const parsed = createInput.safeParse(input);
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0].message);

  try {
    await assertWithinRateLimit(user.id);

    // AI 호출은 트랜잭션 밖에서. 실패해도 폴백 퀘스트가 돌아오므로 등록은 반드시 성공한다.
    const generated = await generateQuest({
      todoTitle: parsed.data.title,
      dueDate: parsed.data.dueDate,
    });

    const { todo } = await createTodoWithQuest({
      userId: user.id,
      title: parsed.data.title,
      dueDate: parsed.data.dueDate,
      generated,
    });

    revalidatePath('/quests');
    return ok({ todoId: todo.id });
  } catch (e) {
    if (e instanceof ServiceError) return fail(e.code, e.message);
    console.error('createTodoAction 실패', e);
    return fail('INTERNAL', '의뢰서를 붙이지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
}

export async function completeTodoAction(input: unknown): Promise<ActionResult<CompletionResult>> {
  const user = await getUser();
  if (!user?.id) return fail('UNAUTHORIZED', '로그인이 필요합니다.');

  const parsed = todoIdInput.safeParse(input);
  if (!parsed.success) return fail('VALIDATION', '잘못된 요청입니다.');

  try {
    const result = await completeTodo(user.id, parsed.data.todoId);
    revalidatePath('/quests');
    return ok(result);
  } catch (e) {
    if (e instanceof ServiceError) return fail(e.code, e.message);
    // 부분 유니크 인덱스가 이중 지급을 막았을 때. CAS 를 통과한 동시 요청이 여기로 온다.
    if (isUniqueViolation(e)) return fail('CONFLICT', '이미 보상을 받은 의뢰입니다.');
    console.error('completeTodoAction 실패', e);
    return fail('INTERNAL', '보상을 지급하지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
}

export async function cancelTodoAction(input: unknown): Promise<ActionResult<{ todoId: string }>> {
  const user = await getUser();
  if (!user?.id) return fail('UNAUTHORIZED', '로그인이 필요합니다.');

  const parsed = todoIdInput.safeParse(input);
  if (!parsed.success) return fail('VALIDATION', '잘못된 요청입니다.');

  try {
    const todo = await cancelTodo(user.id, parsed.data.todoId);
    revalidatePath('/quests');
    return ok({ todoId: todo.id });
  } catch (e) {
    if (e instanceof ServiceError) return fail(e.code, e.message);
    console.error('cancelTodoAction 실패', e);
    return fail('INTERNAL', '의뢰를 파기하지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && e.code === '23505';
}
