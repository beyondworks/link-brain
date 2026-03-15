'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Globe, Youtube, Twitter, BookOpen, Rss, FileText } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface SocialProofSectionProps {
  reducedMotion: boolean;
}

const PLATFORMS = [
  { icon: Globe, name: 'Chrome' },
  { icon: Youtube, name: 'YouTube' },
  { icon: Twitter, name: 'Twitter' },
  { icon: BookOpen, name: 'Notion' },
  { icon: Rss, name: 'RSS' },
  { icon: FileText, name: 'PDF' },
  { icon: Globe, name: '블로그' },
  { icon: Youtube, name: 'YouTube' },
  { icon: Twitter, name: 'Threads' },
  { icon: BookOpen, name: 'Notion' },
  { icon: Rss, name: 'RSS' },
  { icon: FileText, name: 'PDF' },
];

export function SocialProofSection({ reducedMotion }: SocialProofSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (reducedMotion || !counterRef.current) return;

      gsap.fromTo(
        counterRef.current,
        { innerText: '0' },
        {
          innerText: 12847,
          duration: 2,
          ease: 'power2.out',
          snap: { innerText: 1 },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        },
      );
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  return (
    <section ref={sectionRef} className="overflow-hidden bg-[#2DD4BF] py-6">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <p className="text-sm font-semibold text-white" style={{ wordBreak: 'keep-all' }}>
          현재{' '}
          <span ref={counterRef} className="tabular-nums">
            {reducedMotion ? '12,847' : '0'}
          </span>
          명이 LinkBrain으로 지식을 쌓고 있습니다
        </p>
      </div>

      {/* Marquee */}
      <div className="mt-4 flex gap-8 overflow-hidden whitespace-nowrap">
        <div className="flex shrink-0 animate-[marquee_20s_linear_infinite] gap-8">
          {PLATFORMS.map((platform, i) => (
            <div key={i} className="flex items-center gap-2 text-white/70">
              <platform.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{platform.name}</span>
            </div>
          ))}
        </div>
        <div className="flex shrink-0 animate-[marquee_20s_linear_infinite] gap-8" aria-hidden="true">
          {PLATFORMS.map((platform, i) => (
            <div key={i} className="flex items-center gap-2 text-white/70">
              <platform.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{platform.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
