'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MARKETING_PLANS } from '@/config/plans';

const FAQ_ITEMS = [
  {
    q: '환불 정책은 어떻게 되나요?',
    a: '결제 후 7일 이내에 요청하시면 전액 환불해 드립니다. 사용량과 관계없이 무조건 적용됩니다.',
  },
  {
    q: '언제든지 플랜을 변경할 수 있나요?',
    a: '네, 언제든지 업그레이드 또는 다운그레이드할 수 있습니다. 변경 즉시 적용되며 남은 기간은 일할 계산됩니다.',
  },
  {
    q: '팀 플랜은 별도로 있나요?',
    a: 'Master 플랜에 팀 워크스페이스 기능이 포함되어 있습니다. 5인 이상 대규모 팀은 별도 문의 주시면 맞춤 견적을 드립니다.',
  },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        'card-glow rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 animate-blur-in',
        index === 0 && 'animation-delay-100',
        index === 1 && 'animation-delay-200',
        index === 2 && 'animation-delay-300',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left group"
      >
        <span className="font-semibold text-foreground text-sm leading-snug pr-4">
          {q}
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300',
            open && 'rotate-180 text-primary'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          open ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <p className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
          {a}
        </p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  const PRICE_NUMERIC: Record<string, string> = { Free: '0', Pro: '9900', Master: '29900' };
  const pricingJsonLd = MARKETING_PLANS.map((plan) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `Linkbrain ${plan.name}`,
    description: plan.description,
    offers: {
      '@type': 'Offer',
      price: PRICE_NUMERIC[plan.name] ?? '0',
      priceCurrency: 'KRW',
      priceValidUntil: '2026-12-31',
      availability: 'https://schema.org/InStock',
    },
  }));

  return (
    <div className="bg-gradient-mesh bg-noise min-h-screen relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      {/* Ambient glow orbs for depth */}
      <div
        className="glow-orb w-[600px] h-[400px] top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float-slow"
        style={{ background: 'oklch(0.78 0.15 168 / 12%)' }}
        aria-hidden="true"
      />
      <div
        className="glow-orb w-80 h-80 bottom-1/4 right-0 translate-x-1/3 animate-float-reverse"
        style={{ background: 'oklch(0.70 0.12 200 / 8%)' }}
        aria-hidden="true"
      />

      {/* Hero section */}
      <div className="relative container mx-auto px-4 pt-20 pb-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-muted border border-primary/20 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-brand inline-block" />
              14일 무료 체험 · 카드 불필요
            </span>
          </div>

          <h1 className="text-6xl font-black tracking-tight animate-fade-in-up animation-delay-100">
            당신에게 맞는{' '}
            <span className="text-gradient-brand">요금제</span>
          </h1>
          <p className="mt-5 text-xl text-muted-foreground animate-fade-in-up animation-delay-200">
            필요에 맞는 플랜을 선택하세요. 언제든 업그레이드할 수 있습니다.
          </p>

          {/* Toggle */}
          <div className="mt-10 inline-flex items-center gap-1 rounded-2xl bg-glass border border-border p-1.5 shadow-sm animate-fade-in-up animation-delay-300">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={cn(
                'rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-300',
                !isYearly
                  ? 'bg-gradient-brand text-white shadow-md glow-brand-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              월간
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-300',
                isYearly
                  ? 'bg-gradient-brand text-white shadow-md glow-brand-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              연간
              <span className={cn(
                'rounded-full px-2 py-0.5 text-xs font-bold transition-all duration-300',
                isYearly
                  ? 'bg-white/20 text-white'
                  : 'bg-gradient-brand text-white'
              )}>
                20% 할인
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <div className="relative container mx-auto px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3 items-center">
            {MARKETING_PLANS.map((plan, index) => {
              if (plan.highlighted) {
                return (
                  <div
                    key={plan.name}
                    className={cn(
                      'pricing-highlight rounded-3xl scale-[1.05] glow-brand animate-blur-in',
                      index === 1 && 'animation-delay-200',
                    )}
                  >
                    <div className="relative flex flex-col gap-0 p-7 rounded-3xl bg-card">
                      {/* Badge */}
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                        <span className="bg-gradient-brand text-white rounded-full px-5 py-1.5 text-xs font-bold whitespace-nowrap shadow-brand animate-pulse-brand">
                          가장 인기
                        </span>
                      </div>

                      <h2 className="text-lg font-black text-gradient-brand">{plan.nameKo}</h2>

                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-5xl font-black stat-number">
                          {isYearly ? plan.price.yearly : plan.price.monthly}
                        </span>
                        <span className="text-sm text-muted-foreground">/ 월</span>
                      </div>
                      {isYearly && (
                        <p className="mt-0.5 text-xs text-primary font-medium">
                          연간 결제 기준 · 20% 절약
                        </p>
                      )}

                      <p className="mt-2 text-sm text-muted-foreground">
                        {plan.description}
                      </p>

                      <ul className="mt-6 flex-1 space-y-3">
                        {plan.features.map((feature, fi) => (
                          <li
                            key={feature}
                            className={cn('flex items-start gap-2 text-sm animate-pop-in',
                              fi === 0 && 'animation-delay-300',
                              fi === 1 && 'animation-delay-400',
                              fi === 2 && 'animation-delay-500',
                              fi === 3 && 'animation-delay-600',
                              fi === 4 && 'animation-delay-700',
                              fi === 5 && 'animation-delay-800',
                              fi === 6 && 'animation-delay-900',
                              fi === 7 && 'animation-delay-1000',
                            )}
                          >
                            <div className="mt-0.5 w-5 h-5 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
                              <Check className="h-3 w-3 text-white" strokeWidth={3} />
                            </div>
                            <span className="font-medium text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className="mt-8 w-full h-12 font-bold text-sm rounded-xl glow-brand animate-pulse-brand hover-lift transition-all duration-300"
                        asChild
                      >
                        <Link href={plan.href}>{plan.cta}</Link>
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={plan.name}
                  className={cn(
                    'animate-blur-in',
                    index === 0 && 'animation-delay-100',
                    index === 2 && 'animation-delay-300',
                  )}
                >
                  <div
                    className={cn(
                      'relative flex flex-col gap-0 p-6 rounded-2xl bg-card border border-border card-interactive shadow-card',
                      plan.name === 'Master' && 'border-gradient'
                    )}
                  >
                    <h2 className="text-lg font-black text-foreground">{plan.nameKo}</h2>

                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-foreground">
                        {isYearly ? plan.price.yearly : plan.price.monthly}
                      </span>
                      {plan.period !== '영구 무료' && (
                        <span className="text-sm text-muted-foreground">/ 월</span>
                      )}
                    </div>
                    {plan.period === '영구 무료' && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{plan.period}</p>
                    )}
                    {isYearly && plan.period !== '영구 무료' && (
                      <p className="mt-0.5 text-xs text-muted-foreground">연간 결제 기준</p>
                    )}

                    <p className="mt-2 text-sm text-muted-foreground">
                      {plan.description}
                    </p>

                    <ul className="mt-6 flex-1 space-y-3">
                      {plan.features.map((feature, fi) => (
                        <li
                          key={feature}
                          className={cn('flex items-start gap-2 text-sm animate-pop-in',
                            fi === 0 && 'animation-delay-100',
                            fi === 1 && 'animation-delay-200',
                            fi === 2 && 'animation-delay-300',
                            fi === 3 && 'animation-delay-400',
                            fi === 4 && 'animation-delay-500',
                            fi === 5 && 'animation-delay-600',
                            fi === 6 && 'animation-delay-700',
                            fi === 7 && 'animation-delay-800',
                          )}
                        >
                          <Check
                            className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary"
                            strokeWidth={2.5}
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="mt-8 w-full h-11 font-semibold text-sm rounded-xl transition-all duration-300 hover-lift"
                      variant="outline"
                      asChild
                    >
                      <Link href={plan.href}>{plan.cta}</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="container mx-auto px-4">
        <div className="divider-gradient mx-auto max-w-2xl" />
      </div>

      {/* Social proof strip */}
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center justify-center gap-8 text-center animate-fade-in-up">
            {[
              { number: '10,000+', label: '활성 사용자' },
              { number: '2M+', label: '저장된 클립' },
              { number: '99.9%', label: '서비스 가동률' },
            ].map(({ number, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-3xl font-black stat-number">{number}</span>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="container mx-auto px-4">
        <div className="divider-gradient mx-auto max-w-2xl" />
      </div>

      {/* FAQ section */}
      <div className="relative container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-black text-center mb-3 animate-fade-in-up">
            자주 묻는 질문
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-10 animate-fade-in-up animation-delay-100">
            더 궁금한 점이 있으면{' '}
            <Link href="/support" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">
              문의하세요
            </Link>
          </p>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => (
              <FaqItem key={item.q} q={item.q} a={item.a} index={index} />
            ))}
          </div>
        </div>
      </div>

      {/* CTA strip at bottom */}
      <div className="relative container mx-auto px-4 pb-20">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl bg-gradient-animated p-px animate-blur-in animation-delay-400">
            <div className="rounded-3xl bg-card px-8 py-10 text-center">
              <h3 className="text-2xl font-black text-foreground">
                아직도 고민 중이신가요?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                14일 무료 체험으로 직접 경험해보세요. 카드 정보 불필요.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  className="h-12 px-8 font-bold rounded-xl glow-brand hover-lift transition-all duration-300"
                  asChild
                >
                  <Link href="/signup?plan=pro">무료로 시작하기</Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 px-8 font-semibold rounded-xl hover-lift transition-all duration-300"
                  asChild
                >
                  <Link href="/support">팀 플랜 문의</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
