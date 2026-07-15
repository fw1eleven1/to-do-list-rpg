# 아키텍처 노트

코드를 읽어서는 알 수 없는 결정들과 그 이유. 왜 이렇게 되어 있는지 궁금할 때 여기를 본다.

## 왜 sessions 테이블이 비어 있나

**NextAuth v5 의 Credentials provider 는 database session 전략과 양립할 수 없다.** Credentials 를 쓰면
`session.strategy` 가 `'jwt'` 여야 한다. 이메일+비밀번호 로그인이 요구사항이므로 JWT 로 간다.

Drizzle adapter 는 계속 쓴다(users/accounts 저장, Google 계정 연결). `sessions` 테이블은 adapter 표준
스키마라 만들어두되 실제로는 아무도 쓰지 않는다.

- **대가**: 서버측 세션 무효화 불가. 로그아웃은 쿠키 삭제일 뿐이라 이미 발급된 JWT 는 만료(30일)까지 유효하다.
  이 규모에서는 수용 가능하다고 판단했다.
- **필수 주의**: JWT 전략에서는 `callbacks.jwt` / `callbacks.session` 이 없으면 `session.user.id` 가
  `undefined` 다. 모든 소유권 검사가 여기 의존하므로 인증을 건드릴 때 가장 먼저 확인할 것.
  (`src/lib/auth.ts`)

## 왜 닉네임을 session.user.name 이 아니라 DB 에서 읽나

**session.user.name 은 표시에 쓰지 않는다.** JWT 전략이라 그 값은 로그인 시점에 토큰으로 굳는다.
그래서 닉네임을 수정해도 토큰의 옛 이름이 만료(30일)까지 남아 화면이 안 바뀐다.

메인 페이지는 어차피 캐릭터를 읽느라 DB 를 치므로, 같은 쿼리에서 `users.name` 까지 가져오면
그 문제가 통째로 사라진다 (`getProfile()`). 토큰을 갱신하는 방법(`unstable_update`)도 있지만
요청마다 DB 를 치거나 세션을 재발급해야 해서, "읽는 쪽에서 DB 를 본다" 가 더 단순하다.

닉네임은 `users.name` 에 넣는다 — 어댑터 표준 컬럼이라 Google 로그인도 같은 자리에 프로필 이름을
채워준다. 덕분에 화면은 가입 경로를 신경 쓰지 않아도 된다.

**닉네임에 유니크 제약은 없다.** 소셜 기능이 없어 닉네임은 식별자가 아니라 표시용이고,
유니크로 만들면 "이미 사용 중입니다" 마찰만 생긴다. 랭킹 같은 게 붙으면 그때 추가한다.
규칙은 `src/lib/nickname.ts` 한 곳에 있다 — 가입과 수정이 갈라지지 않도록.

## 왜 middleware.ts 가 없나

미들웨어는 Edge 런타임이라 `pg` / `bcryptjs` 가 돌지 않는다. `lib/auth.ts` 를 미들웨어에서 import 하면
그것들이 딸려와 번들이 터지고, 흔히 `auth.config` 를 edge-safe 하게 쪼개는 우회를 하게 된다.
어차피 모든 액션은 소유권 검사를 위해 세션이 필요하므로 `requireUser()` / `getUser()` 하나로 통일했다.
(`src/lib/guard.ts`)

## 왜 XP 를 AI 가 정하지 않나

XP 는 게임 경제의 화폐다. LLM 은 "이 일이 어려워 보인다"는 의미 판단은 잘하지만, 수백 건에 걸쳐 일관된
화폐 발행량을 유지하는 데는 부적합하다. 어느 날 모델이 9999 를 뱉으면 경제가 끝난다.

그래서 **AI 는 난이도 5지선다만 고르고, baseXp 는 서버가 `DIFFICULTY_BASE_XP` 표로 산출한다.**
난이도는 Structured Outputs 로 집합이 닫혀 있어 최악의 경우도 "약간 후한 판정" 수준이다.

부수 효과: 리밸런싱이 상수 한 줄 수정으로 끝나고, XP 계산이 완전 결정적이라 테스트가 가능하다.
(`src/lib/game/difficulty.ts`, `src/lib/ai/quest-schema.ts`)

## 왜 quests.base_xp 를 저장하나 (난이도로 매번 계산하지 않고)

난이도→XP 매핑을 나중에 리밸런싱해도 **이미 발급된 퀘스트의 약속된 보상은 바뀌면 안 된다.**
생성 시점 값을 동결한다.

## 왜 characters 에 level 컬럼이 없나

레벨은 `total_xp` 의 순수 함수(`levelFrom`)다. 저장하면 드리프트할 수 있는 중복이 된다.
레벨업 감지는 같은 요청 안에서 `levelFrom(before)` vs `levelFrom(after)` 비교로 충분하다.
곡선을 리밸런싱하면 전 유저 레벨이 마이그레이션 없이 자동 재계산된다.

## 왜 xp_events 원장이 있나 (todos.awarded_xp 컬럼 대신)

1. `characters.total_xp` 가 **재구축 가능한 캐시**가 된다 — `SELECT sum(amount)` 로 검증/복구 가능.
   버그로 XP 가 틀어졌을 때 고칠 방법이 생긴다.
2. 2차 기능(업적 보너스, 아이템 판매)이 컬럼 추가가 아니라 `reason` enum 값 추가로 끝난다.
3. `base_xp`/`overdue_days` 스냅샷이 있어 UI 가 "기본 80 XP · 3일 연체 −30% → 56 XP" 를 그릴 수 있고,
   공식이 바뀌어도 과거 기록이 거짓말하지 않는다.
4. 부분 유니크 인덱스(`xp_events_one_completion_per_todo`)가 이중 지급을 DB 층에서 불가능하게 만든다.

## 왜 AI 호출이 트랜잭션 밖인가

트랜잭션을 열어둔 채 10초짜리 AI 를 호출하면 pg 커넥션을 그동안 붙잡아 동시 사용자 몇 명에 풀이 고갈된다.
그래서 순서가 **AI 호출(트랜잭션 밖) → 짧은 트랜잭션(todo + quest INSERT)** 이다.
부수 효과로 "퀘스트 없는 고아 todo" 가 구조적으로 불가능해진다.
(`src/lib/services/todo-service.ts`)

## 왜 AI 실패 시 퀘스트를 비워두지 않고 폴백으로 채우나

할 일은 사용자의 데이터이고 퀘스트는 장식이다. 서드파티 API 가 딸꾹질했다고 사용자가 방금 타이핑한 내용을
잃는 건 변호할 수 없다. 나아가 폴백으로 채우면 **"모든 todo 는 정확히 하나의 quest 를 가진다"** 는 불변식이
서서 UI 전체에서 null 분기가 사라진다.

`quests.source` 컬럼이 `'fallback'` 인 것만 골라내면 2차에서 재생성 대상을 정확히 찾을 수 있다.
(`src/lib/ai/fallback.ts`)

## 왜 완료 토스트가 QuestActions 안에 없나

카드 안에 두면 완료 → `revalidatePath` → 그 퀘스트가 '진행 중' 목록에서 빠짐 → **카드가 언마운트되면서
토스트도 함께 사라진다.** 축하 연출이 화면에 도달조차 못 한다.
그래서 목록 바깥(페이지 레벨)의 `FeedbackProvider` 가 소유하고, 카드는 컨텍스트로 결과만 보고한다.
(`src/components/feedback/FeedbackProvider.tsx`)

## 타임존을 왜 characters 에 저장하나

연체일수는 밀리초 차이가 아니라 **캘린더 일 차이**다. `(now - due) / 86400000` 은 틀린다:
LA 유저가 7/20 저녁에 완료하면 UTC 로는 이미 7/21 이라 없는 연체 1일이 생겨 10% 를 강탈당한다.

**함정**: `new TZDate('2026-07-20T00:00:00', tz)` 는 문자열을 그 타임존의 벽시계로 읽지 않는다.
시스템 타임존으로 파싱한 뒤 tz 로 환산하므로 서버 로케일에 따라 마감일이 하루씩 밀린다.
그래서 타임존 변환은 `completedAt` → 캘린더 날짜를 뽑는 데만 쓰고, 비교는 순수 (연,월,일) 로 한다.
(`src/lib/game/xp.ts`)

## XP 감쇠를 왜 정수 퍼센트로 계산하나

`1 - 0.1 * 9` 는 `0.1` 이 아니라 `0.09999999999999998` 이다. 그래서 `floor(100 * 그것)` 이 10 이 아니라
**9** 가 되어 유저가 IEEE754 때문에 1 XP 를 손해 본다. 정수 퍼센트(`100 - 10 * days`)로 계산하면
나눗셈 한 번만 남아 오차가 끼어들 자리가 없다.

## 왜 계정 자동 연결(allowDangerousEmailAccountLinking)을 켜지 않나

이름 그대로 위험하다 — OAuth 제공자가 이메일 소유를 검증했다고 가정하는 셈이다. 대신
`OAuthAccountNotLinked` 에러를 `/signin` 에서 안내 문구로 잡는다. (`src/lib/auth-errors.ts`)

## 왜 비밀번호가 users 가 아니라 user_credentials 인가

`users` 는 adapter 소유라 버전업 시 충돌 지점이 되고, Google 로만 가입한 유저에게 영원히 NULL 인 컬럼이
생긴다. 별도 테이블이면 **행의 존재 자체가 "이 유저는 비밀번호 로그인이 가능하다"** 를 뜻해 상태가 명확하다.

## 왜 dev 서버가 3001 인가

포트 3000 은 이 머신의 다른 프로젝트가 쓰고 있었다. Google OAuth 리디렉션 URI 는 정확히 일치해야 해서
포트가 매번 바뀌면 곤란하므로 `-p 3001` 로 고정했다. 3000 이 비면 바꿔도 되지만,
`.env.local` 의 `AUTH_URL` 과 Google 콘솔의 승인된 리디렉션 URI 를 함께 고쳐야 한다.

---

## 2차 확장 지점

전부 `src/lib/services/todo-service.ts` 의 **완료 트랜잭션 한 곳**으로 수렴하도록 설계했다.
아이템 드랍도 업적 판정도 그 트랜잭션 끝에 훅으로 붙는다.

스키마 초안은 `src/db/schema/game.ts` 하단 주석에 있다.

| 기능 | 붙일 자리 |
|---|---|
| 아이템 확률 드랍 | `completeTodo` 트랜잭션 끝. `quests.difficulty` × 등급별 확률 |
| [가방] 메뉴 | `inventory_items` 조회 → 새 라우트 |
| 업적/칭호 | `completeTodo` 끝 + `xp_events` 집계 기반 판정 |
| 드래그앤드롭 배치 | `characters.layout` jsonb |
| 퀘스트 재생성 | `quests.source='fallback'` 인 것 대상. `UNIQUE(todo_id)` 를 떼면 이력 버저닝 |
| 완료 되돌리기 | `xp_events` 에 음수 `amount` 보정 행 추가 |
| 이메일 인증 | `verificationTokens` 테이블이 이미 있다 + 메일 발송 연동 |

## MVP 명시 제외

완료 되돌리기, 퀘스트 재생성, 할 일 수정, 이메일 인증, 아이템, 업적/칭호, 드래그앤드롭 배치.
