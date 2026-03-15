'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

const PLATFORMS = [
  'YouTube', 'Threads', 'Instagram', 'Twitter / X', 'Blog',
  'Notion', 'PDF', 'Velog', 'Medium', 'Tistory',
  'Reddit', 'Substack', 'GitHub', 'Naver',
];

export function SocialProofSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-10"
      style={{
        background: 'linear-gradient(180deg, #0D0D0D 0%, #141414 100%)',
      }}
    >
      {/* Fade edges */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32"
        style={{
          background: 'linear-gradient(90deg, #0D0D0D 0%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32"
        style={{
          background: 'linear-gradient(270deg, #0D0D0D 0%, transparent 100%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-white/40">
          모든 플랫폼의 콘텐츠를 한 곳에
        </p>

        {/* Marquee row 1 */}
        <div className="flex gap-6 overflow-hidden whitespace-nowrap">
          <div className="flex shrink-0 animate-[marquee_30s_linear_infinite] gap-6">
            {[...PLATFORMS, ...PLATFORMS].map((name, i) => (
              <span
                key={i}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white/50"
              >
                {name}
              </span>
            ))}
          </div>
          <div
            className="flex shrink-0 animate-[marquee_30s_linear_infinite] gap-6"
            aria-hidden="true"
          >
            {[...PLATFORMS, ...PLATFORMS].map((name, i) => (
              <span
                key={i}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white/50"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Marquee row 2 (reverse) */}
        <div className="mt-4 flex gap-6 overflow-hidden whitespace-nowrap">
          <div className="flex shrink-0 animate-[marquee-reverse_35s_linear_infinite] gap-6">
            {[...PLATFORMS].reverse().concat([...PLATFORMS].reverse()).map((name, i) => (
              <span
                key={i}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white/50"
              >
                {name}
              </span>
            ))}
          </div>
          <div
            className="flex shrink-0 animate-[marquee-reverse_35s_linear_infinite] gap-6"
            aria-hidden="true"
          >
            {[...PLATFORMS].reverse().concat([...PLATFORMS].reverse()).map((name, i) => (
              <span
                key={i}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white/50"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
