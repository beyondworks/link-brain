'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'motion/react';

const FEATURES = [
  {
    step: '01',
    title: 'AI가 알아서 요약',
    description:
      'Open AI로 제목 추출, 요약 생성, 자동 태깅, 카테고리 분류를 자동으로 처리합니다.',
    image: '/images/landing/80d5989adc131321cac0e9143d0082a725148f56.png',
    alt: 'Linkbrain 대시보드 — 클립 목록',
  },
  {
    step: '02',
    title: '멀티 플랫폼 클리핑',
    description:
      'YouTube, X/Twitter, Instagram, Threads, 네이버 블로그 등 주요 플랫폼의 콘텐츠를 URL 하나로 저장합니다.\n각 플랫폼 전용 페처가 최적의 메타데이터를 추출합니다.',
    image: '/images/landing/4b4aa1d6da0f8a98387e9977bff027bd22b3886a.png',
    alt: '클립 추가 모달',
  },
  {
    step: '03',
    title: '클립 상세 & AI 리더',
    description:
      '저장된 콘텐츠를 열면 AI가 핵심 요약·액션 스냅을 바로 제시합니다. 긴 아티클도 몇 초 만에 핵심만 파악하세요.',
    image: '/images/landing/116ecbcc977d6f8005e7b1c6385a16dea5ec4615.png',
    alt: '클립 상세 뷰 — AI 요약',
  },
  {
    step: '04',
    title: '콘텐츠 스튜디오',
    description:
      '저장한 클립을 기반으로 블로그 포스트, 뉴스레터, SNS 포스트, 요약문 등 11가지 콘텐츠를 생성하세요.',
    image: '/images/landing/64139d47fa461ddc2a639cbb0ba032dd513ddc29.png',
    alt: '콘텐츠 스튜디오',
  },
  {
    step: '05',
    title: 'AI 인사이트',
    description:
      '저장된 콘텐츠에서 발견한 패턴과 인사이트를 자동으로 분석합니다. 클러스터, 트렌드, 행동 패턴을 한눈에 확인하세요.',
    image: '/images/landing/0010a39611eeb7f66bc1602eb4a2f62a633b96e4.png',
    alt: 'AI 인사이트',
  },
  {
    step: '06',
    title: '홈 대시보드',
    description:
      '총 클립 수, 즐겨찾기, 이번 주 활동, 그래이드 현황을 한 화면에서 확인합니다. 나중에 읽기와 최근 활동도 놓치지 마세요.',
    image: '/images/landing/87e8e38104d1f12860b2561cbf2ff4aeaac840f8.png',
    alt: '홈 대시보드 — 통계 및 활동',
  },
];

function FeatureRow({
  step,
  title,
  description,
  image,
  alt,
  index: _index,
}: (typeof FEATURES)[0] & { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <div ref={ref} className="grid grid-cols-1 lg:grid-cols-[1fr_1.7fr] gap-8 lg:gap-16 items-center">
      {/* Text */}
      <motion.div
        initial={{ opacity: 0, x: -36 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-4 lg:pr-4"
      >
        <span
          className="inline-block text-[11px] tracking-[1.2px] uppercase"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            color: '#21DBA4',
          }}
        >
          {step}
        </span>
        <h3
          className="text-[clamp(22px,2.8vw,36px)] text-[#111] tracking-[-0.8px] leading-[1.2] text-[28px]"
          style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700 }}
        >
          {title}
        </h3>
        <p
          className="text-[15px] text-[#888] leading-[1.75] tracking-[-0.25px]"
          style={{ fontFamily: "'Pretendard Variable', sans-serif", whiteSpace: 'pre-line' }}
        >
          {description}
        </p>
        {/* Accent line */}
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: 32 } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="h-[2px] rounded-full"
          style={{ background: 'linear-gradient(90deg, #21DBA4, #C3EBF8)' }}
        />
      </motion.div>

      {/* Screenshot card */}
      <motion.div
        initial={{ opacity: 0, x: 40, scale: 0.97 }}
        animate={inView ? { opacity: 1, x: 0, scale: 1 } : {}}
        transition={{ duration: 0.85, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {/* Card glow */}
        <div
          className="absolute -inset-4 rounded-[32px] opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(33,219,164,0.08) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />

        <motion.div
          whileHover={{ y: -6 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-[20px] overflow-hidden"
          style={{
            boxShadow:
              '0 0 0 1px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.09), 0 16px 56px rgba(0,0,0,0.07)',
          }}
        >
          {/* macOS window chrome */}
          <div
            className="flex items-center gap-2 px-4 py-[10px]"
            style={{ background: '#1c1c1e' }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28CA41]" />
            </div>
            <div
              className="flex-1 mx-3 h-[22px] rounded-md flex items-center px-3 gap-2"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              />
              <span
                className="text-[11px] truncate"
                style={{
                  fontFamily: "'Inter', monospace",
                  color: 'rgba(255,255,255,0.32)',
                }}
              >
                link-brain-omega.vercel.app
              </span>
            </div>
            <div className="w-5" />
          </div>

          {/* Screenshot */}
          <motion.div
            initial={{ scale: 1.04 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={image}
              alt={alt}
              width={800}
              height={500}
              unoptimized
              className="w-full block"
              style={{ display: 'block' }}
              draggable={false}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function FeatureSection() {
  return (
    <section className="py-24 md:py-36 bg-white overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Feature rows */}
        <div className="space-y-24 md:space-y-36">
          {FEATURES.map((feature, index) => (
            <FeatureRow key={feature.step} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
