import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    name: 'Free',
    nameKo: '무료',
    price: '₩0',
    period: '영구 무료',
    description: '개인 사용에 딱 맞는 기본 플랜',
    features: [
      '클립 100개',
      '컬렉션 5개',
      'AI 요약 월 30회',
      'Content Studio 월 10회',
      'API 키 2개',
      '커뮤니티 접근',
    ],
    cta: '무료로 시작하기',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    nameKo: '프로',
    price: '₩9,900',
    period: '월',
    description: '파워 유저를 위한 프리미엄 기능',
    features: [
      '클립 무제한',
      '컬렉션 무제한',
      'AI 요약 무제한',
      'Content Studio 무제한',
      '시맨틱 검색 + 지식 그래프',
      '하이라이트 + 주석',
      'API 키 5개',
      '우선 지원',
    ],
    cta: 'Pro 시작하기',
    href: '/signup?plan=pro',
    highlighted: true,
  },
  {
    name: 'Master',
    nameKo: '마스터',
    price: '₩29,900',
    period: '월',
    description: '팀과 크리에이터를 위한 최상위 플랜',
    features: [
      'Pro의 모든 기능',
      'AI 크레딧 5배',
      '팀 워크스페이스',
      '고급 분석 대시보드',
      'Slack/Notion 통합',
      'API 키 10개',
      '전용 지원',
      '조기 접근',
    ],
    cta: 'Master 시작하기',
    href: '/signup?plan=master',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold">요금제</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          필요에 맞는 플랜을 선택하세요. 언제든 업그레이드할 수 있습니다.
        </p>
      </div>

      <div className="mt-16 grid gap-8 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              'flex flex-col gap-0 p-6',
              plan.highlighted && 'border-primary shadow-lg'
            )}
          >
            {plan.highlighted && (
              <span className="mb-4 w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                인기
              </span>
            )}
            <h3 className="text-lg font-semibold">{plan.nameKo}</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{plan.price}</span>
              {plan.period !== '영구 무료' && (
                <span className="text-sm text-muted-foreground">
                  / {plan.period}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {plan.description}
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className="mt-8 w-full"
              variant={plan.highlighted ? 'default' : 'outline'}
              asChild
            >
              <Link href={plan.href}>{plan.cta}</Link>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
