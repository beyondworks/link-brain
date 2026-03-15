'use client';

import { useRef, ReactNode } from 'react';
import { motion, useInView } from 'motion/react';

// ── Inlined SectionBadge ───────────────────────────────────────────────────
function SectionBadge({ label }: { label: string }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full blur-sm opacity-60"
        style={{
          background: 'linear-gradient(89deg, rgba(91,214,195,0.8) 0%, rgba(197,234,246,0.8) 100%)',
        }}
      />
      <span
        className="relative px-5 py-1.5 rounded-full text-white text-[11px] tracking-[0.8px] uppercase"
        style={{
          fontFamily: "'Pretendard Variable', sans-serif",
          fontWeight: 600,
          background: 'linear-gradient(89deg, rgba(91,214,195,0.7) 0%, rgba(197,234,246,0.7) 100%)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Inlined AnimatedSection ────────────────────────────────────────────────
function AnimatedSection({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'none';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const initial = {
    opacity: 0,
    y: direction === 'up' ? 40 : 0,
    x: direction === 'left' ? -40 : direction === 'right' ? 40 : 0,
  };

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : initial}
      transition={{
        duration: 0.75,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────
const steps = [
  {
    step: '01',
    title: 'URL 저장',
    desc: '저장하고 싶은 URL을 붙여넣기만 하세요. YouTube, Threads, 블로그 등 모든 플랫폼을 지원합니다.',
  },
  {
    step: '02',
    title: 'AI 자동 분석',
    desc: 'AI가 자동으로 제목, 요약, 태그를 추출하고 카테고리로 분류합니다. 수동 정리는 이제 그만.',
  },
  {
    step: '03',
    title: '지식 연결 & 생성',
    desc: '관련 콘텐츠가 자동으로 연결되고, 저장한 지식을 기반으로 새로운 콘텐츠를 생성하세요.',
  },
];

function StepCard({ step, title, desc, index }: { step: string; title: string; desc: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="relative group"
    >
      {/* Card */}
      <div
        className="relative rounded-[24px] overflow-hidden transition-shadow duration-500 group-hover:shadow-xl group-hover:shadow-black/[0.08]"
        style={{
          background: '#fff',
          border: '1px solid #f0f0f0',
        }}
      >
        {/* Hover gradient */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'linear-gradient(145deg, rgba(33,219,164,0.04) 0%, rgba(195,235,248,0.04) 100%)',
          }}
        />

        {/* Dark top area */}
        <div
          className="relative h-[180px] rounded-t-[24px] overflow-hidden flex items-center justify-center"
          style={{ background: '#1a1a1a' }}
        >
          {/* Step number - large background */}
          <span
            className="absolute text-[120px] font-bold text-white/[0.03] select-none leading-none"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {step}
          </span>

          {/* Visual dots / lines animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={inView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: index * 0.12 + 0.3 }}
            className="relative flex items-center justify-center"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(33,219,164,0.15), rgba(195,235,248,0.1))',
                border: '1px solid rgba(33,219,164,0.2)',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute w-14 h-14 rounded-full border border-dashed border-[#21DBA4]/20"
              />
              <span
                className="text-[24px] text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #21DBA4, #C3EBF8)',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                }}
              >
                {step}
              </span>
            </div>
          </motion.div>

          {/* Connector line (not on last) */}
          {index < 2 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.6, delay: index * 0.12 + 0.6 }}
              className="absolute right-0 top-1/2 w-8 h-[1px] origin-left"
              style={{ background: 'linear-gradient(90deg, rgba(33,219,164,0.3), transparent)' }}
            />
          )}
        </div>

        {/* Text content */}
        <div className="p-7">
          <h3
            className="text-[20px] text-[#111] tracking-[-0.5px] mb-3"
            style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700 }}
          >
            {title}
          </h3>
          <p
            className="text-[14px] text-[#888] leading-[1.75] tracking-[-0.2px]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            {desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function HowItWorksSection() {
  return (
    <section className="py-28 bg-[#fafafa]">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <AnimatedSection className="flex flex-col items-center gap-5 mb-16">
          <SectionBadge label="Start" />
          <h2
            className="text-[clamp(28px,4vw,40px)] text-transparent bg-clip-text text-center tracking-[-1px]"
            style={{
              backgroundImage: 'linear-gradient(125deg, #5DD5C3 0%, #C3EBF8 100%)',
              fontFamily: "'Pretendard Variable', sans-serif",
              fontWeight: 800,
            }}
          >
            3단계로 시작하세요
          </h2>
          <p
            className="text-[16px] text-[#888] text-center tracking-[-0.3px] max-w-[440px]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            복잡한 설정 없이, URL 하나로 지식 관리를 시작할 수 있습니다.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <StepCard
              key={step.step}
              step={step.step}
              title={step.title}
              desc={step.desc}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
