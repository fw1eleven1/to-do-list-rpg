# TO-DO LIST RPG

할 일을 적으면 AI가 서양 판타지(위쳐/스카이림/발더스 게이트/D&D) 세계관의 퀘스트 의뢰서로 바꿔주고,
완료하면 경험치를 얻어 레벨업하는 앱.

> 설거지하기 → **「마녀의 가마솥 정화」** · 하찮음 · 10 XP
> *오랜 마법의 잔재가 남아있는 가마솥을 정화해야 합니다…*
> — 의뢰인: 주방의 소환사 엘리나

기획은 [overview.md](./overview.md), 설계 결정과 그 이유는 [docs/architecture.md](./docs/architecture.md),
서버 배포는 [docs/deploy.md](./docs/deploy.md).

## 기능 (MVP)

- **할 일 등록** — 할 일 + 마감일. 파기해도 완전 삭제하지 않고 취소선으로 남는다.
- **퀘스트 생성** — 등록 시 AI가 동기 생성. 난이도를 판정하고 서버가 경험치를 산출한다.
- **퀘스트 완료** — 경험치 획득. 마감일을 넘기면 **하루당 10%씩 차감**(최소 1 XP).

아이템·업적·드래그앤드롭 배치는 2차. 스키마와 확장 지점은 남겨뒀다.

## 시작하기

### 1. 환경변수

```bash
cp .env.example .env.local
```

`.env.local` 을 채운다:

| 변수 | 설명 |
|---|---|
| `DATABASE_URL` | 로컬은 아래 docker-compose 기본값 그대로. 프로덕션은 `?sslmode=require` 추가 |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `OPENAI_MODEL` | 기본 `gpt-4o-mini` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | 개발은 `http://localhost:3001` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | **선택**. 비워두면 이메일+비밀번호만 동작하고 Google 버튼이 숨는다 |

Google 로그인을 쓰려면 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 에서
OAuth 클라이언트를 만들고 승인된 리디렉션 URI 에 `http://localhost:3001/api/auth/callback/google` 를 넣는다.

### 2. DB + 앱

```bash
docker compose up -d     # postgres 17
npm install
npm run db:push          # 스키마 반영
npm run dev              # http://localhost:3001
```

> 포트 3001 인 이유는 [docs/architecture.md](./docs/architecture.md#왜-dev-서버가-3001-인가) 참고.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (3001) |
| `npm test` | 게임 로직 단위 테스트 (레벨 곡선, XP 감쇠, 타임존) |
| `npm run test:security` | IDOR · 이중 지급 방어 검증 (**DB 필요**) |
| `npm run test:fallback` | AI 실패/타임아웃 시 폴백 검증 (**API 키 필요, 실제 호출**) |
| `npm run quest:preview` | AI 퀘스트 생성 품질을 눈으로 확인 (**실제 호출**) |
| `npm run db:push` | 스키마를 DB 에 바로 반영 (초기 개발용) |
| `npm run db:generate` | 마이그레이션 SQL 생성 |
| `npm run db:migrate` | 마이그레이션 적용 (프로덕션) |
| `npm run db:studio` | Drizzle Studio |

**마이그레이션 전략**: 스키마를 자주 고치는 동안은 `db:push` 로 빠르게 반복하고, 굳으면
`db:generate` + `db:migrate` 로 전환해 프로덕션은 커밋된 SQL 기반으로 간다.
클라우드 DB 에 `push` 를 쓰면 drizzle-kit 이 컬럼 drop 을 조용히 제안해 데이터 유실 위험이 있다.

## 구조

```
src/
├─ app/            # 라우트. page 는 서버 컴포넌트로 DB 를 직접 조회한다
├─ actions/        # Server Actions — 인증 → Zod 파싱 → 서비스 호출 → revalidate 만 하는 얇은 껍데기
├─ components/     # 기본은 서버 컴포넌트. 'use client' 는 상호작용이 필요한 잎 노드에만
├─ db/
│  ├─ schema/      # auth(어댑터 소유) / todo / game
│  └─ queries/     # 읽기 전용 조회
└─ lib/
   ├─ game/        # 순수 함수만. DB·Next·OpenAI 를 import 하지 않아 단독 테스트 가능
   ├─ ai/          # 퀘스트 생성 + 폴백
   └─ services/    # 유스케이스(트랜잭션). 2차 확장 훅이 여기로 수렴한다
```

## 게임 밸런스

곡선을 바꾸려면 상수 하나씩만 고치면 된다.

- **레벨**: `totalXpForLevel(L) = 50 * (L-1)²` — 튜닝 노브는 `XP_SCALE` 하나 (`src/lib/game/level.ts`)
- **난이도별 XP**: `DIFFICULTY_BASE_XP` (`src/lib/game/difficulty.ts`)
  하찮음 10 · 쉬움 25 · 보통 50 · 어려움 100 · 전설 200
- **감쇠**: `DECAY_PERCENT_PER_DAY` (`src/lib/game/xp.ts`)

`normal`(50 XP) = 레벨 2 도달에 필요한 XP라, **첫 퀘스트 완료가 곧 레벨업**이 되도록 맞춰뒀다.

밸런스를 바꾸면 `npm test` 의 기대값도 함께 고쳐야 한다.
