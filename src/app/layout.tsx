import type { Metadata } from 'next';
import { Cinzel, Noto_Sans_KR } from 'next/font/google';
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
  title: 'TO-DO LIST RPG',
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
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
