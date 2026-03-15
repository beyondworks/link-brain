'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Link2, Sparkles, Brain } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface HowItWorksSectionProps {
  reducedMotion: boolean;
}

const STEPS = [
  {
    icon: Link2,
    number: '01',
    title: '저장',
    description: 'URL을 붙여넣거나 익스텐션으로\n한 클릭에 저장',
  },
  {
    icon: Sparkles,
    number: '02',
    title: '분석',
    description: 'AI가 내용을 읽고\n요약·태그·카테고리 자동 생성',
  },
  {
    icon: Brain,
    number: '03',
    title: '활용',
    description: '나중에 검색하고, 연결하고\n지식으로 활용',
  },
];

export function HowItWorksSection({ reducedMotion }: HowItWorksSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const section = sectionRef.current;
      if (!section) return;

      gsap.fromTo(
        section.querySelectorAll('.step-card'),
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.15,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        },
      );
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  return (
    <section ref={sectionRef} className="bg-[#F8FFFE] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="mb-16 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#2DD4BF]">사용 방법</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#0F172A] md:text-5xl" style={{ wordBreak: 'keep-all' }}>
            3단계로 시작하세요
          </h2>
          <p className="mt-4 text-lg text-[#64748B]">복잡한 설정 없이, URL 하나로 지식 관리를 시작할 수 있습니다</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.number} className="step-card relative">
              {/* Arrow connector (desktop only) */}
              {i < STEPS.length - 1 && (
                <div className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/2 text-2xl text-[#2DD4BF]/40 md:block" aria-hidden="true">
                  →
                </div>
              )}

              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-7 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2DD4BF]/10">
                  <step.icon className="h-6 w-6 text-[#0D9488]" />
                </div>
                <span className="text-4xl font-extrabold text-[#2DD4BF]/20">{step.number}</span>
                <h3 className="mt-2 text-lg font-bold text-[#0F172A]">{step.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#64748B]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
