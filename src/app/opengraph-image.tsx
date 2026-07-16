import { ImageResponse } from 'next/og';

// SNS 공유 미리보기 이미지를 코드로 그린다 — 브랜드명이 여기 문자열로 있으므로
// 이름이 바뀌어도 이미지가 따라온다(예전엔 이름이 박힌 PNG 라 손으로 다시 만들어야 했다).
export const runtime = 'nodejs';
export const alt = 'TO-DO Quest — 할 일을 퀘스트로 바꿔 경험치를 쌓는 할 일 관리 앱';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BRAND = 'TO-DO Quest';
const TAGLINE = '할 일을 퀘스트로.';
const SUB = '완수하면 경험치가 들어오고, 쌓인 만큼 레벨이 오릅니다.';

// 사이트 팔레트(globals.css) 와 동일한 값.
const INK_950 = '#0c0a08';
const INK_800 = '#1f1a14';
const INK_600 = '#423728';
const PARCHMENT_100 = '#eadfc8';
const PARCHMENT_500 = '#9c8964';
const GOLD_400 = '#d4af37';
const GOLD_600 = '#9a7d1e';

// 두루마리 아이콘(icon.svg 와 같은 형태)을 data URI 로 심는다.
const scroll = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='96' height='96'>
  <rect x='8.5' y='5' width='15' height='22' fill='#f7f0e1'/>
  <g fill='#6b5c3f'>
    <rect x='11' y='11.5' width='10' height='1.6' rx='0.8'/>
    <rect x='11' y='15.2' width='10' height='1.6' rx='0.8'/>
    <rect x='11' y='18.9' width='6' height='1.6' rx='0.8'/>
  </g>
  <g fill='#c9b892' stroke='#9a7d1e' stroke-width='0.8'>
    <rect x='6' y='3.5' width='20' height='4.5' rx='2.25'/>
    <rect x='6' y='24' width='20' height='4.5' rx='2.25'/>
  </g>
</svg>`;
const scrollDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(scroll)}`;

// Google Fonts 에서 필요한 글자만 잘라(subset) 받아온다 — 한글 전체 폰트(수 MB)를 피한다.
// User-Agent 를 비워 보내면 Google 이 satori 가 읽을 수 있는 ttf 를 내려준다(woff2 는 satori 미지원).
async function loadFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family,
    )}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);
    if (!src) return null;
    return await (await fetch(src[1])).arrayBuffer();
  } catch {
    // 빌드 환경이 오프라인이어도 이미지 생성은 죽지 않게 한다(라틴은 폴백 세리프로 렌더).
    return null;
  }
}

export default async function OpengraphImage() {
  const [cinzel, notoBold, notoRegular] = await Promise.all([
    loadFont('Cinzel', 700, BRAND),
    loadFont('Noto Sans KR', 700, TAGLINE),
    loadFont('Noto Sans KR', 400, SUB),
  ]);

  const fonts = [
    cinzel && { name: 'Cinzel', data: cinzel, weight: 700 as const, style: 'normal' as const },
    notoBold && { name: 'Noto Sans KR', data: notoBold, weight: 700 as const, style: 'normal' as const },
    notoRegular && { name: 'Noto Sans KR', data: notoRegular, weight: 400 as const, style: 'normal' as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: INK_950,
          backgroundImage: `radial-gradient(ellipse at top, ${INK_800}, ${INK_950} 70%)`,
        }}
      >
        {/* 퀘스트 게시판 느낌의 얇은 금색 액자 */}
        <div
          style={{
            position: 'absolute',
            top: 32,
            left: 32,
            right: 32,
            bottom: 32,
            border: `2px solid ${INK_600}`,
            borderRadius: 24,
            display: 'flex',
          }}
        />

        <img src={scrollDataUri} width={96} height={96} alt="" />

        <div
          style={{
            marginTop: 28,
            fontFamily: 'Cinzel, serif',
            fontWeight: 700,
            fontSize: 110,
            letterSpacing: 2,
            color: GOLD_400,
            display: 'flex',
          }}
        >
          {BRAND}
        </div>

        <div
          style={{
            marginTop: 20,
            fontFamily: 'Noto Sans KR, sans-serif',
            fontWeight: 700,
            fontSize: 46,
            color: PARCHMENT_100,
            display: 'flex',
          }}
        >
          {TAGLINE}
        </div>

        <div
          style={{
            marginTop: 14,
            fontFamily: 'Noto Sans KR, sans-serif',
            fontWeight: 400,
            fontSize: 28,
            color: PARCHMENT_500,
            display: 'flex',
          }}
        >
          {SUB}
        </div>

        {/* 하단 도메인 라벨 */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            fontFamily: 'Cinzel, serif',
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: 3,
            color: GOLD_600,
            display: 'flex',
          }}
        >
          rpg.pjsk.kr
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
