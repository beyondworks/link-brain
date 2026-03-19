'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

// ── Component ──────────────────────────────────────────────────────────────
export function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  // Mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 46, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 46, damping: 18 });
  const glowX = useTransform(springX, [-0.5, 0.5], [35, 65]);
  const glowY = useTransform(springY, [-0.5, 0.5], [25, 55]);
  const mouseGlow = useTransform(
    [glowX, glowY],
    ([x, y]: number[]) =>
      `radial-gradient(ellipse at ${x}% ${y}%, rgba(33,219,164,0.07) 0%, rgba(195,235,248,0.12) 28%, transparent 62%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div className="w-full bg-white">
      {/* VISUAL SECTION */}
      <section
        ref={sectionRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full flex items-center justify-center overflow-hidden"
        style={{ minHeight: '72vh' }}
      >
        {/* Mouse-reactive glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-0"
          style={{ background: mouseGlow }}
        />

        {/* Hero video */}
        <div className="absolute inset-0 w-full h-full z-10">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            src="/video/hero_pingpong.mp4"
          />
          {/* Soft bottom fade into text section */}
          <div
            className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-10"
            style={{
              background:
                'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.88) 100%)',
            }}
          />
        </div>
      </section>

      {/* TEXT SECTION */}
      <section className="relative w-full pt-4 pb-20 text-center overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[160px] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(33,219,164,0.06) 0%, transparent 70%)',
          }}
        />

        <div className="relative max-w-[580px] mx-auto px-[24px] pt-[50px] pb-[0px]">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative inline-flex items-center justify-center mb-7"
          >
            <div
              className="absolute inset-0 rounded-full blur-md"
              style={{
                background:
                  'linear-gradient(88deg, rgba(91,214,195,0.7) 0%, rgba(197,234,246,0.7) 100%)',
              }}
            />
            <span
              className="relative py-1.5 rounded-full text-white text-[12px] tracking-[0.5px] uppercase px-[24px] py-[6px]"
              style={{
                fontFamily: "'Pretendard Variable', sans-serif",
                fontWeight: 600,
                background:
                  'linear-gradient(88deg, rgba(91,214,195,0.58) 0%, rgba(197,234,246,0.48) 100%)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.38)',
              }}
            >
              Your Second Brain
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-[clamp(34px,5.5vw,60px)] text-transparent bg-clip-text text-center leading-[1.18] tracking-[-2px] mb-5"
            style={{
              backgroundImage:
                'linear-gradient(118deg, #5DD5C3 0%, #21DBA4 44%, #5BC8E8 100%)',
              fontFamily: "'Pretendard Variable', sans-serif",
              fontWeight: 800,
            }}
          >
            저장한 링크가
            <br />
            나만의 콘텐츠가 됩니다
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="text-[clamp(15px,1.9vw,17px)] text-[#9a9a9a] text-center tracking-[-0.3px] leading-[1.9]"
            style={{
              fontFamily: "'Pretendard Variable', sans-serif",
              fontWeight: 400,
            }}
          >
            SNS, 유튜브 등 수 많은 콘텐츠와 게시물,
            <br className="hidden sm:block" />
            하루에 몇 개나 보고 몇 개나 저장하시나요?
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex items-center justify-center gap-4 flex-wrap"
          >
            <a
              href="/signup"
              className="px-7 py-3 rounded-full text-[15px] text-white transition-all duration-300 hover:shadow-xl hover:shadow-[#21DBA4]/30 hover:-translate-y-0.5 active:scale-95"
              style={{
                background: 'linear-gradient(100deg, #21DBA4 0%, #5DD5C3 100%)',
                fontFamily: "'Pretendard Variable', sans-serif",
                fontWeight: 600,
              }}
            >
              무료로 시작하기
            </a>
            <a
              href="/pricing"
              className="px-7 py-3 rounded-full text-[15px] text-[#666] border border-[#e5e5e5] hover:border-[#21DBA4]/50 hover:text-[#1A9E7A] transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              style={{
                fontFamily: "'Pretendard Variable', sans-serif",
                fontWeight: 500,
              }}
            >
              요금제 보기
            </a>
          </motion.div>

          {/* Fine print */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-5 text-[12px] text-[#ccc]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            카드 등록 불필요 · 즉시 사용 가능 · 언제든 취소
          </motion.p>
        </div>
      </section>
    </div>
  );
}
