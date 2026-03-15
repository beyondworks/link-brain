'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import { ArrowRight } from 'lucide-react';

export function FinalCTASection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-28 md:py-36"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(33,219,164,0.12) 0%, #090909 70%)',
      }}
    >
      {/* Animated orbs */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-20 top-1/4 h-60 w-60 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(33,219,164,0.15) 0%, transparent 70%)',
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -right-20 bottom-1/4 h-80 w-80 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(91,214,195,0.1) 0%, transparent 70%)',
          }}
          animate={{
            y: [0, 30, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center md:px-6">
        <motion.h2
          className="text-4xl font-extrabold tracking-tight text-white md:text-5xl"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            wordBreak: 'keep-all',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          지금 바로 시작하세요
        </motion.h2>

        <motion.p
          className="mt-5 text-lg text-white/40"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            wordBreak: 'keep-all',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          무료로 가입하고 첫 100개 링크를 저장해보세요.
          <br className="hidden sm:block" />
          카드 등록 없이, 1분 만에 시작할 수 있습니다.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(33,219,164,0.3)]"
            style={{
              background: 'linear-gradient(135deg, #21DBA4 0%, #1BC290 100%)',
            }}
          >
            무료로 시작하기
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-medium text-white/70 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            요금제 보기
          </a>
        </motion.div>

        <motion.p
          className="mt-8 text-xs text-white/20"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          가입 즉시 무료 플랜 활성화 · 신용카드 불필요 · 언제든 업그레이드
        </motion.p>
      </div>
    </section>
  );
}
