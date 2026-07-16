import Link from 'next/link';

import { legal } from '@/lib/legal';

// 전역 푸터 — 루트 레이아웃에서 모든 페이지 하단에 붙는다.
// 법적 고지 링크(이용약관·개인정보처리방침)를 어느 화면에서든 닿을 수 있게 두는 것이 목적이다.
export function Footer() {
  return (
    <footer className="border-t border-ink-800 px-5 py-6 text-center text-xs text-parchment-700">
      <nav className="flex items-center justify-center gap-3">
        <Link href="/terms" className="transition hover:text-parchment-500">
          이용약관
        </Link>
        <span aria-hidden className="text-ink-700">
          ·
        </span>
        <Link href="/privacy" className="transition hover:text-parchment-500">
          개인정보처리방침
        </Link>
      </nav>
      <p className="mt-3">{legal.serviceName}</p>
    </footer>
  );
}
