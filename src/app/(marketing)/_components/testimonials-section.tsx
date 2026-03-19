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
const testimonials = [
  {
    name: '김지수',
    role: '프로덕트 매니저',
    initial: '김',
    text: '매일 읽는 기사와 논문을 Linkbrain에 저장하니까 지식이 체계적으로 쌓이고, 요약 제공 기능 덕분에 글을 읽는 피로감이 줄었습니다.',
  },
  {
    name: '박현우',
    role: '개발자',
    initial: '박',
    text: 'AI 자동 분석이 정말 편해요. 태그 정리를 안 해도 알아서 분류해주고, 클립을 찾을 때 키워드로만 찾을 수 있어서 편합니다.',
  },
  {
    name: '이서연',
    role: 'UX 리서처',
    initial: '이',
    text: '제가 저장한 클립들로 여러 유형의 콘텐츠를 만들 수 있다는 게 Linkbrain의 킥인 것 같아요. 콘텐츠 소재에 대한 고민이 줄었습니다.',
  },
];

function TestimonialCard({ name, role, initial, text, index }: { name: string; role: string; initial: string; text: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5 }}
      className="relative rounded-[24px] p-7 flex flex-col gap-5 group transition-shadow duration-500 hover:shadow-xl hover:shadow-black/5"
      style={{
        background: '#fff',
        border: '1px solid #f0f0f0',
      }}
    >
      {/* Hover gradient */}
      <div
        className="absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'linear-gradient(145deg, rgba(33,219,164,0.03) 0%, rgba(195,235,248,0.03) 100%)',
        }}
      />

      {/* Quote mark */}
      <div
        className="absolute top-5 right-6 text-[40px] leading-none text-[#21DBA4]/[0.15] select-none"
        style={{ fontFamily: "'Georgia', serif", fontWeight: 700 }}
      >
        &ldquo;
      </div>

      {/* Text */}
      <p
        className="text-[14px] text-[#666] leading-[1.8] tracking-[-0.2px] relative"
        style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
      >
        {text}
      </p>

      {/* Divider */}
      <div className="h-[1px] bg-[#f5f5f5]" />

      {/* Author */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(33,219,164,0.15), rgba(195,235,248,0.2))',
            border: '1px solid rgba(33,219,164,0.2)',
          }}
        >
          <span
            className="text-[13px] text-[#1A9E7A]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 600 }}
          >
            {initial}
          </span>
        </div>
        <div>
          <p
            className="text-[13px] text-[#222] tracking-[-0.3px]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 600 }}
          >
            {name}
          </p>
          <p
            className="text-[11px] text-[#aaa] mt-0.5"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            {role}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="py-28 bg-white">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <AnimatedSection className="flex flex-col items-center gap-5 mb-16">
          <SectionBadge label="Review" />
          <h2
            className="text-[clamp(28px,4vw,40px)] text-transparent bg-clip-text text-center tracking-[-1px]"
            style={{
              backgroundImage: 'linear-gradient(125deg, #5DD5C3 24%, #C3EBF8 100%)',
              fontFamily: "'Pretendard Variable', sans-serif",
              fontWeight: 800,
            }}
          >
            사용자들의 이야기
          </h2>
          <p
            className="text-[16px] text-[#888] text-center tracking-[-0.3px]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            Linkbrain과 함께 지식 관리자로 성장하고 있습니다.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, index) => (
            <TestimonialCard key={t.name} {...t} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
