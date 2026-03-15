'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';

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

const FREE_FEATURES = [
  '클립 100개',
  'AI 분석 월 100회',
  '컬렉션 5개',
  'Content Studio 월 10회',
  '기본 검색',
  '커뮤니티 접근',
];

const PRO_FEATURES = [
  '클립 무제한',
  '컬렉션 무제한',
  'AI 분석 월 500회',
  'Content Studio 월 100회',
  '시멘틱 검색 + 인사이트',
  'API 키 1개',
];

const PRICES = {
  monthly: { free: '0', pro: '9,900' },
  yearly: { free: '0', pro: '7,900' },
};

export function PricingSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [isYearly, setIsYearly] = useState(false);

  const prices = isYearly ? PRICES.yearly : PRICES.monthly;

  return (
    <section
      ref={ref}
      id="pricing"
      className="relative py-24 md:py-32"
      style={{ background: '#090909' }}
    >
      {/* Header */}
      <motion.div
        className="mx-auto mb-12 max-w-3xl px-4 text-center md:px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionBadge label="Pricing" />
        <h2
          className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            wordBreak: 'keep-all',
          }}
        >
          필요한 만큼만 사용하세요
        </h2>
        <p className="mt-4 text-lg text-white/40">
          무료로 시작하고, 필요할 때 업그레이드하세요
        </p>
      </motion.div>

      {/* Monthly / Yearly toggle */}
      <motion.div
        className="mx-auto mb-12 flex items-center justify-center gap-3"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <span
          className={`text-sm font-medium transition-colors ${!isYearly ? 'text-white' : 'text-white/40'}`}
        >
          월간
        </span>
        <button
          type="button"
          onClick={() => setIsYearly((v) => !v)}
          className="relative h-7 w-12 rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
          aria-label={isYearly ? '월간 결제로 전환' : '연간 결제로 전환'}
        >
          <motion.div
            className="absolute top-0.5 h-6 w-6 rounded-full bg-[#21DBA4]"
            animate={{ left: isYearly ? '22px' : '2px' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
        <span
          className={`text-sm font-medium transition-colors ${isYearly ? 'text-white' : 'text-white/40'}`}
        >
          연간
          <span className="ml-1.5 rounded-full bg-[#21DBA4]/15 px-2 py-0.5 text-[10px] font-bold text-[#21DBA4]">
            -20%
          </span>
        </span>
      </motion.div>

      {/* Cards */}
      <div className="mx-auto flex max-w-4xl flex-col items-stretch gap-6 px-4 md:flex-row md:px-6">
        {/* Free plan */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-[#111] p-8"
        >
          <div>
            <h3
              className="text-xl font-bold text-white"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              Free
            </h3>
            <div className="mt-4 flex items-baseline gap-1">
              <AnimatePresence mode="wait">
                <motion.span
                  key={prices.free}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-4xl font-extrabold text-white"
                >
                  {prices.free}원
                </motion.span>
              </AnimatePresence>
            </div>
            <p className="mt-1 text-sm text-white/30">영구 무료</p>
            <p className="mt-2 text-sm text-white/40">
              개인 사용에 딱 맞는 기본 플랜
            </p>
          </div>

          <ul className="mt-6 flex-1 space-y-0">
            {FREE_FEATURES.map((feat) => (
              <li
                key={feat}
                className="flex items-center gap-3 border-b border-white/5 py-3"
              >
                <Check className="h-4 w-4 shrink-0 text-white/30" />
                <span className="text-sm text-white/60">{feat}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/signup"
            className="mt-8 block rounded-xl border border-[#21DBA4]/30 py-3 text-center text-sm font-semibold text-[#21DBA4] transition-all duration-200 hover:bg-[#21DBA4]/10"
          >
            무료로 시작
          </Link>
        </motion.div>

        {/* Pro plan */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-1 flex-col rounded-2xl border-2 border-[#21DBA4]/40 bg-[#111] p-8 shadow-[0_0_60px_rgba(33,219,164,0.08)]"
        >
          {/* Badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#21DBA4] px-4 py-1 text-xs font-bold text-black">
            추천
          </div>

          <div>
            <h3
              className="text-xl font-bold text-white"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              Pro
            </h3>
            <div className="mt-4 flex items-baseline gap-1">
              <AnimatePresence mode="wait">
                <motion.span
                  key={prices.pro}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-4xl font-extrabold text-white"
                >
                  {prices.pro}원
                </motion.span>
              </AnimatePresence>
              <span className="text-sm text-white/30">/ 월</span>
            </div>
            <p className="mt-2 text-sm text-white/40">
              파워 유저를 위한 프리미엄 기능
            </p>
          </div>

          <ul className="mt-6 flex-1 space-y-0">
            {PRO_FEATURES.map((feat) => (
              <li
                key={feat}
                className="flex items-center gap-3 border-b border-white/5 py-3"
              >
                <Check className="h-4 w-4 shrink-0 text-[#21DBA4]" />
                <span className="text-sm text-white/60">{feat}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/signup"
            className="mt-8 block rounded-xl py-3 text-center text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(33,219,164,0.3)]"
            style={{
              background: 'linear-gradient(135deg, #21DBA4 0%, #1BC290 100%)',
            }}
          >
            Pro 시작하기
          </Link>
        </motion.div>
      </div>

      {/* Bottom note */}
      <p className="mt-10 text-center text-[13px] text-white/25">
        모든 플랜은 신용카드 없이 시작 가능 · 언제든 해지 가능
      </p>
    </section>
  );
}
