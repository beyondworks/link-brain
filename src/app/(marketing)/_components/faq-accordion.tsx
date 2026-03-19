'use client';

import { useState, useRef, ReactNode } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';

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
const faqs = [
  {
    q: 'Linkbrain은 무료인가요?',
    a: '네, 무료 플랜으로 최대 100개의 클립을 저장하고 모든 기본 기능을 사용할 수 있습니다. 더 많은 저장 공간과 고급 AI 기능이 필요하다면 Pro 플랜을 이용해보세요.',
  },
  {
    q: '어떤 콘텐츠를 저장할 수 있나요?',
    a: 'YouTube 영상, X/Twitter 게시물, Instagram 릴스, Threads, 네이버 블로그, 티스토리, 웹 아티클, PDF, 이미지 등 거의 모든 형태의 웹 콘텐츠를 저장할 수 있습니다.',
  },
  {
    q: 'AI 분석은 어떻게 작동하나요?',
    a: 'URL을 저장하면 OpenAI GPT 모델이 자동으로 콘텐츠를 분석하여 제목 추출, 핵심 요약, 관련 태그 생성, 카테고리 분류를 수행합니다. 별도 설정 없이 자동으로 작동합니다.',
  },
  {
    q: '데이터는 안전한가요?',
    a: '모든 데이터는 AES-256 암호화로 저장되며, 사용자만이 접근 가능합니다. SSL/TLS를 통해 전송 중에도 안전하게 보호됩니다. 서버는 국내 클라우드 인프라를 사용합니다.',
  },
  {
    q: '브라우저 확장 프로그램이 있나요?',
    a: 'Chrome, Firefox, Safari, Edge 브라우저 확장 프로그램을 지원합니다. 확장 프로그램을 설치하면 현재 보고 있는 페이지를 클릭 한 번으로 바로 저장할 수 있습니다.',
  },
];

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
        whileHover={{ x: 2 }}
        transition={{ duration: 0.2 }}
      >
        <span
          className={`text-[16px] tracking-[-0.3px] transition-colors duration-200 ${open ? 'text-[#1A9E7A]' : 'text-[#222] group-hover:text-[#333]'}`}
          style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 500 }}
        >
          {q}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0 ml-4"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={open ? '#21DBA4' : '#888'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-colors duration-200"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p
              className="pb-5 text-[14px] text-[#888] leading-[1.8] tracking-[-0.2px] pr-10"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-[1px] bg-[#f0f0f0]" />
    </motion.div>
  );
}

export function FAQAccordion() {
  return (
    <section className="py-28 bg-[#fafafa]">
      <div className="max-w-[860px] mx-auto px-6 md:px-12">
        <AnimatedSection className="flex flex-col items-center gap-5 mb-16">
          <SectionBadge label="FAQ" />
          <h2
            className="text-[clamp(28px,4vw,40px)] text-transparent bg-clip-text text-center tracking-[-1px]"
            style={{
              backgroundImage: 'linear-gradient(125deg, #C3EBF8 0%, #5DD5C3 37%)',
              fontFamily: "'Pretendard Variable', sans-serif",
              fontWeight: 800,
            }}
          >
            자주 묻는 질문
          </h2>
          <p
            className="text-[16px] text-[#888] text-center tracking-[-0.3px]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            궁금한 점이 있으신가요? 아래에서 빠르게 답변을 찾아보세요.
          </p>
        </AnimatedSection>

        <div className="border-t border-[#f0f0f0]">
          {faqs.map((faq, index) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
