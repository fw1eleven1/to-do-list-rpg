// AI 퀘스트 생성 품질을 눈으로 확인하는 스크립트.
// 실행: npm run quest:preview
import { generateQuest } from '@/lib/ai/generate-quest';

const CASES: Array<{ title: string; dueDate: string | null; expect: string }> = [
  { title: '설거지하기', dueDate: '2026-07-16', expect: 'trivial~easy' },
  { title: '세금 신고서 제출', dueDate: '2026-07-20', expect: 'normal~hard' },
  { title: '석사 학위 논문 완성', dueDate: '2026-12-31', expect: 'legendary' },
  { title: '엄마한테 전화하기', dueDate: '2026-07-15', expect: 'trivial' },
  { title: '팀 회의록 정리해서 슬랙에 공유', dueDate: '2026-07-17', expect: 'easy~normal (현대 용어 은유 치환 확인)' },
  { title: 'ㅁㄴㅇㄹ', dueDate: null, expect: '모호해도 의뢰서를 만들어내는지' },
];

const t0 = Date.now();

const results = await Promise.all(
  CASES.map(async (c) => {
    const started = Date.now();
    const quest = await generateQuest({ todoTitle: c.title, dueDate: c.dueDate, today: '2026-07-15' });
    return { c, quest, ms: Date.now() - started };
  }),
);

for (const { c, quest, ms } of results) {
  console.log('\n' + '─'.repeat(70));
  console.log(`원문   : ${c.title}  (마감 ${c.dueDate ?? '없음'})`);
  console.log(`기대   : ${c.expect}`);
  console.log(`판정   : ${quest.difficulty} → ${quest.baseXp} XP   [${quest.source}] ${ms}ms`);
  console.log(`제목   : ${quest.title}`);
  console.log(`의뢰인 : ${quest.questGiver ?? '(없음)'}`);
  console.log(`서술   : ${quest.description}`);
}

const fallbacks = results.filter((r) => r.quest.source === 'fallback').length;
console.log('\n' + '─'.repeat(70));
console.log(`총 ${results.length}건 · 폴백 ${fallbacks}건 · 전체 ${Date.now() - t0}ms`);
process.exit(0);
