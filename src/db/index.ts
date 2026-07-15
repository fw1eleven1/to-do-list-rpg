import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '@/lib/env';
import * as schema from './schema';

// Next dev 의 HMR 은 모듈을 재평가해 Pool 을 계속 새로 만들고 커넥션을 고갈시킨다.
// globalThis 에 캐시해 프로세스당 하나만 유지한다.
const globalForDb = globalThis as unknown as { pool?: Pool };

// SSL 은 연결 문자열에 위임한다 (?sslmode=require).
// 코드에서 ssl 옵션을 분기하면 로컬/클라우드 벤더별로 갈라지므로 여기는 한 줄로 유지.
const pool =
  globalForDb.pool ?? new Pool({ connectionString: env.DATABASE_URL, max: 10 });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}

// casing 은 drizzle.config.ts 와 반드시 같아야 한다.
// 어긋나면 마이그레이션은 snake_case 로 만들어놓고 런타임 쿼리는 camelCase 로 나가서
// "column does not exist" 로 터진다.
export const db = drizzle(pool, { schema, casing: 'snake_case' });
