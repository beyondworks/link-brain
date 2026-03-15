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

// ── Card data ──────────────────────────────────────────────────────────────
const cards = [
  {
    title: 'API 연동',
    desc: ['REST API v1으로 iPhone 단축어, Slack, Notion 등의 외부 서비스와', 'Claude, ChatGPT, Gemini 등 LLM 서비스와 연동합니다.'],
    tag: 'Developer',
    visual: (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="w-full max-w-[260px] space-y-2.5">
          {[
            { method: 'GET', path: '/clips', color: '#21DBA4' },
            { method: 'POST', path: '/clips/create', color: '#5DD5C3' },
            { method: 'PUT', path: '/clips/:id/tag', color: '#90E0DD' },
            { method: 'DELETE', path: '/clips/:id', color: '#C3EBF8' },
          ].map((api, i) => (
            <motion.div
              key={api.path}
              initial={{ opacity: 0, x: -15 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 + 0.3 }}
              className="flex items-center gap-3 py-2 border-b border-white/10"
            >
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ color: api.color, background: `${api.color}22`, fontWeight: 600 }}
              >
                {api.method}
              </span>
              <span className="text-[12px] text-white/50 font-mono">{api.path}</span>
            </motion.div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'PWA + 모바일',
    desc: ['PWA로 설치하여 로컬에서도 클립을 확인하세요.', 'iOS / Android에서 공유 메뉴로 바로 저장합니다.'],
    tag: 'Mobile',
    visual: (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="w-[100px] h-[180px] rounded-[20px] border-2 border-white/20 relative overflow-hidden bg-white/5">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-white/20" />
          <div className="absolute inset-x-2 top-8 bottom-2 rounded-[12px] bg-white/[0.08] overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 + 0.5 }}
                className="m-2 h-6 rounded-md bg-white/10 flex items-center px-2 gap-1.5"
              >
                <div className="w-3 h-3 rounded-sm bg-[#21DBA4]/50" />
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.15]" />
              </motion.div>
            ))}
          </div>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border border-white/30 flex items-center justify-center"
          >
            <div className="w-3 h-3 rounded-sm border border-white/40" />
          </motion.div>
        </div>
      </div>
    ),
  },
];

// ── Component ──────────────────────────────────────────────────────────────
export function DeveloperSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      className="relative py-28 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #111 0%, #1a1a1a 100%)' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(33,219,164,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Section Header */}
        <AnimatedSection className="flex flex-col items-center gap-5 mb-20">
          <SectionBadge label="Platform" />
          <h2
            className="text-[clamp(28px,4vw,48px)] text-transparent bg-clip-text text-center tracking-[-1px] leading-[1.15]"
            style={{
              backgroundImage: 'linear-gradient(110deg, #5DD5C3 0%, #C3EBF8 50%, #5DD5C3 100%)',
              fontFamily: "'Pretendard Variable', sans-serif",
              fontWeight: 800,
            }}
          >
            세컨드 브레인을 만드세요<br />
            링크가 쌓이면 지식이 복리가 됩니다
          </h2>
          <p
            className="text-[16px] text-white/50 text-center tracking-[-0.3px] max-w-[480px] leading-[1.8]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            저장에서 창작까지, 지식의 전 과정을 하나의 도구로 완성하세요.<br />
            웹의 모든 콘텐츠를 저장하고, AI로 정리하고, 지식으로 연결하세요.
          </p>
        </AnimatedSection>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.75, delay: i * 0.15 + 0.2, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
              className="relative rounded-[24px] overflow-hidden group"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[24px]"
                style={{
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(33,219,164,0.06) 0%, transparent 70%)',
                }}
              />

              {/* Visual area */}
              <div className="h-[220px] relative overflow-hidden">
                {card.visual}
              </div>

              {/* Content */}
              <div className="px-7 pb-7 pt-1">
                <div className="h-[1px] bg-white/[0.08] mb-6" />
                <span
                  className="text-[11px] tracking-[1px] uppercase text-[#21DBA4] mb-2 block"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
                >
                  {card.tag}
                </span>
                <h3
                  className="text-[20px] text-white mb-3 tracking-[-0.4px]"
                  style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 600 }}
                >
                  {card.title}
                </h3>
                {card.desc.map((line, j) => (
                  <p
                    key={j}
                    className="text-[14px] text-white/50 leading-[1.7] tracking-[-0.2px]"
                    style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
