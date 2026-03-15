'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FaqAccordion } from './faq-accordion';

const HeroSection = dynamic(
  () => import('./hero-section').then((m) => ({ default: m.HeroSection })),
  { ssr: false },
);
const SocialProofSection = dynamic(
  () => import('./social-proof-section').then((m) => ({ default: m.SocialProofSection })),
  { ssr: false },
);
const FeatureSection = dynamic(
  () => import('./feature-section').then((m) => ({ default: m.FeatureSection })),
  { ssr: false },
);
const HowItWorksSection = dynamic(
  () => import('./how-it-works-section').then((m) => ({ default: m.HowItWorksSection })),
  { ssr: false },
);
const PricingSection = dynamic(
  () => import('./pricing-section').then((m) => ({ default: m.PricingSection })),
  { ssr: false },
);
const FinalCtaSection = dynamic(
  () => import('./final-cta-section').then((m) => ({ default: m.FinalCtaSection })),
  { ssr: false },
);

export interface FaqItem {
  question: string;
  answer: string;
}

interface LandingContentProps {
  features: Array<{
    id: string;
    icon: string;
    title: string;
    description: string;
    mockupType: 'clip-card' | 'categories' | 'knowledge-graph' | 'multi-device';
  }>;
  faqItems: FaqItem[];
}

export function LandingContent({ features, faqItems }: LandingContentProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div>
      <HeroSection reducedMotion={reducedMotion} />
      <SocialProofSection reducedMotion={reducedMotion} />
      <FeatureSection features={features} reducedMotion={reducedMotion} />
      <HowItWorksSection reducedMotion={reducedMotion} />
      <PricingSection reducedMotion={reducedMotion} />

      {/* FAQ */}
      <section className="bg-white py-24 md:py-32">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <div className="mx-auto mb-16 max-w-xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#2DD4BF]">FAQ</span>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#0F172A] md:text-5xl">
              자주 묻는 질문
            </h2>
            <p className="mt-4 text-lg text-[#64748B]">
              궁금한 점이 있으신가요? 아래에서 빠르게 답변을 찾아보세요.
            </p>
          </div>
          <FaqAccordion items={faqItems} />
        </div>
      </section>

      <FinalCtaSection reducedMotion={reducedMotion} />
    </div>
  );
}
