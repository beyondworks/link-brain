'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

export function FinalCTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      className="relative py-32 overflow-hidden"
      style={{
        background: 'linear-gradient(-84deg, #C3EBF8 0%, #5DD5C3 49%, #90E0DD 100%)',
      }}
    >
      {/* Animated background orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: [0, -20, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-[-80px] right-[-80px] w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-[600px] mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-[16px] text-white/80 mb-4 tracking-[-0.3px]"
          style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 500 }}
        >
          지금 바로 시작하세요
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-[clamp(36px,5vw,60px)] text-white mb-4 tracking-[-2px] leading-[1.1]"
          style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 800 }}
        >
          지식 관리를<br />다음 단계로
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-[16px] text-white/70 mb-10 tracking-[-0.3px]"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          무료 플랜으로 최대 100개 클립을 저장할 수 있습니다.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center gap-4 flex-wrap"
        >
          <motion.a
            href="#"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="px-8 py-3.5 rounded-full text-[15px] bg-white tracking-[-0.2px] hover:shadow-xl hover:shadow-black/10 transition-shadow text-[#51e9c3]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 600 }}
          >
            무료로 시작하기
          </motion.a>
          <motion.a
            href="#pricing"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="px-8 py-3.5 rounded-full text-[15px] text-white border border-white/40 hover:border-white/70 transition-all backdrop-blur-sm"
            style={{
              fontFamily: "'Pretendard Variable', sans-serif",
              fontWeight: 500,
              background: 'rgba(255,255,255,0.1)',
            }}
          >
            요금제 보기
          </motion.a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 text-[13px] text-white/50"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          카드 등록 불필요 &nbsp;&middot;&nbsp; 즉시 사용 가능 &nbsp;&middot;&nbsp; 언제든 취소
        </motion.p>
      </div>
    </section>
  );
}
