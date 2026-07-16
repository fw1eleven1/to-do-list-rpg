import { existsSync } from 'node:fs';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

// tsx 로 Next 밖에서 도는 스크립트라 src/lib/env.ts('server-only')를 쓸 수 없다.
//
// top-level await 을 쓰지 않는 이유: package.json 에 "type":"module" 이 없어서 tsx 가 이 .ts 를
// CJS 로 트랜스파일하고, 그러면 "Top-level await is currently not supported" 로 죽는다.
// main() 으로 감싸면 확장자나 모듈 방식에 관계없이 돈다.
async function main() {
  // 개발에서는 .env.local 을 읽지만, 프로덕션 서버에는 그 파일이 없고 환경변수가 이미 주입돼 있다
  // (deploy.sh 가 .env 를 source 해서 넣어준다). 무조건 loadEnvFile 을 부르면 서버에서 ENOENT 로 죽는다.
  if (!process.env.DATABASE_URL && existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL 이 없습니다. 개발이면 .env.local 을, 서버면 환경변수 주입을 확인하세요.',
    );
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool, { casing: 'snake_case' }), {
      migrationsFolder: './drizzle',
    });
    console.log('마이그레이션 완료');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('마이그레이션 실패:', e instanceof Error ? e.message : e);
  // 배포 스크립트가 set -e 로 멈출 수 있게 반드시 0 이 아닌 코드로 죽는다.
  process.exit(1);
});
