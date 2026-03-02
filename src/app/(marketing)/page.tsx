import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Brain,
  Zap,
  Globe,
  Sparkles,
  ArrowRight,
  BookOpen,
  Link2,
  Users,
} from 'lucide-react';

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

export default function LandingPage() {
  return (
    <>
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
