'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

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

const TESTIMONIALS = [
  {
    quote:
      '매일 수십 개의 아티클을 읽는데, Linkbrain 덕분에 다시 찾아볼 때 시간이 절반으로 줄었어요. AI 요약이 정말 정확합니다.',
    author: '김서연',
    role: 'Product Designer @ 스타트업',
    initial: 'S',
  },
  {
    quote:
      '리서치할 때 참고 자료를 여기저기 흩뿌려 놓곤 했는데, 이제는 Linkbrain 하나로 전부 해결됩니다. 태그 자동 생성이 특히 좋아요.',
    author: '이준혁',
    role: 'Software Engineer @ 대기업',
    initial: 'J',
  },
  {
    quote:
      '학생 때부터 쓰고 싶었던 도구예요. 논문, 블로그, 유튜브 강의 링크를 한곳에 모아두고 AI로 정리하니까 공부 효율이 확 올랐습니다.',
    author: '박하은',
    role: '대학원생 / 블로거',
    initial: 'H',
  },
];

export function TestimonialsSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32"
      style={{ background: '#0D0D0D' }}
    >
      <motion.div
        className="mx-auto mb-16 max-w-3xl px-4 text-center md:px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionBadge label="Testimonials" />
        <h2
          className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            wordBreak: 'keep-all',
          }}
        >
          사용자들의 이야기
        </h2>
      </motion.div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 md:grid-cols-3 md:px-6">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{
              duration: 0.6,
              delay: 0.1 * i,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="group relative rounded-2xl border border-white/10 bg-[#111] p-8 transition-colors duration-300 hover:border-[#21DBA4]/20 hover:bg-[#111]/80"
          >
            {/* Quote mark */}
            <span
              className="absolute right-6 top-4 text-5xl font-serif leading-none text-[#21DBA4]/10"
              aria-hidden="true"
            >
              &ldquo;
            </span>

            <p
              className="relative text-sm leading-relaxed text-white/60"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {t.quote}
            </p>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#21DBA4]/15 text-sm font-bold text-[#21DBA4]">
                {t.initial}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t.author}</p>
                <p className="text-xs text-white/30">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
