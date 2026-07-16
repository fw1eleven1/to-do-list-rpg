import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { GoogleButton, SignUpForm } from '@/components/auth/AuthForms';
import { auth } from '@/lib/auth';
import { isGoogleEnabled } from '@/lib/env';

// /signin 과 같은 이유로 noindex — 서비스 설명은 랜딩(/)에만 둔다.
export const metadata: Metadata = {
  title: '모험가 등록',
  description: 'TO-DO Quest 계정을 만들고 첫 퀘스트를 받습니다.',
  robots: { index: false, follow: true },
};

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/quests');

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <header className="text-center">
        <Link href="/" className="font-display text-sm tracking-wide text-parchment-700 transition hover:text-parchment-500">
          TO-DO Quest
        </Link>
        <h1 className="mt-1 font-display text-3xl tracking-wide text-gold-400">모험가 등록</h1>
        <p className="mt-2 text-sm text-parchment-500">이름을 올리면 첫 의뢰를 받을 수 있습니다.</p>
      </header>

      <SignUpForm />

      {isGoogleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-parchment-700">
            <span className="h-px flex-1 bg-ink-600" />
            또는
            <span className="h-px flex-1 bg-ink-600" />
          </div>
          <GoogleButton />
        </>
      )}
    </main>
  );
}
