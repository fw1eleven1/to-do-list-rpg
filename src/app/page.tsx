import type { Metadata } from 'next';
import Link from 'next/link';

import { DIFFICULTIES, DIFFICULTY_BASE_XP, DIFFICULTY_GUIDE, KO_DIFFICULTY } from '@/lib/game/difficulty';

// 랜딩은 인증을 보지 않는다 — auth() 를 부르는 순간 동적 렌더가 되어
// 크롤러가 매번 DB 를 깨우고 정적 캐시가 사라진다. 로그인한 사람이 눌러도
// /signin 이 세션을 보고 /quests 로 넘겨주므로 흐름은 그대로다.
export const metadata: Metadata = {
	// absolute — 루트의 '%s — TO-DO LIST RPG' 템플릿이 붙으면 브랜드가 두 번 나온다.
	title: { absolute: 'To do List를 퀘스트처럼 — TO-DO LIST RPG' },
	description:
		'To do List를 적으면 퀘스트로 바꿔줍니다. 난이도에 따라 경험치를 받고, 완료할수록 레벨이 오르는 무료 할 일 관리 앱.',
	keywords: ['할 일 관리', '투두리스트', '게이미피케이션', 'RPG', '퀘스트', '습관 만들기', 'AI 투두'],
	alternates: { canonical: '/' },
	openGraph: {
		type: 'website',
		url: '/',
		siteName: 'TO-DO LIST RPG',
		title: 'TO-DO LIST RPG',
		description: 'To do List를 적으면 퀘스트로 바꿔줍니다. 완료하고 경험치를 쌓아 레벨을 올리세요.',
	},
};

const FEATURES = [
	{
		title: '할 일을 퀘스트로 바꿉니다',
		body:
			'“분리수거 하기” 를 적으면 판타지 세계의 의뢰서로 다시 쓰여 게시판에 붙습니다. 할 일을 적는 방식은 여느 투두리스트와 똑같습니다 — 바뀌는 건 읽는 재미뿐입니다.',
	},
	{
		title: '난이도만큼 경험치를 줍니다',
		body: '일의 무게를 읽고 난이도를 정합니다. 어려운 일을 끝마치고 더 많은 경험치를 획득하세요.',
	},
	{
		title: '미루면 보상이 줄어듭니다',
		body: '마감일을 넘길 때 마다 경험치가 줄어듭니다. 제 시간에 임무를 완수하세요.',
	},
];

const STEPS = [
	{ n: 1, title: '할 일을 적는다', body: '할 일과 마감일을 입력합니다. 그게 전부입니다.' },
	{ n: 2, title: '의뢰서가 붙는다', body: '할 일이 퀘스트로 변경되어 등록됩니다.' },
	{ n: 3, title: '완수하고 성장한다', body: '완료를 누르면 경험치가 들어오고 레벨이 오릅니다.' },
];

const FAQ = [
	{
		q: '무료인가요?',
		a: '네. 회원가입만 하면 모든 기능을 쓸 수 있습니다.',
	},
	{
		q: '평범한 할 일도 퀘스트가 되나요?',
		a: '됩니다. 5분짜리 잡일부터 몇 주짜리 대장정까지 난이도 다섯 단계로 나뉘어 그에 맞는 경험치를 받습니다.',
	},
	{
		q: '레벨은 어떻게 오르나요?',
		a: `퀘스트를 완료해 얻은 경험치가 쌓이면 오릅니다. 다양한 퀘스트를 완료하여 캐릭터를 성장시키세요.`,
	},
];

// 검색 결과에 리치 스니펫으로 잡히게 하는 구조화 데이터.
// 화면의 문구를 그대로 재사용한다 — 다르게 쓰면 클로킹으로 간주될 수 있다.
const jsonLd = {
	'@context': 'https://schema.org',
	'@graph': [
		{
			'@type': 'WebApplication',
			name: 'TO-DO LIST RPG',
			applicationCategory: 'ProductivityApplication',
			operatingSystem: 'Web',
			description: metadata.description,
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
		},
		{
			'@type': 'FAQPage',
			mainEntity: FAQ.map((f) => ({
				'@type': 'Question',
				name: f.q,
				acceptedAnswer: { '@type': 'Answer', text: f.a },
			})),
		},
	],
};

const ctaPrimary =
	'rounded border border-gold-600 bg-gold-600/20 px-5 py-2.5 font-medium text-gold-400 transition hover:bg-gold-600/30';

export default function LandingPage() {
	return (
		<>
			<script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

			<header className='mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-5'>
				<span className='font-display text-lg tracking-wide text-gold-400'>TO-DO LIST RPG</span>
				<nav className='flex items-center gap-4 text-sm'>
					<Link href='/signin' className='text-parchment-500 transition hover:text-parchment-300'>
						로그인
					</Link>
					<Link
						href='/signup'
						className='rounded border border-ink-600 px-3 py-1.5 text-parchment-100 transition hover:bg-ink-800'>
						시작하기
					</Link>
				</nav>
			</header>

			<main className='mx-auto w-full max-w-4xl flex-1 px-5'>
				<section className='py-16 text-center sm:py-24'>
					<h1 className='font-display text-4xl leading-tight tracking-wide text-gold-400 sm:text-5xl'>할 일을 퀘스트로.</h1>
					<p className='mx-auto mt-5 max-w-xl text-lg text-parchment-300'>
						적어둔 할 일이 판타지 세계의 의뢰서가 됩니다. 완수하면 경험치가 들어오고, 쌓인 경험치만큼 레벨이 오릅니다.
					</p>
					<div className='mt-8 flex items-center justify-center gap-3'>
						<Link href='/signup' className={ctaPrimary}>
							모험가 등록
						</Link>
						<Link
							href='/signin'
							className='rounded border border-ink-600 px-5 py-2.5 text-parchment-100 transition hover:bg-ink-800'>
							모험 재개
						</Link>
					</div>
				</section>

				<section className='border-t border-ink-700 py-14'>
					<h2 className='font-display text-2xl tracking-wide text-parchment-100'>핵심 기능</h2>
					<div className='mt-6 grid gap-4 sm:grid-cols-3'>
						{FEATURES.map((f) => (
							<article key={f.title} className='rounded border border-ink-700 bg-ink-900/50 p-5'>
								<h3 className='font-medium text-gold-400'>{f.title}</h3>
								<p className='mt-2 text-sm leading-relaxed text-parchment-300'>{f.body}</p>
							</article>
						))}
					</div>
				</section>

				<section className='border-t border-ink-700 py-14'>
					<h2 className='font-display text-2xl tracking-wide text-parchment-100'>난이도와 보상</h2>
					<p className='mt-2 text-sm text-parchment-500'>색은 MMO 의 희귀도 관례를 그대로 씁니다 — 따로 외울 게 없도록.</p>
					{/* 표는 game/difficulty.ts 에서 직접 읽는다. 리밸런싱해도 이 화면이 같이 따라온다. */}
					<dl className='mt-6 divide-y divide-ink-800 rounded border border-ink-700'>
						{DIFFICULTIES.map((d) => (
							<div key={d} className='flex items-baseline gap-4 px-5 py-3'>
								<dt className='w-16 shrink-0 text-sm font-medium' style={{ color: `var(--color-tier-${d})` }}>
									{KO_DIFFICULTY[d]}
								</dt>
								<dd className='flex-1 text-sm text-parchment-500'>{DIFFICULTY_GUIDE[d]}</dd>
								<dd className='shrink-0 text-sm tabular-nums text-parchment-300'>{DIFFICULTY_BASE_XP[d]} XP</dd>
							</div>
						))}
					</dl>
				</section>

				<section className='border-t border-ink-700 py-14'>
					<h2 className='font-display text-2xl tracking-wide text-parchment-100'>작동 방식</h2>
					<ol className='mt-6 grid gap-4 sm:grid-cols-3'>
						{STEPS.map((s) => (
							<li key={s.n} className='rounded border border-ink-700 bg-ink-900/50 p-5'>
								<span className='font-display text-3xl text-gold-600'>{s.n}</span>
								<h3 className='mt-2 font-medium text-parchment-100'>{s.title}</h3>
								<p className='mt-1 text-sm leading-relaxed text-parchment-500'>{s.body}</p>
							</li>
						))}
					</ol>
				</section>

				<section className='border-t border-ink-700 py-14'>
					<h2 className='font-display text-2xl tracking-wide text-parchment-100'>자주 묻는 질문</h2>
					<dl className='mt-6 space-y-5'>
						{FAQ.map((f) => (
							<div key={f.q}>
								<dt className='font-medium text-parchment-100'>{f.q}</dt>
								<dd className='mt-1 text-sm leading-relaxed text-parchment-500'>{f.a}</dd>
							</div>
						))}
					</dl>
				</section>

				<section className='border-t border-ink-700 py-16 text-center'>
					<h2 className='font-display text-2xl tracking-wide text-gold-400'>첫 의뢰서를 붙일 시간입니다.</h2>
					<p className='mt-3 text-sm text-parchment-500'>다양한 퀘스트를 완료하고 캐릭터를 성장시키세요.</p>
					<Link href='/signup' className={`${ctaPrimary} mt-6 inline-block`}>
						모험가 등록
					</Link>
				</section>
			</main>
		</>
	);
}
