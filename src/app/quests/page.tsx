import type { Metadata } from 'next';
import Link from 'next/link';

import { ChangePasswordButton } from '@/components/auth/ChangePasswordButton';
import { CharacterStatusBar } from '@/components/character/CharacterStatusBar';
import { FeedbackProvider } from '@/components/feedback/FeedbackProvider';
import { DEFAULT_TAB, QuestBoard, isBoardTab } from '@/components/quest/QuestBoard';
import { QuestComposer } from '@/components/quest/QuestComposer';
import { hasPasswordCredential } from '@/db/queries/auth';
import { listQuests } from '@/db/queries/todos';
import { signOut } from '@/lib/auth';
import { requireUser } from '@/lib/guard';
import { getProfile } from '@/lib/services/character-service';

// 로그인이 필요한 앱 화면. SEO 대상이 아니므로 색인에서 뺀다 —
// 크롤러에게는 어차피 /signin 리다이렉트만 보이지만, 명시해두면 색인 낭비가 없다.
export const metadata: Metadata = {
	title: '퀘스트 게시판',
	robots: { index: false, follow: false },
};

// 서버 컴포넌트 — DB 를 직접 조회한다. 클라이언트 번들에 게임 로직/DB 접근이 실려나가지 않는다.
// 갱신은 액션의 revalidatePath('/quests') 가 담당한다.
export default async function QuestsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
	const user = await requireUser();
	const [profile, items, canChangePassword, { tab }] = await Promise.all([
		getProfile(user.id),
		listQuests(user.id),
		hasPasswordCredential(user.id),
		searchParams,
	]);

	// 탭 목록은 QuestBoard 가 소유한다 — 여기서 키를 다시 나열하면 탭을 늘릴 때 어긋난다.
	const activeTab = isBoardTab(tab) ? tab : DEFAULT_TAB;

	return (
		<main className='mx-auto w-full max-w-2xl flex-1 space-y-5 px-5 py-8'>
			<header className='flex items-center justify-between'>
				<h1 className='font-display text-xl tracking-wide text-gold-400'>
					<Link href='/quests'>TO-DO LIST RPG</Link>
				</h1>
				<div className='flex items-center gap-3'>
					{canChangePassword && <ChangePasswordButton />}
					<form
						className='flex'
						action={async () => {
							'use server';
							await signOut({ redirectTo: '/signin' });
						}}>
						<button className='text-xs leading-none text-parchment-500 transition hover:text-parchment-300'>
							로그아웃
						</button>
					</form>
				</div>
			</header>

			{/* 닉네임은 세션(JWT)이 아니라 DB 에서 온다 — 수정 직후에도 화면이 바로 맞는다.
          이메일(로그인 아이디)로 폴백하지 않는다: 화면에 아이디가 노출되면 안 된다. */}
			<CharacterStatusBar nickname={profile.nickname} totalXp={profile.totalXp} />

			<QuestComposer />

			{/* 토스트는 퀘스트 목록 바깥에 둔다 — 카드 안에 있으면 완료 직후 언마운트돼서 사라진다.
          QuestBoard 는 서버 컴포넌트인 채로 children 으로 전달된다. */}
			<FeedbackProvider>
				<QuestBoard items={items} tab={activeTab} />
			</FeedbackProvider>
		</main>
	);
}
