'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export interface FeatureData {
  id: string;
  icon: string;
  title: string;
  description: string;
  mockupType: 'clip-card' | 'categories' | 'knowledge-graph' | 'multi-device';
}

interface FeatureSectionProps {
  features: FeatureData[];
  reducedMotion: boolean;
}

function ClipCardMockup() {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#2DD4BF]/15" />
        <div className="flex-1">
          <div className="h-3 w-3/4 rounded bg-[#0F172A]/10" />
          <div className="mt-1.5 h-2 w-1/2 rounded bg-[#64748B]/10" />
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-[#F8FFFE] p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-sm">✦</span>
          <span className="text-xs font-semibold text-[#0D9488]">AI 요약</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded bg-[#64748B]/8" />
          <div className="h-2 w-5/6 rounded bg-[#64748B]/8" />
          <div className="h-2 w-2/3 rounded bg-[#64748B]/8" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <span className="rounded-full bg-[#2DD4BF]/10 px-2.5 py-1 text-[10px] font-medium text-[#0D9488]">기술</span>
        <span className="rounded-full bg-[#67E8F9]/15 px-2.5 py-1 text-[10px] font-medium text-[#0891B2]">AI</span>
        <span className="rounded-full bg-[#A7F3D0]/20 px-2.5 py-1 text-[10px] font-medium text-[#059669]">생산성</span>
      </div>
    </div>
  );
}

function CategoriesMockup() {
  const categories = ['기술', 'AI/ML', '디자인', '비즈니스', '개발'];
  return (
    <div className="space-y-3">
      {categories.map((cat, i) => (
        <div key={cat} className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `hsl(${170 + i * 15}, 70%, 92%)` }}>
              <span className="text-xs">◈</span>
            </div>
            <span className="text-sm font-medium text-[#0F172A]">{cat}</span>
          </div>
          <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#64748B]">{12 + i * 7}</span>
        </div>
      ))}
    </div>
  );
}

function KnowledgeGraphMockup() {
  return (
    <div className="relative flex h-64 items-center justify-center">
      {/* Central node */}
      <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-[#2DD4BF] shadow-lg">
        <span className="text-lg text-white">◎</span>
      </div>
      {/* Connected nodes */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const x = Math.cos((angle * Math.PI) / 180) * 90;
        const y = Math.sin((angle * Math.PI) / 180) * 70;
        return (
          <div key={i}>
            {/* Connection line */}
            <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" width="200" height="160" style={{ overflow: 'visible' }}>
              <line x1="0" y1="0" x2={x} y2={y} stroke="#2DD4BF" strokeWidth="1" strokeOpacity="0.3" />
            </svg>
            <div
              className="absolute left-1/2 top-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white shadow-sm"
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            >
              <div className="h-3 w-3 rounded-full" style={{ background: `hsl(${170 + i * 20}, 60%, 75%)` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MultiDeviceMockup() {
  return (
    <div className="flex items-end justify-center gap-4">
      {/* Desktop */}
      <div className="w-48 rounded-lg border border-[#E2E8F0] bg-white shadow-sm">
        <div className="flex items-center gap-1 border-b border-[#E2E8F0] px-2 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-red-300" />
          <div className="h-1.5 w-1.5 rounded-full bg-yellow-300" />
          <div className="h-1.5 w-1.5 rounded-full bg-green-300" />
        </div>
        <div className="p-3">
          <div className="h-2 w-3/4 rounded bg-[#0F172A]/10" />
          <div className="mt-2 space-y-1.5">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-[#2DD4BF]/10" />
                <div className="flex-1">
                  <div className="h-1.5 w-full rounded bg-[#64748B]/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Mobile */}
      <div className="w-20 rounded-xl border-2 border-[#E2E8F0] bg-white p-1.5 shadow-sm">
        <div className="h-1 w-6 mx-auto rounded-full bg-[#E2E8F0] mb-1.5" />
        <div className="space-y-1.5 px-1">
          {[1, 2].map((j) => (
            <div key={j} className="rounded bg-[#F8FFFE] p-1.5">
              <div className="h-1 w-full rounded bg-[#64748B]/10" />
              <div className="mt-1 h-1 w-2/3 rounded bg-[#64748B]/8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const MOCKUP_MAP: Record<FeatureData['mockupType'], React.FC> = {
  'clip-card': ClipCardMockup,
  'categories': CategoriesMockup,
  'knowledge-graph': KnowledgeGraphMockup,
  'multi-device': MultiDeviceMockup,
};

export function FeatureSection({ features, reducedMotion }: FeatureSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const section = sectionRef.current;
      if (!section) return;

      const isMobile = window.innerWidth < 768;
      if (isMobile) return;

      // Each feature occupies 1 "page" of scrolling
      features.forEach((_, i) => {
        ScrollTrigger.create({
          trigger: section,
          start: `${(i / features.length) * 100}% top`,
          end: `${((i + 1) / features.length) * 100}% top`,
          onEnter: () => setActiveIndex(i),
          onEnterBack: () => setActiveIndex(i),
        });
      });
    },
    { scope: sectionRef, dependencies: [reducedMotion, features.length] },
  );

  return (
    <section ref={sectionRef} className="bg-white py-24 md:min-h-[400vh] md:py-0">
      {/* Section header */}
      <div className="mx-auto max-w-5xl px-4 py-16 text-center md:py-24">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#2DD4BF]">핵심 기능</span>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#0F172A] md:text-5xl" style={{ wordBreak: 'keep-all' }}>
          왜 LinkBrain인가요?
        </h2>
        <p className="mt-4 text-lg text-[#64748B]">저장에서 활용까지, 지식의 전 과정을 자동화합니다</p>
      </div>

      {/* Desktop: sticky layout */}
      <div className="mx-auto hidden max-w-6xl md:block">
        <div className="flex gap-16 px-6">
          {/* Left: sticky text */}
          <div className="w-1/2" style={{ position: 'sticky', top: '20vh', alignSelf: 'flex-start' }}>
            {features.map((feature, i) => (
              <div
                key={feature.id}
                className="transition-all duration-500"
                style={{
                  opacity: activeIndex === i ? 1 : 0.2,
                  transform: activeIndex === i ? 'translateY(0)' : 'translateY(8px)',
                  position: activeIndex === i ? 'relative' : 'absolute',
                  pointerEvents: activeIndex === i ? 'auto' : 'none',
                }}
              >
                <span className="text-3xl">{feature.icon}</span>
                <h3 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0F172A]" style={{ wordBreak: 'keep-all' }}>
                  {feature.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-[#64748B]" style={{ wordBreak: 'keep-all' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Right: mockup */}
          <div className="w-1/2" style={{ position: 'sticky', top: '15vh', alignSelf: 'flex-start' }}>
            <div className="rounded-3xl border border-[#E2E8F0] bg-[#F8FFFE] p-8 shadow-sm">
              {features.map((feature, i) => {
                const MockupComponent = MOCKUP_MAP[feature.mockupType];
                return (
                  <div
                    key={feature.id}
                    className="transition-all duration-500"
                    style={{
                      opacity: activeIndex === i ? 1 : 0,
                      transform: activeIndex === i ? 'scale(1)' : 'scale(0.95)',
                      display: activeIndex === i ? 'block' : 'none',
                    }}
                  >
                    <MockupComponent />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="mx-auto max-w-lg space-y-8 px-4 md:hidden">
        {features.map((feature) => {
          const MockupComponent = MOCKUP_MAP[feature.mockupType];
          return (
            <div key={feature.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
              <span className="text-2xl">{feature.icon}</span>
              <h3 className="mt-3 text-xl font-extrabold text-[#0F172A]" style={{ wordBreak: 'keep-all' }}>
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-[#64748B]" style={{ wordBreak: 'keep-all' }}>
                {feature.description}
              </p>
              <div className="mt-5 rounded-xl bg-[#F8FFFE] p-4">
                <MockupComponent />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
