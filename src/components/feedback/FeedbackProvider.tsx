'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { CompletionResult } from '@/lib/services/todo-service';

/**
 * 완료 피드백은 퀘스트 카드 바깥에서 살아야 한다.
 *
 * 카드 안에 두면 완료 → revalidatePath → 그 퀘스트가 '진행 중' 목록에서 빠짐 → 카드 언마운트로
 * 토스트가 뜨자마자 사라진다. 축하 연출이 화면에 도달조차 못 한다.
 * 그래서 목록 바깥(페이지 레벨)에 두고 카드는 이 컨텍스트로 결과만 보고한다.
 */
const FeedbackContext = createContext<((result: CompletionResult) => void) | null>(null);

export function useQuestFeedback() {
  const show = useContext(FeedbackContext);
  if (!show) throw new Error('FeedbackProvider 안에서만 쓸 수 있습니다.');
  return show;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<CompletionResult | null>(null);
  // 같은 결과가 연속으로 와도 애니메이션이 다시 돌도록 키를 준다
  const [key, setKey] = useState(0);

  const show = useCallback((r: CompletionResult) => {
    setResult(r);
    setKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), result.leveledUp ? 4000 : 2200);
    return () => clearTimeout(t);
  }, [result, key]);

  return (
    <FeedbackContext.Provider value={show}>
      {children}
      {result && <CompletionToast key={key} result={result} />}
    </FeedbackContext.Provider>
  );
}

function CompletionToast({ result }: { result: CompletionResult }) {
  const decayed = result.overdueDays > 0;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-8 z-50 mx-auto w-fit px-4"
    >
      <div
        className={`rounded-lg border bg-ink-900/95 px-6 py-3 text-center shadow-lg ${
          result.leveledUp
            ? 'border-gold-400 shadow-gold-600/30'
            : 'border-ink-600 shadow-black/40'
        }`}
      >
        {result.leveledUp && (
          <p className="font-display text-lg tracking-widest text-gold-400">LEVEL UP</p>
        )}

        <p className={result.leveledUp ? 'mt-0.5 text-sm text-parchment-100' : 'text-sm text-parchment-100'}>
          {result.leveledUp ? (
            <>레벨 {result.level} 에 도달했습니다</>
          ) : (
            <>의뢰 완수</>
          )}
        </p>

        <p className="mt-1 text-sm font-bold text-gold-400">+{result.awardedXp} XP</p>

        {/* 감쇠가 일어났을 때만 이유를 밝힌다. 왜 덜 받았는지 모르면 규칙을 학습할 수 없다. */}
        {decayed && (
          <p className="mt-0.5 text-xs text-parchment-500">
            기본 {result.baseXp} XP · {result.overdueDays}일 연체 −{result.overdueDays * 10}%
          </p>
        )}
      </div>
    </div>
  );
}
