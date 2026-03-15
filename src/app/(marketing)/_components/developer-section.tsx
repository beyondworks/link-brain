'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Smartphone, Globe, Terminal } from 'lucide-react';

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

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/clips', color: '#22c55e', description: '클립 목록 조회' },
  { method: 'POST', path: '/api/v1/clips', color: '#3b82f6', description: '새 클립 생성' },
  { method: 'PUT', path: '/api/v1/clips/:id', color: '#f59e0b', description: '클립 수정' },
  { method: 'DELETE', path: '/api/v1/clips/:id', color: '#ef4444', description: '클립 삭제' },
];

function ApiEndpointCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111]">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <Terminal className="h-4 w-4 text-[#21DBA4]" />
        <span className="text-xs font-medium text-white/50">REST API</span>
      </div>
      <div className="divide-y divide-white/5 p-1">
        {API_ENDPOINTS.map((ep) => (
          <div key={`${ep.method}-${ep.path}`} className="flex items-center gap-3 px-4 py-3">
            <span
              className="w-16 rounded-md px-2 py-0.5 text-center text-[10px] font-bold"
              style={{ backgroundColor: `${ep.color}20`, color: ep.color }}
            >
              {ep.method}
            </span>
            <code className="flex-1 text-xs text-white/60">{ep.path}</code>
            <span className="hidden text-[11px] text-white/30 sm:block">
              {ep.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111]">
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <Smartphone className="h-4 w-4 text-[#21DBA4]" />
        <span className="text-xs font-medium text-white/50">PWA & Mobile</span>
      </div>
      <div className="flex items-center justify-center p-8">
        {/* Phone mockup */}
        <div className="relative h-[200px] w-[100px] rounded-2xl border-2 border-white/15 bg-[#1a1a1a] p-2">
          {/* Notch */}
          <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-white/20" />
          {/* Screen content */}
          <div className="space-y-2 rounded-lg bg-[#0d0d0d] p-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-[#21DBA4]/15" />
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 w-full rounded bg-white/10" />
                  <div className="h-1 w-2/3 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
          {/* Bottom bar */}
          <div className="mt-2 flex justify-center gap-4">
            <div className="h-1 w-1 rounded-full bg-white/20" />
            <div className="h-1 w-1 rounded-full bg-[#21DBA4]/50" />
            <div className="h-1 w-1 rounded-full bg-white/20" />
          </div>
        </div>
        {/* Labels */}
        <div className="ml-6 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#21DBA4]/60" />
            <span className="text-xs text-white/40">오프라인 지원</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-[#21DBA4]/60" />
            <span className="text-xs text-white/40">홈 화면 추가</span>
          </div>
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[#21DBA4]/60" />
            <span className="text-xs text-white/40">푸시 알림</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DeveloperSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32"
      style={{ background: '#050505' }}
    >
      <motion.div
        className="mx-auto mb-16 max-w-3xl px-4 text-center md:px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionBadge label="For Developers" />
        <h2
          className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl"
          style={{
            fontFamily: "'Pretendard Variable', sans-serif",
            wordBreak: 'keep-all',
          }}
        >
          개발자를 위한 확장성
        </h2>
        <p className="mt-4 text-lg text-white/40">
          REST API와 PWA로 어디서든 연결하세요
        </p>
      </motion.div>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 md:grid-cols-2 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <ApiEndpointCard />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <MobileCard />
        </motion.div>
      </div>
    </section>
  );
}
