import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Linkbrain — AI 세컨드 브레인 | 웹 콘텐츠 저장 & 지식 관리',
  description: '웹의 모든 콘텐츠를 저장하고, AI로 정리하고, 지식으로 연결하세요. YouTube, Twitter, 블로그 등 모든 플랫폼을 지원합니다.',
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
import {
  Brain,
  Zap,
  Globe,
  Sparkles,
  ArrowRight,
  BookOpen,
  Link2,
  Users,
  Quote,
} from 'lucide-react';
import { FaqAccordion } from './_components/faq-accordion';

const FEATURES = [
  {
    icon: Globe,
    title: '어디서든 저장',
    description:
      'YouTube, Twitter, 블로그... 모든 URL을 한 곳에 저장하세요. 플랫폼 전용 페처가 최적의 메타데이터를 추출합니다.',
  },
  {
    icon: Sparkles,
    title: 'AI 자동 정리',
    description:
      'OpenAI + Gemini 듀얼 AI로 제목, 요약, 태그를 자동 추출하고 분류합니다.',
  },
  {
    icon: Brain,
    title: '지식 연결',
    description:
      'pgvector 임베딩 기반으로 관련 콘텐츠를 자동 연결, 지식 그래프로 시각화합니다.',
  },
  {
    icon: Zap,
    title: '콘텐츠 생성',
    description:
      '저장한 지식을 기반으로 블로그, 뉴스레터, 스레드를 11가지 포맷으로 생성하세요.',
  },
];

const STATS = [
  { value: '2M+', label: '저장된 클립', icon: BookOpen },
  { value: '10K+', label: '활성 사용자', icon: Users },
  { value: '500K+', label: '생성된 컬렉션', icon: Link2 },
];

const TESTIMONIALS = [
  {
    quote:
      '매일 읽는 기사와 논문을 Linkbrain에 저장하니 지식이 체계적으로 쌓입니다.',
    name: '김지수',
    role: '프로덕트 매니저',
    initials: '김',
  },
  {
    quote:
      'AI 자동 분석이 정말 편해요. 태그 정리를 안 해도 알아서 분류해줍니다.',
    name: '박현우',
    role: '개발자',
    initials: '박',
  },
  {
    quote:
      '팀에서 리서치 자료를 공유하는 데 최고의 도구입니다.',
    name: '이서연',
    role: 'UX 리서처',
    initials: '이',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Linkbrain은 무료인가요?',
    answer:
      '기본 플랜은 영구 무료입니다. 최대 100개의 클립을 저장할 수 있으며, 카드 등록 없이 즉시 시작할 수 있습니다. 더 많은 클립과 고급 AI 기능이 필요하다면 프리미엄 플랜으로 업그레이드하세요.',
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
      'Chrome과 Firefox용 확장 프로그램을 현재 개발 중입니다. 출시 알림을 받으려면 회원가입 후 이메일 알림을 활성화해 두세요. 현재는 URL을 복사하여 앱에 붙여넣는 방식으로 저장할 수 있습니다.',
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
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
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
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  },
];

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="bg-gradient-mesh bg-noise relative overflow-hidden px-4 pb-32 pt-24 text-center md:pt-36 md:pb-40">
        {/* Background glow orbs */}
        <div
          className="glow-orb animate-float-slow pointer-events-none absolute left-1/4 -top-32 h-[500px] w-[500px] opacity-50"
          aria-hidden="true"
        />
        <div
          className="glow-orb animate-float-reverse pointer-events-none absolute right-0 top-1/3 h-[400px] w-[400px] opacity-30"
          style={{ background: 'oklch(0.65 0.18 155 / 15%)' }}
          aria-hidden="true"
        />
        <div
          className="glow-orb animate-float pointer-events-none absolute -bottom-20 left-1/3 h-[350px] w-[350px] opacity-20"
          style={{ background: 'oklch(0.70 0.12 200 / 12%)' }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-5xl">
          {/* Badge */}
          <div className="border-gradient animate-pop-in mb-8 inline-flex items-center gap-2 rounded-full bg-brand-muted px-5 py-2 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-brand" />
            새로운 AI 기능 출시 — 지식 그래프 베타
            <ArrowRight className="h-3 w-3" />
          </div>

          {/* Heading */}
          <h1 className="animate-fade-in animation-delay-100 fill-both text-6xl font-black tracking-tight md:text-[5.5rem] leading-[1.05]">
            당신의{' '}
            <span className="text-gradient-shimmer">세컨드 브레인</span>
            <br />
            <span className="text-foreground">을 만드세요</span>
          </h1>

          {/* Subheading */}
          <p className="animate-fade-in animation-delay-200 fill-both mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-muted-foreground md:text-2xl">
            웹의 모든 콘텐츠를 저장하고, AI로 정리하고, 지식으로 연결하세요.
            <br className="hidden sm:block" />
            읽기만 하던 콘텐츠를 진짜 지식으로 만들어줍니다.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in animation-delay-300 fill-both mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="animate-pulse-brand glow-brand hover:glow-brand w-full rounded-xl px-8 py-4 text-base font-bold shadow-brand transition-all duration-300 hover:-translate-y-1 hover:shadow-brand-lg sm:w-auto"
            >
              <Link href="/signup" className="flex items-center gap-2">
                무료로 시작하기 <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <div className="border-gradient w-full rounded-xl sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full rounded-xl px-8 py-4 text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-muted"
              >
                <Link href="/features">기능 알아보기</Link>
              </Button>
            </div>
          </div>

          {/* Trust signal */}
          <p className="animate-fade-in animation-delay-400 fill-both mt-6 text-sm text-muted-foreground/60">
            카드 등록 불필요 · 100개 클립 영구 무료 · 언제든 업그레이드
          </p>

          {/* Product mockup */}
          <div className="animate-blur-in animation-delay-500 fill-both relative mx-auto mt-20 max-w-4xl">
            {/* Giant glow behind mockup */}
            <div
              className="glow-orb animate-breathe pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-40"
              aria-hidden="true"
            />
            <div className="card-glow relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elevated">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 border-b border-border/50 bg-muted/30 px-5 py-3.5">
                <span className="h-3 w-3 rounded-full bg-red-400/80 transition-opacity hover:opacity-70" />
                <span className="h-3 w-3 rounded-full bg-yellow-400/80 transition-opacity hover:opacity-70" />
                <span className="h-3 w-3 rounded-full bg-green-400/80 transition-opacity hover:opacity-70" />
                <div className="mx-4 flex flex-1 items-center gap-2 rounded-md bg-background/70 px-4 py-1.5">
                  <div className="h-3 w-3 rounded-full border border-border/60" />
                  <span className="text-left text-xs text-muted-foreground/70">app.linkbrain.io</span>
                </div>
              </div>

              {/* App UI mockup */}
              <div
                className="grid grid-cols-[180px_1fr] divide-x divide-border/50 text-left"
                style={{ minHeight: '300px' }}
              >
                {/* Sidebar */}
                <div className="bg-sidebar/50 p-4">
                  <div className="mb-5 flex items-center gap-1.5">
                    <div className="shimmer h-5 w-16 rounded-md bg-muted/60" />
                  </div>
                  {['전체', '아티클', 'YouTube', '트위터', '북마크'].map((item, i) => (
                    <div
                      key={item}
                      className={`mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                        i === 0
                          ? 'bg-brand-muted text-primary font-semibold'
                          : 'text-muted-foreground/70 hover:bg-muted/50'
                      }`}
                    >
                      <div
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          i === 0 ? 'bg-primary animate-pulse-brand' : 'bg-muted-foreground/30'
                        }`}
                      />
                      {item}
                    </div>
                  ))}
                </div>

                {/* Content area */}
                <div className="p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="shimmer h-4 w-28 rounded bg-muted/60" />
                    <div className="rounded-full bg-brand-muted px-3 py-1 text-xs font-medium text-primary">
                      + 저장하기
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { delay: '' },
                      { delay: 'animation-delay-100' },
                      { delay: 'animation-delay-200' },
                      { delay: 'animation-delay-300' },
                    ].map(({ delay }, i) => (
                      <div
                        key={i}
                        className={`animate-fade-in ${delay} fill-both rounded-xl border border-border/50 bg-background/80 p-3.5`}
                      >
                        <div className="mb-2.5 flex items-center gap-1.5">
                          <div className={`h-3 w-3 rounded-sm ${i === 0 ? 'bg-red-400/60' : i === 1 ? 'bg-blue-400/60' : i === 2 ? 'bg-yellow-400/60' : 'bg-green-400/60'}`} />
                          <div className="shimmer h-2 w-3/4 rounded bg-muted/70" />
                        </div>
                        <div className="mb-1.5 h-2 w-full rounded bg-muted/40" />
                        <div className="h-2 w-2/3 rounded bg-muted/40" />
                        <div className="mt-3.5 flex items-center gap-1.5">
                          <div className="rounded-full bg-brand-muted px-2 py-0.5 text-[10px] font-medium text-primary">
                            AI 요약
                          </div>
                          <div className="h-4 w-8 rounded-full bg-muted/40" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────── */}
      <section className="bg-dots relative border-t border-border/50 py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-xl text-center">
            <p className="reveal-on-scroll mb-3 text-xs font-bold uppercase tracking-[0.15em] text-primary">
              핵심 기능
            </p>
            <h2 className="reveal-on-scroll animation-delay-100 fill-both text-4xl font-black tracking-tight md:text-5xl">
              왜 <span className="text-gradient-brand">Linkbrain</span>인가요?
            </h2>
            <p className="reveal-on-scroll animation-delay-200 fill-both mt-5 text-lg text-muted-foreground">
              저장에서 창작까지, 지식의 전 과정을 하나의 도구로 완성하세요.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className={`card-glow group reveal-on-scroll animation-delay-${(i + 1) * 150} fill-both rounded-2xl border border-border/60 bg-card p-7 shadow-card`}
              >
                <div className="icon-glow mb-5 inline-flex rounded-xl bg-brand-muted p-3.5 transition-all duration-300 group-hover:bg-[oklch(0.78_0.15_168/20%)]">
                  <feature.icon className="group-hover-bounce h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-3 text-base font-bold tracking-tight">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────────── */}
      <section className="bg-gradient-mesh bg-noise relative border-t border-border/50 py-28 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-xl text-center">
            <p className="reveal-on-scroll mb-3 text-xs font-bold uppercase tracking-[0.15em] text-primary">
              사용 방법
            </p>
            <h2 className="reveal-on-scroll animation-delay-100 fill-both text-4xl font-black tracking-tight md:text-5xl">
              3단계로 <span className="text-gradient-brand">시작하세요</span>
            </h2>
            <p className="reveal-on-scroll animation-delay-200 fill-both mt-5 text-lg text-muted-foreground">
              복잡한 설정 없이, URL 하나로 지식 관리를 시작할 수 있습니다.
            </p>
          </div>

          <div className="relative">
            {/* Connecting dotted line (desktop only) */}
            <div
              className="pointer-events-none absolute top-[3.75rem] left-[calc(16.666%+2rem)] right-[calc(16.666%+2rem)] hidden border-t-2 border-dashed border-border/40 lg:block"
              aria-hidden="true"
            />

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Step 1 */}
              <div className="card-glow group reveal-on-scroll animation-delay-150 fill-both rounded-2xl border border-border/60 bg-card p-7 shadow-card">
                <div className="mb-5 flex items-start justify-between">
                  <div className="icon-glow inline-flex rounded-xl bg-brand-muted p-3.5 transition-all duration-300 group-hover:bg-[oklch(0.78_0.15_168/20%)]">
                    <Link2 className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-5xl font-black leading-none text-gradient-brand opacity-30 select-none">
                    01
                  </span>
                </div>
                <h3 className="mb-3 text-base font-bold tracking-tight">URL 저장</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  저장하고 싶은 URL을 붙여넣기만 하세요. YouTube, Twitter, 블로그 등 모든 플랫폼을 지원합니다.
                </p>
              </div>

              {/* Step 2 */}
              <div className="card-glow group reveal-on-scroll animation-delay-300 fill-both rounded-2xl border border-border/60 bg-card p-7 shadow-card">
                <div className="mb-5 flex items-start justify-between">
                  <div className="icon-glow inline-flex rounded-xl bg-brand-muted p-3.5 transition-all duration-300 group-hover:bg-[oklch(0.78_0.15_168/20%)]">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-5xl font-black leading-none text-gradient-brand opacity-30 select-none">
                    02
                  </span>
                </div>
                <h3 className="mb-3 text-base font-bold tracking-tight">AI 자동 분석</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  AI가 자동으로 제목, 요약, 태그를 추출하고 카테고리로 분류합니다. 수동 정리는 이제 그만.
                </p>
              </div>

              {/* Step 3 */}
              <div className="card-glow group reveal-on-scroll animation-delay-450 fill-both rounded-2xl border border-border/60 bg-card p-7 shadow-card">
                <div className="mb-5 flex items-start justify-between">
                  <div className="icon-glow inline-flex rounded-xl bg-brand-muted p-3.5 transition-all duration-300 group-hover:bg-[oklch(0.78_0.15_168/20%)]">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-5xl font-black leading-none text-gradient-brand opacity-30 select-none">
                    03
                  </span>
                </div>
                <h3 className="mb-3 text-base font-bold tracking-tight">지식 연결 &amp; 생성</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  관련 콘텐츠가 자동으로 연결되고, 저장한 지식을 기반으로 새로운 콘텐츠를 생성하세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ────────────────────────────────────────────── */}
      <section className="relative border-t border-border/50">
        <div className="divider-gradient absolute top-0 inset-x-0" />
        <div className="bg-gradient-brand-subtle bg-noise relative overflow-hidden py-24">
          {/* Background orbs */}
          <div
            className="glow-orb animate-float-slow pointer-events-none absolute -left-10 top-1/2 h-72 w-72 -translate-y-1/2 opacity-30"
            aria-hidden="true"
          />
          <div
            className="glow-orb animate-float-reverse pointer-events-none absolute -right-10 top-1/2 h-72 w-72 -translate-y-1/2 opacity-20"
            aria-hidden="true"
          />

          <div className="container relative z-10 mx-auto px-4 text-center">
            <p className="reveal-on-scroll mb-14 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              전 세계 사용자가 신뢰하는 세컨드 브레인
            </p>
            <div className="grid grid-cols-3 gap-8 md:gap-16">
              {STATS.map(({ value, label, icon: Icon }, i) => (
                <div
                  key={label}
                  className={`reveal-on-scroll animation-delay-${(i + 1) * 150} fill-both flex flex-col items-center gap-3`}
                >
                  <div className="icon-glow mb-1 inline-flex rounded-2xl bg-brand-muted p-4">
                    <Icon className="animate-bounce-subtle h-6 w-6 text-primary" />
                  </div>
                  <span className="stat-number text-5xl font-black tracking-tight md:text-6xl">
                    {value}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="divider-gradient" />
      </section>

      {/* ─── Testimonials ─────────────────────────────────────── */}
      <section className="bg-dots relative border-t border-border/50 py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-xl text-center">
            <p className="reveal-on-scroll mb-3 text-xs font-bold uppercase tracking-[0.15em] text-primary">
              사용자 후기
            </p>
            <h2 className="reveal-on-scroll animation-delay-100 fill-both text-4xl font-black tracking-tight md:text-5xl">
              사용자들의 <span className="text-gradient-brand">이야기</span>
            </h2>
            <p className="reveal-on-scroll animation-delay-200 fill-both mt-5 text-lg text-muted-foreground">
              전 세계 지식 관리자들이 Linkbrain과 함께 성장하고 있습니다.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((testimonial, i) => (
              <div
                key={testimonial.name}
                className={`card-glow reveal-on-scroll animation-delay-${(i + 1) * 150} fill-both relative flex flex-col gap-5 rounded-2xl border border-border/60 bg-card p-7 shadow-card`}
              >
                {/* Quotation mark */}
                <Quote className="h-7 w-7 text-primary/30" aria-hidden="true" />

                {/* Quote text */}
                <p className="flex-1 text-sm leading-relaxed text-foreground/80">
                  {testimonial.quote}
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 border-t border-border/40 pt-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-muted text-sm font-bold text-primary">
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────── */}
      <section className="bg-gradient-mesh bg-noise relative border-t border-border/50 py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-xl text-center">
            <p className="reveal-on-scroll mb-3 text-xs font-bold uppercase tracking-[0.15em] text-primary">
              FAQ
            </p>
            <h2 className="reveal-on-scroll animation-delay-100 fill-both text-4xl font-black tracking-tight md:text-5xl">
              자주 묻는 <span className="text-gradient-brand">질문</span>
            </h2>
            <p className="reveal-on-scroll animation-delay-200 fill-both mt-5 text-lg text-muted-foreground">
              궁금한 점이 있으신가요? 아래에서 빠르게 답변을 찾아보세요.
            </p>
          </div>

          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section className="bg-gradient-animated bg-noise relative overflow-hidden py-36 text-center">
        {/* Glow orb */}
        <div
          className="glow-orb animate-float pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 opacity-50"
          style={{ background: 'oklch(1 0 0 / 15%)' }}
          aria-hidden="true"
        />

        <div className="relative z-10 container mx-auto px-4">
          <p className="reveal-on-scroll mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-white/60">
            지금 바로 시작하세요
          </p>
          <h2 className="reveal-on-scroll animation-delay-100 fill-both text-4xl font-black text-white md:text-5xl">
            지식 관리를 다음 단계로
          </h2>
          <p className="reveal-on-scroll animation-delay-200 fill-both mt-5 text-xl text-white/70">
            무료 플랜으로 최대 100개 클립을 저장할 수 있습니다.
          </p>
          <div className="reveal-on-scroll animation-delay-300 fill-both mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="hover-scale w-full bg-white px-8 py-4 text-base font-bold text-foreground shadow-[0_4px_30px_oklch(0_0_0/25%)] transition-all duration-300 hover:bg-white hover:shadow-[0_8px_50px_oklch(0_0_0/35%)] sm:w-auto rounded-xl"
            >
              <Link href="/signup" className="flex items-center gap-2">
                무료로 시작하기 <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="w-full rounded-xl border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/60 hover:bg-white/20 sm:w-auto"
            >
              <Link href="/pricing">요금제 보기</Link>
            </Button>
          </div>
          <p className="mt-8 text-sm text-white/40">
            카드 등록 불필요 · 즉시 사용 가능 · 언제든 취소
          </p>
        </div>
      </section>
    </>
  );
}
