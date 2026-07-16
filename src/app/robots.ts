import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /quests 는 로그인 벽 뒤라 크롤러에겐 리다이렉트만 보이고,
      // /api 는 색인 대상이 아니다. 크롤링 예산을 랜딩에 몰아준다.
      disallow: ['/quests', '/api/'],
    },
    sitemap: new URL('/sitemap.xml', siteUrl).toString(),
  };
}
