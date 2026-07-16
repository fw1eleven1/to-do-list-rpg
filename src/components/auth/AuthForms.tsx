'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { type FormEvent, useState, useTransition } from 'react';

import { signUpAction } from '@/actions/auth';
import { signInErrorMessage } from '@/lib/auth-errors';

const field =
  'w-full rounded border border-ink-600 bg-ink-900/70 px-3 py-2 text-parchment-50 outline-none placeholder:text-parchment-700 focus:border-gold-600';

const primaryButton =
  'w-full rounded border border-gold-600 bg-gold-600/20 px-4 py-2 font-medium text-gold-400 transition hover:bg-gold-600/30 disabled:cursor-not-allowed disabled:opacity-50';

export function GoogleButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => void (await signIn('google', { redirectTo: '/quests' })))}
      className="w-full rounded border border-ink-600 bg-ink-800 px-4 py-2 text-parchment-100 transition hover:bg-ink-700 disabled:opacity-50"
    >
      {pending ? '이동 중…' : 'Google 로 계속하기'}
    </button>
  );
}

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // action={fn} 대신 onSubmit 을 쓴다: React 19 는 form action 이 끝나면 폼을 자동으로 비우는데,
  // 로그인 실패로 문구만 띄우고 머물 때도 초기화가 일어나 입력한 내용이 날아간다. preventDefault 로 막는다.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    start(async () => {
      // redirect:false 라야 실패 시 에러 페이지로 튕기지 않고 폼 위에 문구를 띄울 수 있다.
      const res = await signIn('credentials', {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        redirect: false,
      });

      if (res?.error) {
        setError(signInErrorMessage(res.error) ?? '로그인에 실패했습니다.');
        return;
      }
      router.push('/quests');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="email" type="email" required placeholder="이메일" autoComplete="email" className={field} />
      <input
        name="password"
        type="password"
        required
        placeholder="비밀번호"
        autoComplete="current-password"
        className={field}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? '확인 중…' : '모험 재개'}
      </button>
      <p className="text-center text-sm text-parchment-500">
        아직 모험가가 아니신가요?{' '}
        <Link href="/signup" className="text-gold-400 underline">
          등록하기
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // action={fn} 대신 onSubmit 을 쓴다: React 19 는 form action 이 끝나면 폼을 자동으로 비우는데,
  // 검증 실패로 early-return 해도 초기화가 일어나 입력한 내용이 날아간다. preventDefault 로 그걸 막는다.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const nickname = String(formData.get('nickname') ?? '');
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const passwordConfirm = String(formData.get('passwordConfirm') ?? '');

    // 서버까지 갔다 오지 않고 바로 알려준다. 실제 검증은 액션이 다시 한다.
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    start(async () => {
      const res = await signUpAction({ nickname, email, password, passwordConfirm });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      // 가입 직후 바로 로그인시켜서 "가입했는데 또 로그인" 을 없앤다.
      const signInRes = await signIn('credentials', { email, password, redirect: false });
      if (signInRes?.error) {
        router.push('/signin');
        return;
      }
      router.push('/quests');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        name="nickname"
        required
        minLength={2}
        maxLength={16}
        placeholder="닉네임 (게시판에 표시됩니다)"
        autoComplete="nickname"
        className={field}
      />
      <input name="email" type="email" required placeholder="이메일" autoComplete="email" className={field} />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="비밀번호 (8자 이상)"
        autoComplete="new-password"
        className={field}
      />
      <input
        name="passwordConfirm"
        type="password"
        required
        placeholder="비밀번호 확인"
        autoComplete="new-password"
        className={field}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? '등록 중…' : '모험가 등록'}
      </button>
      <p className="text-center text-sm text-parchment-500">
        이미 등록하셨나요?{' '}
        <Link href="/signin" className="text-gold-400 underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
