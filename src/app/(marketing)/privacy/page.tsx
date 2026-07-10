import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 — Linkbrain',
  description: 'Linkbrain 개인정보처리방침입니다. 수집 항목, 처리 위탁, 보유 기간, 이용자 권리 등을 안내합니다.',
  openGraph: {
    title: '개인정보처리방침 — Linkbrain',
    description: 'Linkbrain 개인정보처리방침입니다.',
    url: 'https://linkbrain.cloud/privacy',
  },
  alternates: { canonical: 'https://linkbrain.cloud/privacy' },
};

interface Section {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

const SECTIONS: Section[] = [
  {
    title: '1. 총칙',
    paragraphs: [
      'Linkbrain(linkbrain.cloud, 이하 "서비스")은 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 안전하게 보호하기 위해 이 개인정보처리방침을 수립·공개합니다.',
    ],
  },
  {
    title: '2. 수집하는 개인정보 항목',
    items: [
      '계정 정보: 이메일 주소, OAuth 로그인 시 제공되는 프로필 정보(이름, 프로필 이미지)',
      '서비스 이용 정보: 이용자가 저장한 URL, 클립 콘텐츠, 컬렉션, 태그 및 서비스 이용 기록',
      '결제 정보: 결제는 결제 대행사 LemonSqueezy가 직접 처리하며, 서비스는 카드 번호 등 결제 수단 정보를 저장하지 않습니다. 구독 상태와 결제 이력 식별자만 보관합니다.',
    ],
  },
  {
    title: '3. 개인정보의 처리 목적',
    items: [
      '회원 식별, 가입 및 서비스 제공',
      '저장한 콘텐츠의 AI 요약·태깅·분류 등 핵심 기능 제공',
      '유료 플랜 결제 및 구독 관리',
      '서비스 개선, 부정 이용 방지, 법령상 의무 이행',
    ],
  },
  {
    title: '4. 처리 위탁 및 국외 이전',
    paragraphs: [
      '서비스는 안정적인 제공을 위해 아래 업체에 개인정보 처리를 위탁하며, 일부는 국외에서 처리됩니다.',
    ],
    items: [
      'Supabase / AWS (일본 도쿄, ap-northeast-1): 데이터베이스, 인증, 파일 저장',
      'OpenAI (미국): AI 요약 생성 시 클립 텍스트 전송',
      'LemonSqueezy (미국): 결제 처리',
      'Upstash (미국): 캐시 및 속도 제한 처리',
      'Vercel (미국): 웹 호스팅 및 배포',
    ],
  },
  {
    title: '5. 개인정보의 보유 및 파기',
    items: [
      '개인정보는 회원 탈퇴 시 즉시 삭제됩니다. 저장한 클립, 컬렉션 등 서비스 이용 데이터도 함께 삭제됩니다.',
      '관련 법령(전자상거래법 등)에 따라 보존 의무가 있는 결제·거래 기록은 해당 법령이 정한 기간 동안 분리 보관 후 파기합니다.',
    ],
  },
  {
    title: '6. 이용자의 권리',
    items: [
      '이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제, 처리 정지를 요구할 수 있습니다.',
      '계정 삭제는 서비스 내 설정 페이지에서 직접 할 수 있으며, 삭제 즉시 모든 데이터가 파기됩니다.',
      '기타 권리 행사는 아래 개인정보 보호책임자 이메일로 요청할 수 있습니다.',
    ],
  },
  {
    title: '7. 쿠키 및 세션',
    paragraphs: [
      '서비스는 로그인 상태 유지를 위해 필수적인 세션 쿠키를 사용합니다. 해당 쿠키는 인증 목적으로만 사용되며, 브라우저 설정에서 쿠키를 차단할 경우 로그인이 필요한 기능을 이용할 수 없습니다.',
    ],
  },
  {
    title: '8. 아동의 개인정보',
    paragraphs: [
      '서비스는 만 14세 미만 아동의 가입을 허용하지 않으며, 만 14세 미만 아동의 개인정보를 수집하지 않습니다. 만 14세 미만 아동의 개인정보가 수집된 사실이 확인되면 지체 없이 삭제합니다.',
    ],
  },
  {
    title: '9. 개인정보의 안전성 확보 조치',
    items: [
      '전송 구간 암호화(HTTPS) 및 데이터베이스 접근 제어(행 수준 보안)',
      'API 키 등 민감 정보의 해시·암호화 저장',
      '개인정보 접근 권한의 최소화',
    ],
  },
  {
    title: '10. 개인정보 보호책임자',
    paragraphs: [
      '개인정보 처리에 관한 문의, 불만, 피해 구제는 아래로 연락해 주세요.',
      '개인정보 보호책임자: Linkbrain 운영자 · 이메일: beyondworks.br@gmail.com',
    ],
  },
  {
    title: '부칙',
    paragraphs: [
      '이 개인정보처리방침은 2026년 7월 10일부터 시행됩니다. 내용이 변경되는 경우 시행 7일 전 서비스 내 공지를 통해 알립니다.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 md:px-6">
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          개인정보처리방침
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
