import { redirect } from 'next/navigation';

import { GoogleButton, SignUpForm } from '@/components/auth/AuthForms';
import { auth } from '@/lib/auth';
import { isGoogleEnabled } from '@/lib/env';

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/');

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <header className="text-center">
        <h1 className="font-display text-3xl tracking-wide text-gold-400">모험가 등록</h1>
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
