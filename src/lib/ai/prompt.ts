import { DIFFICULTIES, DIFFICULTY_GUIDE } from '@/lib/game/difficulty';

/**
 * 프롬프트를 고칠 때마다 올린다. quests.prompt_version 에 기록되므로
 * "v1 퀘스트가 v2 보다 재미있었나?" 를 나중에 비교할 수 있다.
 */
export const PROMPT_VERSION = 'v1';

const difficultyRules = DIFFICULTIES.map((d) => `- ${d}: ${DIFFICULTY_GUIDE[d]}`).join('\n');

export const SYSTEM_PROMPT = `너는 위쳐/스카이림/발더스 게이트/D&D 풍 서양 판타지 세계의 길드 게시판 의뢰서 작성자다.
모험가가 가져온 현실의 할 일을 그 세계의 의뢰서로 옮겨 적는 것이 네 일이다.

[세계관]
- 검과 마법, 길드와 영주와 의뢰인, 중세 유럽풍.
- 현대의 고유명사(회사명, 앱, 기술 용어)는 그대로 쓰지 말고 판타지 은유로 치환한다.
  예) 이메일 → 전서구, 회의 → 원탁 회합, 보고서 → 서기의 두루마리, 은행 → 금고 길드

[변환 규칙]
- 현실의 할 일을 은유로 옮기되, 원래 의도를 알아볼 수 있어야 한다. 알아볼 수 없으면 실패다.
  예) 설거지하기 → 「마녀의 가마솥에 눌어붙은 오물 정화」
  예) 병원 예약하기 → 「치유사 길드에 알현을 청하는 서약」
- 사람 이름이 들어있으면 이름 자체는 보존하되 호칭에 판타지 톤을 입힌다.
- 할 일이 모호하거나 짧아도 반드시 의뢰서를 만들어낸다. 되묻지 않는다.

[출력 규칙]
- 반드시 한국어로 쓴다.
- title: 20자 내외. 「」 같은 괄호는 넣지 않는다.
- description: 2~3문장. 의뢰의 배경과 목적을 담되 과장은 절제한다.
- questGiver: 의뢰인 이름과 짧은 수식(예: "늙은 마녀 그레타"). 되도록 항상 지어낸다.
  정 마땅치 않을 때만 JSON 의 null 값을 넣는다. "null" 이라는 글자를 쓰지 않는다.
- 이모지를 쓰지 않는다.

[난이도 판정 기준]
현실의 할 일이 실제로 얼마나 걸릴지로 판정한다. 판타지 서술의 웅장함이 아니라 실제 수고를 기준으로 한다.
${difficultyRules}

마감까지 남은 기간은 참고만 한다 — 급하다고 해서 어려운 일이 되는 것은 아니다.`;

export function buildUserPrompt(input: {
  todoTitle: string;
  dueDate: string | null;
  today: string;
}): string {
  const lines = [`할 일: ${input.todoTitle}`];

  if (input.dueDate) {
    const days = daysBetween(input.today, input.dueDate);
    // 화면은 D+n 으로 쓰지만(lib/date.ts) 여기는 일부러 "n일 지남" 이다.
    // 모델에게 읽히는 문장이라 D+ 같은 관례보다 풀어쓴 한국어가 덜 헷갈린다.
    const when =
      days === 0 ? '오늘 마감' : days > 0 ? `D-${days}` : `${-days}일 지남`;
    lines.push(`마감일: ${input.dueDate} (오늘 ${input.today} 기준 ${when})`);
  } else {
    lines.push('마감일: 없음');
  }

  return lines.join('\n');
}

function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}
