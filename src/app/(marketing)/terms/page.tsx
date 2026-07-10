import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 — Linkbrain',
  description: 'Linkbrain 서비스 이용약관입니다. 서비스 이용 조건, 유료 플랜, 환불 규정, 책임 제한 등을 안내합니다.',
  openGraph: {
    title: '이용약관 — Linkbrain',
    description: 'Linkbrain 서비스 이용약관입니다.',
    url: 'https://linkbrain.cloud/terms',
  },
  alternates: { canonical: 'https://linkbrain.cloud/terms' },
};

interface Section {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

const SECTIONS: Section[] = [
  {
    title: '제1조 (목적)',
    paragraphs: [
      '이 약관은 Linkbrain(linkbrain.cloud, 이하 "서비스")이 제공하는 링크 클리핑, AI 요약, 컬렉션 관리 및 관련 제반 서비스의 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.',
    ],
  },
  {
    title: '제2조 (서비스의 정의)',
    paragraphs: ['서비스는 다음 기능을 제공합니다.'],
    items: [
      '링크 클리핑: 웹 페이지, 소셜 미디어 게시물 등 URL 기반 콘텐츠의 저장 및 보관',
      'AI 요약: 저장한 콘텐츠에 대한 인공지능 기반 요약, 태깅, 분류',
      '컬렉션: 저장한 클립의 정리, 분류, 공유 기능',
      '기타 서비스가 추가로 개발하거나 제휴를 통해 제공하는 일체의 기능',
    ],
  },
  {
    title: '제3조 (계정 및 이용자의 의무)',
    items: [
      '이용자는 가입 시 정확한 정보를 제공해야 하며, 계정 정보(이메일, 비밀번호 등)를 안전하게 관리할 책임이 있습니다.',
      '계정은 본인만 사용할 수 있으며, 제3자에게 양도하거나 대여할 수 없습니다.',
      '계정의 부정 사용이 확인되거나 의심되는 경우 즉시 서비스에 알려야 합니다.',
      '만 14세 미만은 서비스에 가입할 수 없습니다.',
    ],
  },
  {
    title: '제4조 (유료 플랜 및 결제)',
    items: [
      '서비스는 무료 플랜과 유료 플랜(Pro)을 제공하며, 유료 플랜의 가격과 제공 기능은 요금제 페이지에 명시됩니다.',
      '결제는 결제 대행사 LemonSqueezy를 통해 처리되며, 구독은 별도 해지 전까지 자동 갱신됩니다.',
      '환불: 결제 후 7일 이내이며 유료 기능을 사용하지 않은 경우 전액 환불을 요청할 수 있습니다. 그 외의 경우 관련 법령에 따릅니다.',
      '구독 해지 시 이미 결제된 이용 기간이 끝날 때까지 유료 기능을 사용할 수 있습니다.',
    ],
  },
  {
    title: '제5조 (금지 행위)',
    paragraphs: ['이용자는 다음 행위를 해서는 안 됩니다.'],
    items: [
      '자동화 도구 등을 이용한 비정상적 대량 수집(스크래핑 남용) 등 서비스 인프라에 부담을 주는 행위',
      '서비스 또는 서비스가 생성한 결과물을 무단으로 재판매하거나 상업적으로 재배포하는 행위',
      '타인의 계정 도용, 서비스의 취약점 악용, 법령 또는 공서양속에 반하는 콘텐츠의 저장·공유',
      '서비스의 정상적인 운영을 방해하는 일체의 행위',
    ],
  },
  {
    title: '제6조 (AI 생성물에 대한 고지)',
    paragraphs: [
      '서비스의 AI 요약, 태깅, 분류 등은 인공지능 모델에 의해 자동 생성되며, 원문과 다르거나 부정확한 내용을 포함할 수 있습니다. 이용자는 AI 생성물을 참고 자료로 활용해야 하며, 중요한 판단의 근거로 사용하기 전에 원문을 확인해야 합니다. 서비스는 AI 생성물의 정확성, 완전성을 보증하지 않습니다.',
    ],
  },
  {
    title: '제7조 (서비스의 변경 및 중단)',
    items: [
      '서비스는 운영상·기술상 필요에 따라 제공하는 기능의 전부 또는 일부를 변경할 수 있습니다.',
      '서비스를 중단하는 경우 사전에 공지하며, 유료 이용자에게는 잔여 기간에 대해 합리적인 보상(환불 등)을 제공합니다.',
      '천재지변, 시스템 장애 등 불가피한 사유로 인한 일시적 중단이 발생할 수 있습니다.',
    ],
  },
  {
    title: '제8조 (책임 제한)',
    items: [
      '서비스는 이용자가 저장한 콘텐츠의 내용에 대해 책임을 지지 않으며, 해당 콘텐츠에 관한 법적 책임은 이를 저장·공유한 이용자에게 있습니다.',
      '서비스는 무료로 제공되는 기능과 관련하여 관련 법령에 특별한 규정이 없는 한 책임을 지지 않습니다.',
      '서비스의 배상 책임은 관련 법령이 허용하는 범위 내에서 이용자가 최근 12개월간 서비스에 지급한 금액을 한도로 합니다.',
    ],
  },
  {
    title: '제9조 (준거법 및 관할)',
    paragraphs: [
      '이 약관은 대한민국 법률에 따라 해석되고 적용됩니다. 서비스와 이용자 간 발생한 분쟁은 민사소송법상의 관할 법원에 제소합니다.',
    ],
  },
  {
    title: '부칙',
    paragraphs: [
      '이 약관은 2026년 7월 10일부터 시행됩니다.',
      '약관에 관한 문의: beyondworks.br@gmail.com',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 md:px-6">
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          이용약관
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          시행일: 2026년 7월 10일 · Linkbrain (linkbrain.cloud)
        </p>
      </header>

      <div className="space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {section.title}
            </h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="mb-3 text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
            {section.items && (
              <ul className="list-disc space-y-2 pl-5">
                {section.items.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
