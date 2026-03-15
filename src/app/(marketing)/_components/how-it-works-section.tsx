'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Link2, Sparkles, Brain } from 'lucide-react';

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

const STEPS = [
  {
    icon: Link2,
    number: '01',
    title: 'URL 저장',
    description: 'URL을 붙여넣거나\n브라우저 익스텐션으로 한 클릭에 저장',
    color: '#21DBA4',
  },
  {
    icon: Sparkles,
    number: '02',
    title: 'AI 자동 분석',
    description: 'AI가 콘텐츠를 분석해\n요약, 태그, 카테고리를 자동 생성',
    color: '#5BD6C3',
  },
  {
    icon: Brain,
    number: '03',
    title: '지식 연결',
    description: '저장한 콘텐츠가 서로 연결되며\n나만의 지식 네트워크 형성',
    color: '#C5EAF6',
  },
];

function StepCard({
  step,
  index,
  inView,
}: {
  step: (typeof STEPS)[number];
  index: number;
  inView: boolean;
}) {
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: 0.6,
        delay: 0.15 * index,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative flex flex-col"
    >
      {/* Connector line (desktop only) */}
      {index < STEPS.length - 1 && (
        <div
          className="pointer-events-none absolute right-0 top-12 hidden h-px w-full translate-x-1/2 md:block"
          style={{
            background: `linear-gradient(90deg, ${step.color}40 0%, transparent 100%)`,
          }}
        />
      )}

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111] p-8">
        {/* Dark top area with animated step number */}
        <div className="mb-6">
          <motion.span
            className="text-6xl font-extrabold"
            style={{ color: `${step.color}15` }}
            animate={
              inView
                ? { opacity: [0, 1], scale: [0.8, 1] }
                : { opacity: 0, scale: 0.8 }
            }
            transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
          >
            {step.number}
          </motion.span>
        </div>

        {/* Icon */}
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${step.color}15` }}
        >
          <Icon className="h-6 w-6" style={{ color: step.color }} />
        </div>

        {/* Text */}
        <h3
          className="text-xl font-bold text-white"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          {step.title}
        </h3>
        <p
          className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/40"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          {step.description}
        </p>
      </div>
    </motion.div>
  );
}

export function HowItWorksSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32"
      style={{ background: '#090909' }}
    >
      <motion.div
        className="mx-auto mb-16 max-w-3xl px-4 text-center md:px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionBadge label="How it Works" />
        <h2
          className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            wordBreak: 'keep-all',
          }}
        >
          3단계로 시작하세요
        </h2>
        <p className="mt-4 text-lg text-white/40">
          복잡한 설정 없이, URL 하나로 지식 관리를 시작할 수 있습니다
        </p>
      </motion.div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 md:grid-cols-3 md:px-6">
        {STEPS.map((step, i) => (
          <StepCard key={step.number} step={step} index={i} inView={inView} />
        ))}
      </div>
    </section>
  );
}
