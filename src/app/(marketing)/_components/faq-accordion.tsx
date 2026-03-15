'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

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

const FAQ_ITEMS = [
  {
    question: 'Linkbrain은 무료인가요?',
    answer:
      '기본 플랜은 영구 무료입니다. 최대 100개의 클립을 저장하고, AI 분석 월 100회, Content Studio 월 10회를 카드 등록 없이 즉시 사용할 수 있습니다.',
  },
  {
    question: '어떤 콘텐츠를 저장할 수 있나요?',
    answer:
      'URL이 있는 모든 콘텐츠를 저장할 수 있습니다. 웹페이지, 블로그 아티클, YouTube 영상, Twitter/X 스레드, PDF, 뉴스 기사 등 플랫폼 전용 페처가 최적의 메타데이터를 자동으로 추출합니다.',
  },
  {
    question: 'AI 분석은 어떻게 작동하나요?',
    answer:
      'URL을 저장하는 순간 AI가 자동으로 콘텐츠를 분석합니다. 제목, 핵심 요약, 관련 태그를 생성하고 적절한 카테고리로 분류합니다. OpenAI와 Gemini 듀얼 AI 엔진을 사용해 정확도를 높였습니다.',
  },
  {
    question: '기존 북마크를 가져올 수 있나요?',
    answer:
      '네, JSON 및 CSV 형식의 가져오기를 지원합니다. Chrome, Firefox, Safari의 북마크 내보내기 파일이나 Raindrop.io, Pocket 등 다른 서비스에서 내보낸 파일을 그대로 가져올 수 있습니다.',
  },
  {
    question: '데이터는 안전한가요?',
    answer:
      'Supabase 기반의 PostgreSQL에 암호화하여 저장하며, 사용자별 Row Level Security(RLS)로 데이터를 완벽히 격리합니다. 내 데이터는 오직 나만 접근할 수 있습니다.',
  },
];

function FaqItem({
  item,
  isOpen,
  onToggle,
}: {
  item: (typeof FAQ_ITEMS)[number];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 py-6 text-left transition-colors"
      >
        <span
          className="text-base font-semibold text-white"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 shrink-0 text-white/30" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p
              className="pb-6 text-sm leading-relaxed text-white/40"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQAccordion() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32"
      style={{ background: '#0D0D0D' }}
    >
      <motion.div
        className="mx-auto mb-12 max-w-3xl px-4 text-center md:px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionBadge label="FAQ" />
        <h2
          className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            wordBreak: 'keep-all',
          }}
        >
          자주 묻는 질문
        </h2>
        <p className="mt-4 text-lg text-white/40">
          궁금한 점이 있으신가요? 아래에서 빠르게 답변을 찾아보세요.
        </p>
      </motion.div>

      <motion.div
        className="mx-auto max-w-3xl px-4 md:px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {FAQ_ITEMS.map((item, i) => (
          <FaqItem
            key={i}
            item={item}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex((prev) => (prev === i ? null : i))}
          />
        ))}
      </motion.div>
    </section>
  );
}
