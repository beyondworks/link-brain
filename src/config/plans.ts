import { PLAN_LIMITS, type PlanTier } from './credits';

export interface MarketingPlan {
  tier: PlanTier;
  name: string;
  nameKo: string;
  price: { monthly: string; yearly: string };
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
}

function formatLimit(value: number): string {
  if (value === Infinity) return '무제한';
  return value.toLocaleString('ko-KR');
}

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    tier: 'free',
    name: 'Free',
    nameKo: '무료',
    price: { monthly: '₩0', yearly: '₩0' },
    period: '영구 무료',
    description: '개인 사용에 딱 맞는 기본 플랜',
    features: [
      `클립 ${formatLimit(PLAN_LIMITS.free.maxClips)}개`,
      `컬렉션 ${formatLimit(PLAN_LIMITS.free.maxCollections)}개`,
      `AI 분석 월 ${formatLimit(PLAN_LIMITS.free.monthlyAiCredits)}회`,
      `Content Studio 월 ${formatLimit(PLAN_LIMITS.free.monthlyStudioGenerations)}회`,
      '기본 검색',
      '커뮤니티 접근',
    ],
    cta: '무료로 시작하기',
    href: '/signup',
    highlighted: false,
  },
  {
    tier: 'pro',
    name: 'Pro',
    nameKo: '프로',
    price: { monthly: '₩9,900', yearly: '₩7,920' },
    period: '월',
    description: '파워 유저를 위한 프리미엄 기능',
    features: [
      `클립 ${formatLimit(PLAN_LIMITS.pro.maxClips)}`,
      `컬렉션 ${formatLimit(PLAN_LIMITS.pro.maxCollections)}`,
      `AI 분석 월 ${formatLimit(PLAN_LIMITS.pro.monthlyAiCredits)}회`,
      `Content Studio 월 ${formatLimit(PLAN_LIMITS.pro.monthlyStudioGenerations)}회`,
      '시맨틱 검색 + 지식 그래프',
      '하이라이트 + 주석',
      `API 키 ${PLAN_LIMITS.pro.maxApiKeys}개`,
      '컬렉션 공유',
      '내보내기',
      '우선 지원',
    ],
    cta: 'Pro 시작하기',
    href: '/signup?plan=pro',
    highlighted: true,
  },
  {
    tier: 'master',
    name: 'Master',
    nameKo: '마스터',
    price: { monthly: '₩29,900', yearly: '₩23,920' },
    period: '월',
    description: '팀과 크리에이터를 위한 최상위 플랜',
    features: [
      'Pro의 모든 기능',
      `AI 분석 ${formatLimit(PLAN_LIMITS.master.monthlyAiCredits)}`,
      `Content Studio ${formatLimit(PLAN_LIMITS.master.monthlyStudioGenerations)}`,
      '팀 워크스페이스',
      `API 키 ${PLAN_LIMITS.master.maxApiKeys}개`,
      'MCP 서버 연동',
      '전용 지원',
      '조기 접근',
    ],
    cta: 'Master 시작하기',
    href: '/signup?plan=master',
    highlighted: false,
  },
];
