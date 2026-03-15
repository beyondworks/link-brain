'use client';

import { useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface PricingSectionProps {
  reducedMotion: boolean;
}

const FREE_FEATURES = [
  '클립 100개',
  'AI 분석 월 100회',
  '컬렉션 5개',
  'Content Studio 월 10회',
  '기본 검색',
  '커뮤니티 접근',
];

const PRO_FEATURES = [
  '클립 무제한',
  '컬렉션 무제한',
  'AI 분석 월 500회',
  'Content Studio 월 100회',
  '시멘틱 검색 + 인사이트',
  'API 키 1개',
];

export function PricingSection({ reducedMotion }: PricingSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const section = sectionRef.current;
      if (!section) return;

      gsap.fromTo(
        section.querySelectorAll('.pricing-card'),
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.2,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 70%',
            toggleActions: 'play none none none',
          },
        },
      );
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  return (
    <section ref={sectionRef} className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#2DD4BF]">요금제</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#0F172A] md:text-5xl" style={{ wordBreak: 'keep-all' }}>
            필요한 만큼만 사용하세요
          </h2>
          <p className="mt-4 text-lg text-[#64748B]">무료로 시작하고, 필요할 때 업그레이드하세요</p>
        </div>

        {/* Cards */}
        <div className="mx-auto flex max-w-[848px] flex-col items-stretch gap-6 md:flex-row">
          {/* Free */}
          <div className="pricing-card flex w-full flex-col rounded-2xl border border-[#E2E8F0] bg-white p-7 md:w-[400px]">
            <div>
              <h3 className="text-xl font-bold text-[#0F172A]">Free</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#0F172A]">0원</span>
              </div>
              <p className="mt-1 text-sm text-[#64748B]">영구 무료</p>
              <p className="mt-2 text-sm text-[#64748B]">개인 사용에 딱 맞는 기본 플랜</p>
            </div>

            <ul className="mt-6 flex-1 space-y-0">
              {FREE_FEATURES.map((feat) => (
                <li key={feat} className="flex items-center gap-3 border-b border-black/5 py-3">
                  <Check className="h-4 w-4 shrink-0 text-[#64748B]" />
                  <span className="text-sm text-[#0F172A]">{feat}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              size="lg"
              asChild
              className="mt-6 w-full rounded-xl border-[#2DD4BF] text-[#0D9488] transition-all duration-200 hover:scale-[1.03] hover:bg-[#2DD4BF]/5"
            >
              <Link href="/signup">무료로 시작</Link>
            </Button>
          </div>

          {/* Pro (highlighted) */}
          <div className="pricing-card relative flex w-full flex-col rounded-2xl border-2 border-[#2DD4BF] p-7 shadow-[0_8px_32px_rgba(45,212,191,0.15)] md:w-[400px]" style={{ background: 'linear-gradient(180deg, #F8FFFE 0%, #FFFFFF 100%)' }}>
            {/* Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#2DD4BF] px-4 py-1 text-xs font-bold text-white">
              가장 인기
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#0F172A]">Pro</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#0F172A]">9,900원</span>
                <span className="text-sm text-[#64748B]">/ 월</span>
              </div>
              <p className="mt-2 text-sm text-[#64748B]">파워 유저를 위한 프리미엄 기능</p>
            </div>

            <ul className="mt-6 flex-1 space-y-0">
              {PRO_FEATURES.map((feat) => (
                <li key={feat} className="flex items-center gap-3 border-b border-black/5 py-3">
                  <Check className="h-4 w-4 shrink-0 text-[#2DD4BF]" />
                  <span className="text-sm text-[#0F172A]">{feat}</span>
                </li>
              ))}
            </ul>

            <Button
              size="lg"
              asChild
              className="mt-6 w-full rounded-xl bg-[#2DD4BF] text-white transition-all duration-200 hover:scale-[1.03] hover:bg-[#0D9488] hover:shadow-lg"
            >
              <Link href="/signup">Pro 시작하기</Link>
            </Button>
          </div>
        </div>

        {/* Bottom note */}
        <p className="mt-8 text-center text-[13px] text-[#64748B]">
          모든 플랜은 신용카드 없이 시작 가능 · 언제든 해지 가능
        </p>
      </div>
    </section>
  );
}
