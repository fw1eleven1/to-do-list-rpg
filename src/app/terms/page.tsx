import type { Metadata } from 'next';
import Link from 'next/link';

import { legal } from '@/lib/legal';

export const metadata: Metadata = {
  title: '이용약관',
  description: `${legal.serviceName} 서비스 이용약관.`,
  alternates: { canonical: '/terms' },
};

// 정적 법률 문서 — 인증을 보지 않는다. 문안은 legal.ts 의 값(운영자·시행일)을 끌어와
// 개인정보처리방침과 어긋나지 않게 한다.
export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
      <header className="border-b border-ink-700 pb-6">
        <p className="font-display text-sm tracking-wide text-gold-600">
          <Link href="/" className="transition hover:text-gold-400">
            {legal.serviceName}
          </Link>
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-wide text-gold-400">이용약관</h1>
        <p className="mt-2 text-sm text-parchment-500">시행일: {legal.effectiveDate}</p>
      </header>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-parchment-300">
        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">제1조 (목적)</h2>
          <p className="mt-3">
            본 약관은 {legal.operator}(이하 &ldquo;운영자&rdquo;)가 제공하는 {legal.serviceName}(이하
            &ldquo;서비스&rdquo;)의 이용과 관련하여 운영자와 이용자 간의 권리, 의무 및 책임사항을 규정하는 것을
            목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">제2조 (용어의 정의)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-parchment-500">
            <li>
              <span className="text-parchment-300">&ldquo;서비스&rdquo;</span>란 이용자가 입력한 할 일을 퀘스트
              형태로 변환하고, 완료에 따라 경험치와 레벨을 부여하는 웹 기반 할 일 관리 서비스를 말합니다.
            </li>
            <li>
              <span className="text-parchment-300">&ldquo;이용자&rdquo;</span>란 본 약관에 동의하고 서비스에 가입하여
              이를 이용하는 회원을 말합니다.
            </li>
            <li>
              <span className="text-parchment-300">&ldquo;계정&rdquo;</span>이란 이용자를 식별하기 위해 이메일 또는
              외부 계정(Google) 연동으로 생성된 자격을 말합니다.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">제3조 (약관의 효력 및 변경)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-parchment-500">
            <li>본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
            <li>
              운영자는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 시행일과 변경 내용을
              서비스 화면에 사전 공지합니다.
            </li>
            <li>
              이용자가 개정 약관의 적용에 동의하지 않는 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">제4조 (회원가입 및 계정)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-parchment-500">
            <li>이용자는 이메일과 비밀번호를 등록하거나 Google 계정을 연동하여 회원가입을 할 수 있습니다.</li>
            <li>이용자는 하나의 계정에 대한 관리 책임을 지며, 비밀번호를 타인에게 제공하여서는 안 됩니다.</li>
            <li>계정의 도용이나 부정 사용을 인지한 경우 즉시 운영자에게 통지하여야 합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">제5조 (서비스의 제공)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-parchment-500">
            <li>
              운영자는 이용자가 입력한 할 일의 제목을 인공지능(AI)을 통해 퀘스트 형태의 문구로 변환하여 제공합니다. 이
              과정에서 할 일 제목은 제3자 AI 처리 사업자에게 전송될 수 있으며, 자세한 내용은{' '}
              <Link href="/privacy" className="text-gold-400 underline-offset-2 hover:underline">
                개인정보처리방침
              </Link>
              에 따릅니다.
            </li>
            <li>서비스는 무료로 제공되며, 회원가입만으로 모든 기능을 이용할 수 있습니다.</li>
            <li>
              운영자는 서비스의 내용, 난이도별 경험치 정책 등을 운영상 또는 기술상 필요에 따라 변경할 수 있습니다.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">제6조 (서비스의 중단)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-parchment-500">
            <li>
              운영자는 시스템 점검, 설비의 보수·교체, 통신 두절 등 부득이한 사유가 발생한 경우 서비스의 전부 또는
              일부를 일시적으로 중단할 수 있습니다.
            </li>
            <li>
              본 서비스는 개인이 운영하는 서비스로서, 천재지변·정전·설비 장애 등 운영자의 통제를 벗어난 사유로 인한
              서비스 중단에 대해 운영자는 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">제7조 (이용자의 의무)</h2>
          <p className="mt-3">이용자는 다음 각 호의 행위를 하여서는 안 됩니다.</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-parchment-500">
            <li>타인의 계정, 이메일 등 개인정보를 도용하는 행위</li>
            <li>서비스의 정상적인 운영을 방해하거나 시스템에 부하를 유발하는 행위</li>
            <li>서비스를 역이용하여 법령 또는 공서양속에 위반되는 정보를 저장·유포하는 행위</li>
            <li>운영자의 사전 동의 없이 서비스를 상업적 목적으로 이용하는 행위</li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">제8조 (콘텐츠의 귀속)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-parchment-500">
            <li>이용자가 입력한 할 일 등 이용자 콘텐츠의 권리는 이용자에게 있습니다.</li>
            <li>
              운영자는 서비스 제공 및 개선을 위한 목적 범위 내에서만 이용자 콘텐츠를 이용하며, 회원 탈퇴 시 관련 법령에
              따라 보관이 요구되는 경우를 제외하고 이를 삭제합니다.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">제9조 (회원 탈퇴 및 이용 제한)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-parchment-500">
            <li>이용자는 언제든지 회원 탈퇴를 요청할 수 있으며, 운영자는 지체 없이 이를 처리합니다.</li>
            <li>
              이용자가 본 약관을 위반한 경우 운영자는 사전 통지 후 서비스 이용을 제한하거나 계정을 정지·삭제할 수
              있습니다.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">제10조 (책임의 제한)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-parchment-500">
            <li>본 서비스는 &ldquo;있는 그대로&rdquo; 제공되며, 특정 목적에의 적합성을 보증하지 않습니다.</li>
            <li>
              AI가 생성한 퀘스트 문구는 참고용이며, 그 정확성이나 표현에 대해 운영자는 법적 책임을 지지 않습니다.
            </li>
            <li>
              운영자는 무료로 제공되는 서비스와 관련하여 관련 법령에 특별한 규정이 없는 한 이용자에게 발생한 손해에
              대하여 책임을 지지 않습니다.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">제11조 (준거법 및 관할)</h2>
          <p className="mt-3">
            본 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련하여 분쟁이 발생한 경우 관할은 민사소송법에 따른
            법원으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg tracking-wide text-parchment-100">문의</h2>
          <p className="mt-3">
            서비스 이용에 관한 문의는 아래 연락처로 접수할 수 있습니다.
            <br />
            이메일:{' '}
            <a href={`mailto:${legal.contactEmail}`} className="text-gold-400 underline-offset-2 hover:underline">
              {legal.contactEmail}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
