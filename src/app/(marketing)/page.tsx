import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Brain, Zap, Globe, Sparkles, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: Globe,
    title: '어디서든 저장',
    description: 'YouTube, Twitter, 블로그... 모든 URL을 한 곳에 저장하세요.',
  },
  {
    icon: Sparkles,
    title: 'AI 자동 정리',
    description: '제목, 요약, 태그를 AI가 자동으로 추출하고 분류합니다.',
  },
  {
    icon: Brain,
    title: '지식 연결',
    description: '임베딩 기반으로 관련 콘텐츠를 자동 연결, 지식 그래프로 시각화합니다.',
  },
  {
    icon: Zap,
    title: '콘텐츠 생성',
    description: '저장한 지식을 기반으로 블로그, 뉴스레터, 스레드를 생성하세요.',
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center md:py-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            당신의{' '}
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              세컨드 브레인
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            웹의 모든 콘텐츠를 저장하고, AI로 정리하고, 지식으로 연결하세요.
            <br />
            읽기만 하던 콘텐츠를 진짜 지식으로 만들어줍니다.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">
                무료로 시작하기 <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/features">기능 알아보기</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">
            왜 Linkbrain인가요?
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-background p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <feature.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold">지금 시작하세요</h2>
          <p className="mt-4 text-muted-foreground">
            무료 플랜으로 최대 100개 클립을 저장할 수 있습니다.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/signup">무료로 시작하기</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
