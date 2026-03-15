import type { Metadata } from 'next';
import { PLAN_LIMITS } from '@/config/credits';
import { LandingContent } from './_components/landing-content';

export const metadata: Metadata = {
  title: 'Linkbrain — AI 세컨드 브레인 | 웹 콘텐츠 저장 & 지식 관리',
  description:
    '웹의 모든 콘텐츠를 저장하고, AI로 정리하고, 지식으로 연결하세요. YouTube, Twitter, 블로그 등 모든 플랫폼을 지원합니다.',
  openGraph: {
    title: 'Linkbrain — AI 세컨드 브레인',
    description: '웹의 모든 콘텐츠를 저장하고, AI로 정리하고, 지식으로 연결하세요.',
    url: 'https://linkbrain.cloud',
    siteName: 'Linkbrain',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Linkbrain — AI 세컨드 브레인',
    description: '웹의 모든 콘텐츠를 저장하고, AI로 정리하고, 지식으로 연결하세요.',
  },
  alternates: {
    canonical: 'https://linkbrain.cloud',
  },
};

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Linkbrain은 무료인가요?',
    answer: `기본 플랜은 영구 무료입니다. 최대 ${PLAN_LIMITS.free.maxClips}개의 클립을 저장하고, AI 분석 월 ${PLAN_LIMITS.free.monthlyAiCredits}회, Content Studio 월 ${PLAN_LIMITS.free.monthlyStudioGenerations}회를 카드 등록 없이 즉시 사용할 수 있습니다.`,
  },
  {
    question: '어떤 콘텐츠를 저장할 수 있나요?',
    answer:
      'URL이 있는 모든 콘텐츠를 저장할 수 있습니다. 웹페이지, 블로그 아티클, YouTube 영상, Twitter/X 스레드, PDF, 뉴스 기사 등 플랫폼 전용 페처가 최적의 메타데이터를 자동으로 추출합니다.',
  },
  {
    question: 'AI 분석은 어떻게 작동하나요?',
    answer:
      'URL을 저장하는 순간 AI가 자동으로 콘텐츠를 분석합니다. 제목, 핵심 요약, 관련 태그를 생성하고 적절한 카테고리로 분류합니다. OpenAI와 Gemini 듀얼 AI 엔진을 사용해 정확도를 높였습니다.',
  },
  {
    question: '기존 북마크를 가져올 수 있나요?',
    answer:
      '네, JSON 및 CSV 형식의 가져오기를 지원합니다. Chrome, Firefox, Safari의 북마크 내보내기 파일이나 Raindrop.io, Pocket 등 다른 서비스에서 내보낸 파일을 그대로 가져올 수 있습니다.',
  },
  {
    question: '데이터는 안전한가요?',
    answer:
      'Supabase 기반의 PostgreSQL에 암호화하여 저장하며, 사용자별 Row Level Security(RLS)로 데이터를 완벽히 격리합니다. 내 데이터는 오직 나만 접근할 수 있습니다.',
  },
  {
    question: '브라우저 확장 프로그램이 있나요?',
    answer:
      'Chrome과 Firefox용 확장 프로그램을 현재 개발 중입니다. 출시 알림을 받으려면 회원가입 후 이메일 알림을 활성화해 두세요.',
  },
];

const JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Linkbrain',
    url: 'https://linkbrain.cloud',
    description: '웹의 모든 콘텐츠를 저장하고, AI로 정리하고, 지식으로 연결하세요.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://linkbrain.cloud/explore?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Linkbrain',
    url: 'https://linkbrain.cloud',
    logo: 'https://linkbrain.cloud/icon.svg',
    sameAs: [],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Linkbrain',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1200',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  },
];

/**
 * JSON-LD uses only hardcoded constants (no user input) — safe for inline script.
 */
export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <LandingContent />
    </>
  );
}
