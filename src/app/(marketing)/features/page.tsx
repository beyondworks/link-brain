import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Globe,
  Sparkles,
  Brain,
  Zap,
  Search,
  Shield,
  Smartphone,
  Users,
  ArrowRight,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Globe,
    title: '멀티 플랫폼 클리핑',
    description:
      'YouTube, Twitter/X, Instagram, Threads, 네이버 블로그 등 주요 플랫폼의 콘텐츠를 URL 하나로 저장합니다. 각 플랫폼 전용 페처가 최적의 메타데이터를 추출합니다.',
  },
  {
    icon: Sparkles,
    title: 'AI 자동 정리',
    description:
      'OpenAI + Gemini 듀얼 AI로 제목 추출, 요약 생성, 자동 태깅, 카테고리 분류를 자동으로 처리합니다.',
  },
  {
    icon: Brain,
    title: '시맨틱 연결',
    description:
      'pgvector 임베딩으로 유사 콘텐츠를 자동 연결합니다. 지식 그래프로 클립 간 관계를 시각화하세요.',
  },
  {
    icon: Search,
    title: '통합 검색 (Omni-Search)',
    description:
      'Cmd+K로 클립, 컬렉션, 태그를 한 번에 검색합니다. 한국어/영어 통합 검색과 시맨틱 검색을 지원합니다.',
  },
  {
    icon: Zap,
    title: 'Content Studio',
    description:
      '저장한 클립을 기반으로 블로그 포스트, 뉴스레터, Twitter 스레드, 요약문 등 11가지 콘텐츠를 생성하세요.',
  },
  {
    icon: Users,
    title: '커뮤니티 탐색',
    description:
      '다른 사용자의 공개 클립을 발견하세요. 트렌딩 콘텐츠, 에디터스 픽, 크리에이터 프로필을 둘러보세요.',
  },
  {
    icon: Smartphone,
    title: 'PWA + 모바일',
    description:
      'PWA로 설치하여 오프라인에서도 클립을 확인하세요. iOS/Android에서 공유 메뉴로 바로 저장합니다.',
  },
  {
    icon: Shield,
    title: 'API 연동',
    description:
      'REST API v1으로 iPhone 단축어, Slack, Notion 등 외부 서비스와 연동합니다.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold">기능</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Linkbrain이 제공하는 모든 기능을 알아보세요.
        </p>
      </div>

      <div className="mt-16 grid gap-8 md:grid-cols-2">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border bg-background p-6"
          >
            <feature.icon className="mb-3 h-6 w-6 text-primary" />
            <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Button size="lg" asChild>
          <Link href="/signup">
            무료로 시작하기 <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
