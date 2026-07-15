import { handlers } from '@/lib/auth';

// 이 앱의 유일한 Route Handler. 나머지 변경 작업은 전부 Server Actions.
export const { GET, POST } = handlers;
