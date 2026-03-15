'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'motion/react';

const FEATURES = [
  {
    step: '01',
    title: 'AI가 자동으로 요약하고 분류합니다',
    description:
      'URL을 저장하는 순간, AI가 콘텐츠를 분석해 핵심 요약, 태그, 카테고리를 자동 생성합니다. 복잡한 정리 작업 없이 바로 지식이 됩니다.',
    image: '/images/landing/80d5989adc131321cac0e9143d0082a725148f56.png',
    alt: 'Dashboard',
  },
  {
    step: '02',
    title: '클릭 한 번으로 어디서든 저장',
    description:
      '브라우저에서 발견한 콘텐츠를 바로 저장하세요. YouTube, Twitter, 블로그, PDF — 플랫폼에 상관없이 최적의 메타데이터를 자동으로 추출합니다.',
    image: '/images/landing/4b4aa1d6da0f8a98387e9977bff027bd22b3886a.png',
    alt: 'Modal',
  },
  {
    step: '03',
    title: 'Content Studio로 콘텐츠 재창조',
    description:
      '저장한 지식을 바탕으로 새로운 콘텐츠를 만드세요. AI가 요약, 번역, 블로그 초안까지 자동으로 생성해줍니다.',
    image: '/images/landing/64139d47fa461ddc2a639cbb0ba032dd513ddc29.png',
    alt: 'Studio',
  },
  {
    step: '04',
    title: 'AI 인사이트로 지식을 연결합니다',
    description:
      '저장한 콘텐츠 사이의 숨겨진 연결고리를 AI가 찾아냅니다. 관련 클립 추천, 트렌드 분석, 지식 그래프로 더 깊은 이해를 도와줍니다.',
    image: '/images/landing/0010a39611eeb7f66bc1602eb4a2f62a633b96e4.png',
    alt: 'Insight',
  },
  {
    step: '05',
    title: '클립 상세 — 모든 정보를 한눈에',
    description:
      '원본 콘텐츠, AI 요약, 태그, 메모를 하나의 화면에서 확인하세요. 필요한 정보를 빠르게 찾고, 메모를 추가해 나만의 맥락을 더할 수 있습니다.',
    image: '/images/landing/116ecbcc977d6f8005e7b1c6385a16dea5ec4615.png',
    alt: 'Clip Detail',
  },
  {
    step: '06',
    title: '깔끔한 홈, 나만의 지식 허브',
    description:
      '대시보드에서 최근 저장, 즐겨찾기, 카테고리별 현황을 한눈에 파악하세요. 직관적인 인터페이스로 수백 개의 클립도 쉽게 관리할 수 있습니다.',
    image: '/images/landing/87e8e38104d1f12860b2561cbf2ff4aeaac840f8.png',
    alt: 'Home',
  },
];

function SectionBadge({ label }: { label: string }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full opacity-60 blur-sm"
        style={{
          background:
            'linear-gradient(89deg, rgba(91,214,195,0.8) 0%, rgba(197,234,246,0.8) 100%)',
        }}
      />
      <span
        className="relative rounded-full px-5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.8px] text-white"
        style={{
          fontFamily: "'Pretendard Variable', sans-serif",
          background:
            'linear-gradient(89deg, rgba(91,214,195,0.7) 0%, rgba(197,234,246,0.7) 100%)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function MacWindowChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-[#2a2a2a] px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="ml-4 flex-1 text-center text-[11px] font-medium text-white/30">
          linkbrain.cloud
        </div>
      </div>
      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
}

function FeatureRow({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const isReversed = index % 2 === 1;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col items-center gap-10 md:gap-16 ${
        isReversed ? 'md:flex-row-reverse' : 'md:flex-row'
      }`}
    >
      {/* Text */}
      <div className="flex-1 text-center md:text-left">
        <span className="text-sm font-bold text-[#21DBA4]">
          Step {feature.step}
        </span>
        <h3
          className="mt-3 text-2xl font-extrabold leading-snug tracking-tight text-white md:text-3xl"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            wordBreak: 'keep-all',
          }}
        >
          {feature.title}
        </h3>
        <p
          className="mt-4 text-base leading-relaxed text-white/50"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            wordBreak: 'keep-all',
          }}
        >
          {feature.description}
        </p>
      </div>

      {/* Screenshot */}
      <div className="w-full flex-1">
        <MacWindowChrome>
          <Image
            src={feature.image}
            alt={feature.alt}
            width={800}
            height={500}
            unoptimized
            className="block w-full"
          />
        </MacWindowChrome>
      </div>
    </motion.div>
  );
}

export function FeatureSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32"
      style={{ background: '#090909' }}
    >
      {/* Section header */}
      <motion.div
        className="mx-auto mb-20 max-w-3xl px-4 text-center md:px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionBadge label="Features" />
        <h2
          className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            wordBreak: 'keep-all',
          }}
        >
          왜 Linkbrain인가요?
        </h2>
        <p
          className="mt-4 text-lg text-white/40"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          저장에서 활용까지, 지식의 전 과정을 자동화합니다
        </p>
      </motion.div>

      {/* Feature rows */}
      <div className="mx-auto max-w-6xl space-y-24 px-4 md:space-y-32 md:px-6">
        {FEATURES.map((feature, i) => (
          <FeatureRow key={feature.step} feature={feature} index={i} />
        ))}
      </div>
    </section>
  );
}
