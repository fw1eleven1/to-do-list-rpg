import { defineConfig } from 'drizzle-kit';

// drizzle-kit 은 Next 밖에서 도는 CLI 라 .env.local 을 자동으로 읽지 않는다.
// src/lib/env.ts 는 'server-only' 라 여기서 import 할 수 없으므로 직접 로드한다.
process.loadEnvFile('.env.local');

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL 이 없습니다. .env.local 을 확인하세요.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
