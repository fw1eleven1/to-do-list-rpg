import { redirect } from 'next/navigation';

import { GoogleButton, SignInForm } from '@/components/auth/AuthForms';
import { auth } from '@/lib/auth';
import { signInErrorMessage } from '@/lib/auth-errors';
import { isGoogleEnabled } from '@/lib/env';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) redirect('/');

  // Google 흐름은 리다이렉트라 폼 상태로 에러를 받을 수 없다. 쿼리스트링으로 온다.
  const error = signInErrorMessage((await searchParams).error);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <header className="text-center">
        <h1 className="font-display text-3xl tracking-wide text-gold-400">TO-DO LIST RPG</h1>
        <p className="mt-2 text-sm text-parchment-500">길드에 등록된 모험가만 의뢰를 받을 수 있습니다.</p>
      </header>

      {error && (
        <p className="rounded border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <SignInForm />

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
