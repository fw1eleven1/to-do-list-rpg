// AI 가 죽었을 때도 할 일 등록이 살아남는지 검증한다.
// 환경변수를 바꿔가며 여러 번 돌려야 하므로 자식 프로세스로 격리해서 실행한다.
import { execFileSync } from 'node:child_process';

let failed = false;
const check = (label: string, cond: boolean, detail = '') => {
  console.log(`${cond ? '  OK  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failed = true;
};

/** 자식 프로세스에서 generateQuest 를 한 번 호출하고 결과를 JSON 으로 받는다. */
function runWith(envOverrides: Record<string, string>, timeoutMs = 60_000) {
  const code = `
    import { generateQuest } from '@/lib/ai/generate-quest';
    const started = Date.now();
    const q = await generateQuest({ todoTitle: '설거지하기', dueDate: '2026-07-20', today: '2026-07-15' });
    console.log('__RESULT__' + JSON.stringify({ ...q, ms: Date.now() - started }));
    process.exit(0);
  `;
  const out = execFileSync(
    'node',
    ['--import', 'tsx', '--env-file=.env.local', '--conditions=react-server', '--input-type=module', '-e', code],
    {
      encoding: 'utf8',
      timeout: timeoutMs,
      env: { ...process.env, ...envOverrides },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const line = out.split('\n').find((l) => l.startsWith('__RESULT__'));
  if (!line) throw new Error(`결과를 못 받음:\n${out}`);
  return JSON.parse(line.replace('__RESULT__', ''));
}

console.log('\n=== 1. 정상 키 → AI 생성 ===');
const good = runWith({});
check('source=ai', good.source === 'ai', `source=${good.source}`);
check('퀘스트 제목이 원문과 다름 (실제 생성됨)', good.title !== '「설거지하기」의 의뢰', good.title);
check('model 기록됨', Boolean(good.model), good.model);
check('promptVersion 기록됨', good.promptVersion === 'v1');

console.log('\n=== 2. 잘못된 키 → 폴백 (등록은 성공해야 함) ===');
const badKey = runWith({ OPENAI_API_KEY: 'sk-proj-this-key-is-garbage' });
check('예외를 던지지 않고 폴백을 반환', badKey.source === 'fallback', `source=${badKey.source}`);
check('폴백 제목', badKey.title === '「설거지하기」의 의뢰', badKey.title);
check('폴백 난이도는 normal', badKey.difficulty === 'normal');
check('폴백도 baseXp 를 갖는다', badKey.baseXp === 50);
check('model/promptVersion 은 null', badKey.model === null && badKey.promptVersion === null);

console.log('\n=== 3. 응답 없는 주소 → 타임아웃 후 폴백 ===');
// 192.0.2.0/24 는 TEST-NET-1. 라우팅되지 않아 연결이 매달린다.
const timedOut = runWith({ OPENAI_BASE_URL: 'http://192.0.2.1:9999/v1' }, 60_000);
check('타임아웃 후에도 폴백 반환', timedOut.source === 'fallback', `source=${timedOut.source}`);
check('10초 예산 안에서 끝남', timedOut.ms < 14_000, `${timedOut.ms}ms`);

console.log('\n=== 4. 존재하지 않는 모델 → 폴백 ===');
const badModel = runWith({ OPENAI_MODEL: 'gpt-does-not-exist-9000' });
check('폴백 반환', badModel.source === 'fallback', `source=${badModel.source}`);

console.log(failed ? '\n=== 결과: 실패 ===' : '\n=== 결과: 전부 통과 ===');
process.exit(failed ? 1 : 0);
