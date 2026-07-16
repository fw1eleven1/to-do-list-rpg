import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/env';

// 공개된, 색인할 가치가 있는 페이지만 싣는다.
// /signin·/signup 은 로그인 폼일 뿐이고 noindex 이므로 여기 없는 게 맞다.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL('/', siteUrl).toString(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
