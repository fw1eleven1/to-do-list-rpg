import type { Metadata } from 'next';
import Link from 'next/link';

import { legal } from '@/lib/legal';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: `${legal.serviceName} 개인정보처리방침. 수집 항목, 이용 목적, 보관 기간, 제3자 처리 위탁을 안내합니다.`,
  alternates: { canonical: '/privacy' },
};

// 실제 스키마(users·user_credentials·todos·quests·characters)와 제3자 처리(OpenAI·Google·인프라)를
// 근거로 작성한 문서. 수집 항목이 바뀌면 이 화면도 함께 갱신해야 한다.
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
      <header className="border-b border-ink-700 pb-6">
        <p className="font-display text-sm tracking-wide text-gold-600">
          <Link href="/" className="transition hover:text-gold-400">
            {legal.serviceName}
          </Link>
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-wide text-gold-400">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-parchment-500">시행일: {legal.effectiveDate}</p>
      </header>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-parchment-300">
        <section>
          <p>
            {legal.operator}(이하 &ldquo;운영자&rdquo;)는 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 등
            관련 법령을 준수합니다. 본 방침은 {legal.serviceName}(이하 &ldquo;서비스&rdquo;)이 어떤 정보를 어떤 목적으로
            수집·이용하며, 어떻게 보관·파기하는지를 설명합니다.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">1. 수집하는 개인정보 항목</h2>
          <p className="mt-3">서비스는 회원가입과 서비스 제공을 위해 다음 정보를 수집합니다.</p>
          <div className="mt-4 space-y-4 text-parchment-500">
            <div>
              <h3 className="text-parchment-300">가. 회원가입 시</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>이메일 계정 가입: 이메일 주소, 비밀번호(단방향 암호화하여 저장), 닉네임</li>
                <li>
                  Google 계정 연동 가입: Google이 제공하는 이메일 주소, 이름, 프로필 이미지, 계정 식별자 및 인증 토큰
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-parchment-300">나. 서비스 이용 과정에서 생성·수집되는 정보</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>이용자가 입력한 할 일의 제목, 마감일 및 완료/취소 상태</li>
                <li>할 일로부터 생성된 퀘스트 문구, 난이도 및 경험치 내역</li>
                <li>캐릭터 정보(닉네임, 누적 경험치, 시간대)</li>
                <li>서비스 이용 과정에서 자동 생성되는 접속 기록 및 쿠키(로그인 세션 유지 목적)</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">2. 개인정보의 이용 목적</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-parchment-500">
            <li>회원 식별 및 계정 관리, 로그인 세션 유지</li>
            <li>할 일을 퀘스트로 변환하고 경험치·레벨을 산정하는 핵심 기능 제공</li>
            <li>서비스 운영, 부정 이용 방지 및 문의 응대</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">3. 제3자 처리 위탁</h2>
          <p className="mt-3">
            운영자는 안정적인 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 외부에 위탁합니다. 위탁 사업자는
            위탁받은 범위 내에서만 정보를 처리합니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-parchment-500">
              <thead>
                <tr className="border-b border-ink-700 text-parchment-300">
                  <th className="py-2 pr-4 font-medium">수탁 사업자</th>
                  <th className="py-2 pr-4 font-medium">위탁 업무</th>
                  <th className="py-2 font-medium">처리 항목</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                <tr>
                  <td className="py-2 pr-4 align-top text-parchment-300">OpenAI</td>
                  <td className="py-2 pr-4 align-top">할 일 제목의 퀘스트 문구 변환(AI 생성)</td>
                  <td className="py-2 align-top">이용자가 입력한 할 일 제목</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 align-top text-parchment-300">Google</td>
                  <td className="py-2 pr-4 align-top">소셜 로그인 인증(선택)</td>
                  <td className="py-2 align-top">이메일, 이름, 프로필 이미지, 계정 식별자</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 align-top text-parchment-300">Cloudflare</td>
                  <td className="py-2 pr-4 align-top">네트워크 전송 보안 및 콘텐츠 전송(CDN)</td>
                  <td className="py-2 align-top">접속 IP 등 통신 기록</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-parchment-700">
            할 일 제목은 퀘스트 변환을 위해 AI 처리 사업자로 전송됩니다. 민감한 개인정보를 할 일 제목에 포함하지 않도록
            유의하시기 바랍니다.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">4. 개인정보의 보유 및 파기</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-parchment-500">
            <li>
              운영자는 회원 탈퇴 시 이용자의 개인정보 및 이용자 콘텐츠(할 일, 퀘스트, 캐릭터 정보 등)를 지체 없이
              파기합니다.
            </li>
            <li>
              다만 관련 법령에서 일정 기간 보관을 요구하는 경우 해당 기간 동안 분리하여 보관한 후 파기합니다.
            </li>
            <li>전자적 파일 형태의 정보는 복구할 수 없는 방법으로 삭제합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">5. 이용자의 권리</h2>
          <p className="mt-3">
            이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제 및 처리 정지를 요청할 수 있으며, 회원 탈퇴를 통해
            개인정보 수집·이용에 대한 동의를 철회할 수 있습니다. 권리 행사는 아래 문의처를 통해 접수할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">6. 개인정보의 안전성 확보 조치</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-parchment-500">
            <li>비밀번호는 단방향 암호화하여 저장하며, 원문을 보관하지 않습니다.</li>
            <li>서비스 구간은 전송 계층 암호화(HTTPS)를 적용합니다.</li>
            <li>개인정보에 대한 접근 권한을 운영에 필요한 최소한으로 제한합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">7. 개인정보 보호책임자 및 문의</h2>
          <p className="mt-3">
            개인정보 처리에 관한 문의, 불만 처리, 피해 구제 등은 아래 연락처로 접수할 수 있습니다.
            <br />
            개인정보 보호책임자: {legal.operator}
            <br />
            이메일:{' '}
            <a href={`mailto:${legal.contactEmail}`} className="text-gold-400 underline-offset-2 hover:underline">
              {legal.contactEmail}
            </a>
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">8. 방침의 변경</h2>
          <p className="mt-3">
            본 방침의 내용이 변경되는 경우 시행일과 변경 사항을 서비스 화면에 공지합니다. 개정된 방침은 공지한 시행일부터
            효력이 발생합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
