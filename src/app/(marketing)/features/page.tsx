import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: '기능 — Linkbrain',
  description: '멀티 플랫폼 클리핑, AI 자동 정리, 시맨틱 연결, Content Studio 등 Linkbrain의 모든 기능을 알아보세요.',
  openGraph: {
    title: '기능 — Linkbrain',
    description: 'Linkbrain의 모든 기능을 알아보세요. 저장부터 창작까지, 지식의 전 과정을 하나의 도구로.',
    url: 'https://linkbrain.cloud/features',
  },
  alternates: { canonical: 'https://linkbrain.cloud/features' },
};
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
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Globe,
    title: '멀티 플랫폼 클리핑',
    description:
      'YouTube, Twitter/X, Instagram, Threads, 네이버 블로그 등 주요 플랫폼의 콘텐츠를 URL 하나로 저장합니다. 각 플랫폼 전용 페처가 최적의 메타데이터를 추출합니다.',
    accent: 'from-blue-400/20 to-cyan-400/10',
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
  },
  {
    icon: Sparkles,
    title: 'AI 자동 정리',
    description:
      'OpenAI + Gemini 듀얼 AI로 제목 추출, 요약 생성, 자동 태깅, 카테고리 분류를 자동으로 처리합니다.',
    accent: 'from-violet-400/20 to-purple-400/10',
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-500/10',
  },
  {
    icon: Brain,
    title: '시맨틱 연결',
    description:
      'pgvector 임베딩으로 유사 콘텐츠를 자동 연결합니다. 지식 그래프로 클립 간 관계를 시각화하세요.',
    accent: 'from-primary/20 to-emerald-400/10',
    iconColor: 'text-primary',
    iconBg: 'bg-brand-muted',
  },
  {
    icon: Search,
    title: '통합 검색 (Omni-Search)',
    description:
      'Cmd+K로 클립, 컬렉션, 태그를 한 번에 검색합니다. 한국어/영어 통합 검색과 시맨틱 검색을 지원합니다.',
    accent: 'from-orange-400/20 to-amber-400/10',
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-500/10',
  },
  {
    icon: Zap,
    title: 'Content Studio',
    description:
      '저장한 클립을 기반으로 블로그 포스트, 뉴스레터, Twitter 스레드, 요약문 등 11가지 콘텐츠를 생성하세요.',
    accent: 'from-yellow-400/20 to-lime-400/10',
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-500/10',
  },
  {
    icon: Users,
    title: '커뮤니티 탐색',
    description:
      '다른 사용자의 공개 클립을 발견하세요. 트렌딩 콘텐츠, 에디터스 픽, 크리에이터 프로필을 둘러보세요.',
    accent: 'from-pink-400/20 to-rose-400/10',
    iconColor: 'text-pink-500',
    iconBg: 'bg-pink-500/10',
  },
  {
    icon: Smartphone,
    title: 'PWA + 모바일',
    description:
      'PWA로 설치하여 오프라인에서도 클립을 확인하세요. iOS/Android에서 공유 메뉴로 바로 저장합니다.',
    accent: 'from-sky-400/20 to-indigo-400/10',
    iconColor: 'text-sky-500',
    iconBg: 'bg-sky-500/10',
  },
  {
    icon: Shield,
    title: 'API 연동',
    description:
      'REST API v1으로 iPhone 단축어, Slack, Notion 등 외부 서비스와 연동합니다.',
    accent: 'from-teal-400/20 to-green-400/10',
    iconColor: 'text-teal-500',
    iconBg: 'bg-teal-500/10',
  },
];

const FEATURES_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '멀티 플랫폼 클리핑이란?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'YouTube, Twitter/X, Instagram, Threads, 네이버 블로그 등 주요 플랫폼의 콘텐츠를 URL 하나로 저장합니다. 각 플랫폼 전용 페처가 최적의 메타데이터를 추출합니다.',
      },
    },
    {
      '@type': 'Question',
      name: 'AI 자동 정리란?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'OpenAI + Gemini 듀얼 AI로 제목 추출, 요약 생성, 자동 태깅, 카테고리 분류를 자동으로 처리합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '시맨틱 연결이란?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'pgvector 임베딩으로 유사 콘텐츠를 자동 연결합니다. 지식 그래프로 클립 간 관계를 시각화하세요.',
      },
    },
    {
      '@type': 'Question',
      name: '통합 검색 (Omni-Search)이란?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Cmd+K로 클립, 컬렉션, 태그를 한 번에 검색합니다. 한국어/영어 통합 검색과 시맨틱 검색을 지원합니다.',
      },
    },
    {
      '@type': 'Question',
      name: 'Content Studio란?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '저장한 클립을 기반으로 블로그 포스트, 뉴스레터, Twitter 스레드, 요약문 등 11가지 콘텐츠를 생성하세요.',
      },
    },
    {
      '@type': 'Question',
      name: '커뮤니티 탐색이란?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '다른 사용자의 공개 클립을 발견하세요. 트렌딩 콘텐츠, 에디터스 픽, 크리에이터 프로필을 둘러보세요.',
      },
    },
    {
      '@type': 'Question',
      name: 'PWA + 모바일 기능이란?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'PWA로 설치하여 오프라인에서도 클립을 확인하세요. iOS/Android에서 공유 메뉴로 바로 저장합니다.',
      },
    },
    {
      '@type': 'Question',
      name: 'API 연동이란?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'REST API v1으로 iPhone 단축어, Slack, Notion 등 외부 서비스와 연동합니다.',
      },
    },
  ],
};

export default function FeaturesPage() {
  const heroFeatures = FEATURES.slice(0, 3);
  const gridFeatures = FEATURES.slice(3);

  const HeroFirstFeature = heroFeatures[0];
  const HeroFirstIcon = HeroFirstFeature.icon;

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FEATURES_JSON_LD) }}
      />
      {/* ─── Hero ──────────────────────────────────────────── */}
      <div className="bg-gradient-mesh bg-noise relative overflow-hidden pb-16 pt-20">
        {/* Background orbs */}
        <div
          className="glow-orb animate-float-slow pointer-events-none absolute left-1/4 -top-24 h-[400px] w-[400px] opacity-40"
          aria-hidden="true"
        />
        <div
          className="glow-orb animate-float-reverse pointer-events-none absolute right-0 bottom-0 h-[300px] w-[300px] opacity-25"
          style={{ background: 'oklch(0.65 0.18 155 / 12%)' }}
          aria-hidden="true"
        />

        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="animate-pop-in border-gradient mb-6 inline-flex items-center gap-2 rounded-full bg-brand-muted px-5 py-2 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              모든 기능 살펴보기
            </div>
            <h1 className="animate-fade-in-up fill-both text-5xl font-black tracking-tight md:text-6xl lg:text-7xl">
              <span className="text-gradient-shimmer">강력한 기능</span>으로
              <br />
              <span className="text-foreground">지식을 완성하세요</span>
            </h1>
            <p className="animate-fade-in-up animation-delay-150 fill-both mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              Linkbrain이 제공하는 모든 기능을 알아보세요.
              저장부터 창작까지, 지식의 전 과정을 하나의 도구로.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Feature Cards ─────────────────────────────────── */}
      <div className="bg-dots border-t border-border/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">

            {/* 핵심 피처 하이라이트: 1+2 레이아웃 */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* 첫 번째: 넓은 카드 */}
              <div className="reveal-on-scroll card-glow group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-8 shadow-card">
                {/* Accent gradient background */}
                <div
                  className={cn(
                    'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100',
                    HeroFirstFeature.accent
                  )}
                />
                <div className="relative z-10">
                  <div className={cn('icon-glow mb-5 inline-flex rounded-2xl p-4', HeroFirstFeature.iconBg)}>
                    <HeroFirstIcon className={cn('h-8 w-8 group-hover-bounce', HeroFirstFeature.iconColor)} />
                  </div>
                  <h3 className="mb-3 text-xl font-bold tracking-tight">{HeroFirstFeature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {HeroFirstFeature.description}
                  </p>
                </div>
              </div>

              {/* 두 번째 + 세 번째 */}
              <div className="flex flex-col gap-5">
                {heroFeatures.slice(1).map((feature, index) => (
                  <div
                    key={feature.title}
                    className={cn(
                      'card-glow group relative flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card p-7 shadow-card reveal-on-scroll',
                      index === 0 && 'animation-delay-150',
                      index === 1 && 'animation-delay-300'
                    )}
                  >
                    <div
                      className={cn(
                        'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100',
                        feature.accent
                      )}
                    />
                    <div className="relative z-10">
                      <div className={cn('icon-glow mb-4 inline-flex rounded-xl p-3.5', feature.iconBg)}>
                        <feature.icon className={cn('h-6 w-6 group-hover-bounce', feature.iconColor)} />
                      </div>
                      <h3 className="mb-2.5 text-lg font-bold tracking-tight">{feature.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 구분선 */}
            <div className="divider-gradient my-10" />

            {/* 나머지 피처: 2열 그리드 */}
            <div className="grid gap-5 md:grid-cols-2">
              {gridFeatures.map((feature, index) => (
                <div
                  key={feature.title}
                  className={cn(
                    'card-glow group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 shadow-card reveal-on-scroll',
                    index === 0 && 'animation-delay-75',
                    index === 1 && 'animation-delay-150',
                    index === 2 && 'animation-delay-225',
                    index === 3 && 'animation-delay-300',
                    index === 4 && 'animation-delay-400'
                  )}
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100',
                      feature.accent
                    )}
                  />
                  <div className="relative z-10 flex gap-5">
                    <div className={cn('icon-glow mt-0.5 inline-flex shrink-0 rounded-xl p-3', feature.iconBg)}>
                      <feature.icon className={cn('h-5 w-5 group-hover-bounce', feature.iconColor)} />
                    </div>
                    <div>
                      <h3 className="mb-2 font-bold tracking-tight">{feature.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ─── CTA ─────────────────────────────────────────── */}
            <div className="bg-gradient-animated bg-noise relative mt-16 overflow-hidden rounded-2xl p-12 text-center reveal-on-scroll">
              {/* Glow orb */}
              <div
                className="glow-orb animate-float pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 opacity-40"
                style={{ background: 'oklch(1 0 0 / 15%)' }}
                aria-hidden="true"
              />
              <div className="relative z-10">
                <h2 className="text-3xl font-black text-white md:text-4xl">
                  지금 바로 시작하세요
                </h2>
                <p className="mt-3 text-base text-white/70">
                  14일 무료 체험. 신용카드 불필요.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Button
                    size="lg"
                    asChild
                    className="hover-scale rounded-xl bg-white px-8 text-base font-bold text-foreground shadow-[0_4px_30px_oklch(0_0_0/20%)] transition-all duration-300 hover:bg-white hover:shadow-[0_8px_50px_oklch(0_0_0/30%)]"
                  >
                    <Link href="/signup" className="flex items-center gap-2">
                      무료로 시작하기 <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    asChild
                    className="rounded-xl border-white/30 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/60 hover:bg-white/20"
                  >
                    <Link href="/pricing">요금제 보기</Link>
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
