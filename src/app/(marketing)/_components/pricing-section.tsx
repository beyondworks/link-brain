'use client';

import { useRef, useState } from 'react';
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

// ── Data ───────────────────────────────────────────────────────────────────
const plans = [
  {
    id: 'free',
    name: '프리',
    tagline: '개인 사용에 딱 맞는 기본 플랜',
    price: { monthly: 0, yearly: 0 },
    unit: '영구 무료',
    cta: '무료로 시작하기',
    ctaStyle: 'outline',
    featured: false,
    features: [
      { text: '클립 100개' },
      { text: 'AI 분석 월 100회' },
      { text: '컬렉션 5개' },
      { text: 'Content Studio 월 10회' },
      { text: '기본 검색' },
      { text: '커뮤니티 접근' },
    ],
  },
  {
    id: 'pro',
    name: '프로',
    tagline: '파워 유저를 위한 프리미엄 기능',
    price: { monthly: 9900, yearly: 7900 },
    unit: '/ 월',
    cta: '프로 시작하기',
    ctaStyle: 'fill',
    featured: true,
    features: [
      { text: '클립 무제한' },
      { text: '컬렉션 무제한' },
      { text: 'AI 분석 월 500회' },
      { text: 'Content Studio 월 100회' },
      { text: '시멘틱 검색 + 인사이트' },
      { text: 'API 키 1개' },
    ],
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────
function CheckIcon({ featured }: { featured: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <circle
        cx="7.5"
        cy="7.5"
        r="7"
        fill={featured ? 'rgba(33,219,164,0.15)' : 'rgba(0,0,0,0.05)'}
      />
      <path
        d="M4.5 7.5L6.5 9.5L10.5 5.5"
        stroke={featured ? '#21DBA4' : '#999'}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  name: string;
  tagline: string;
  price: { monthly: number; yearly: number };
  unit: string;
  cta: string;
  ctaStyle: string;
  featured: boolean;
  features: { text: string }[];
}

function PlanCard({
  plan,
  yearly,
  delay,
  inView,
}: {
  plan: Plan;
  yearly: boolean;
  delay: number;
  inView: boolean;
}) {
  const displayPrice = yearly ? plan.price.yearly : plan.price.monthly;
  const isFree = plan.price.monthly === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
      className="relative flex flex-col rounded-[28px] p-8 overflow-hidden"
      style={
        plan.featured
          ? {
              background: 'linear-gradient(148deg, #f0fdf9 0%, #e8f9f5 60%, #e0f7f9 100%)',
              border: '1.5px solid rgba(33,219,164,0.3)',
              boxShadow:
                '0 0 0 1px rgba(33,219,164,0.08), 0 8px 40px rgba(33,219,164,0.10), 0 2px 8px rgba(0,0,0,0.04)',
            }
          : {
              background: '#fafafa',
              border: '1.5px solid rgba(0,0,0,0.07)',
              boxShadow: '0 2px 20px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03)',
            }
      }
    >
      {/* Featured glow */}
      {plan.featured && (
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(33,219,164,0.12) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Recommended badge */}
      {plan.featured && (
        <div className="absolute top-6 right-6">
          <span
            className="px-3 py-1 rounded-full text-[11px] text-white tracking-[0.4px]"
            style={{
              background: 'linear-gradient(90deg, #21DBA4, #5BC8E8)',
              fontFamily: "'Pretendard Variable', sans-serif",
              fontWeight: 600,
            }}
          >
            추천
          </span>
        </div>
      )}

      {/* Plan name & tagline */}
      <div className="mb-6">
        <p
          className="text-[13px] tracking-[0.4px] uppercase mb-1.5"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            fontWeight: 600,
            color: plan.featured ? '#21DBA4' : '#aaa',
          }}
        >
          {plan.name}
        </p>
        <p
          className="text-[14px] leading-[1.6]"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            fontWeight: 400,
            color: '#888',
          }}
        >
          {plan.tagline}
        </p>
      </div>

      {/* Price */}
      <div className="mb-7 flex items-end gap-1.5">
        {isFree ? (
          <span
            className="text-[42px] tracking-[-2px] text-[#111]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 800 }}
          >
            무료
          </span>
        ) : (
          <>
            <span
              className="text-[42px] tracking-[-2px] leading-none"
              style={{
                fontFamily: "'Pretendard Variable', sans-serif",
                fontWeight: 800,
                background: 'linear-gradient(118deg, #21DBA4 0%, #5BC8E8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {displayPrice.toLocaleString()}원
            </span>
            <span
              className="text-[14px] text-[#bbb] mb-2"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {plan.unit}
            </span>
          </>
        )}
      </div>

      {/* CTA Button */}
      {plan.ctaStyle === 'fill' ? (
        <motion.a
          href="/signup?plan=pro"
          whileTap={{ scale: 0.97 }}
          className="relative mb-7 w-full py-3 rounded-full text-[14px] text-white text-center overflow-hidden group"
          style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 600 }}
        >
          <span
            className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-90"
            style={{ background: 'linear-gradient(100deg, #21DBA4 0%, #5DD5C3 100%)' }}
          />
          <span
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)' }}
          />
          <span className="relative">{plan.cta}</span>
        </motion.a>
      ) : (
        <motion.a
          href="/signup"
          whileTap={{ scale: 0.97 }}
          className="mb-7 w-full py-3 rounded-full text-[14px] text-center border transition-all duration-200 hover:border-[#21DBA4]/50 hover:text-[#1A9E7A]"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            fontWeight: 500,
            borderColor: 'rgba(0,0,0,0.1)',
            color: '#666',
          }}
        >
          {plan.cta}
        </motion.a>
      )}

      {/* Divider */}
      <div
        className="w-full h-px mb-7"
        style={{
          background: plan.featured
            ? 'linear-gradient(90deg, rgba(33,219,164,0.2), rgba(91,200,232,0.2))'
            : 'rgba(0,0,0,0.06)',
        }}
      />

      {/* Feature list */}
      <ul className="flex flex-col gap-3.5">
        {plan.features.map((f) => (
          <li key={f.text} className="flex items-start gap-2.5">
            <CheckIcon featured={plan.featured} />
            <span
              className="text-[14px] leading-[1.5]"
              style={{
                fontFamily: "'Pretendard Variable', sans-serif",
                fontWeight: 400,
                color: plan.featured ? '#333' : '#777',
              }}
            >
              {f.text}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [yearly, setYearly] = useState(false);

  return (
    <section
      id="pricing"
      ref={ref}
      className="relative py-28 overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      {/* Subtle background orbs */}
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[420px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(33,219,164,0.055) 0%, transparent 70%)',
          filter: 'blur(2px)',
        }}
      />

      <div className="relative max-w-[1100px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center mb-14"
        >
          <SectionBadge label="Pricing" />

          <h2
            className="mt-5 text-[clamp(32px,4.5vw,52px)] tracking-[-2px] leading-[1.18] text-[#111]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 800 }}
          >
            간단하고 투명한 요금제
          </h2>
          <p
            className="mt-4 text-[16px] text-[#999] tracking-[-0.3px]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            지금 무료로 시작하고, 필요할 때 업그레이드하세요.
          </p>

          {/* Billing toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex items-center gap-3"
          >
            <span
              className="text-[13px] transition-colors duration-200"
              style={{
                fontFamily: "'Pretendard Variable', sans-serif",
                fontWeight: 500,
                color: !yearly ? '#111' : '#bbb',
              }}
            >
              월간
            </span>

            <button
              onClick={() => setYearly(!yearly)}
              className="relative w-[44px] h-[24px] rounded-full transition-colors duration-300 focus:outline-none"
              style={{
                background: yearly
                  ? 'linear-gradient(90deg, #21DBA4, #5DD5C3)'
                  : 'rgba(0,0,0,0.1)',
              }}
            >
              <motion.div
                animate={{ x: yearly ? 22 : 2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm"
              />
            </button>

            <span
              className="text-[13px] flex items-center gap-1.5 transition-colors duration-200"
              style={{
                fontFamily: "'Pretendard Variable', sans-serif",
                fontWeight: 500,
                color: yearly ? '#111' : '#bbb',
              }}
            >
              연간
              <span
                className="px-2 py-0.5 rounded-full text-[11px] text-white"
                style={{
                  background: 'linear-gradient(90deg, #21DBA4, #5BC8E8)',
                  fontWeight: 600,
                  opacity: yearly ? 1 : 0.4,
                  transition: 'opacity 0.2s',
                }}
              >
                20% 할인
              </span>
            </span>
          </motion.div>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[780px] mx-auto">
          {plans.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              yearly={yearly}
              delay={0.12 + i * 0.12}
              inView={inView}
            />
          ))}
        </div>

        {/* Fine print */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-10 text-center text-[13px] text-[#ccc]"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          카드 등록 불필요&nbsp;&nbsp;&middot;&nbsp;&nbsp;즉시 사용 가능&nbsp;&nbsp;&middot;&nbsp;&nbsp;언제든 취소
        </motion.p>
      </div>
    </section>
  );
}
