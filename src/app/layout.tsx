import type { Metadata } from 'next';
import { Cinzel, Noto_Sans_KR } from 'next/font/google';

import { Footer } from '@/components/layout/Footer';
import { siteUrl } from '@/lib/env';
import './globals.css';

// 제목용 세리프. 라틴 전용이라 한글 제목은 아래 sans 로 떨어진다 — 의도된 폴백.
const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  weight: ['400', '700'],
});

const notoKr = Noto_Sans_KR({
  variable: '--font-noto-kr',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  // canonical 과 OG 의 상대 경로를 절대 URL 로 펴는 기준. 없으면 Next 가 localhost 로 채운다.
  metadataBase: siteUrl,
  title: {
    default: 'TO-DO Quest',
    // 하위 페이지는 자기 제목만 쓰고 브랜드는 여기서 붙인다.
    template: '%s — TO-DO Quest',
  },
  description: '할 일을 퀘스트로. 완료하고 경험치를 쌓아 레벨을 올리세요.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${cinzel.variable} ${notoKr.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Footer />
      </body>
    </html>
  );
}
