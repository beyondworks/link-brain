'use client';

import { useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface FinalCtaSectionProps {
  reducedMotion: boolean;
}

export function FinalCtaSection({ reducedMotion }: FinalCtaSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const section = sectionRef.current;
      if (!section) return;

      gsap.fromTo(
        section.querySelectorAll('.cta-animate'),
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.12,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        },
      );
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  return (
    <section
      ref={sectionRef}
      className="py-28 text-center md:py-36"
      style={{ background: 'linear-gradient(180deg, #F8FFFE 0%, #E6FFFB 50%, #F8FFFE 100%)' }}
    >
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <h2 className="cta-animate text-4xl font-extrabold tracking-tight text-[#0F172A] md:text-5xl" style={{ wordBreak: 'keep-all' }}>
          지금 바로 시작하세요
        </h2>
        <p className="cta-animate mt-5 text-lg text-[#64748B]" style={{ wordBreak: 'keep-all' }}>
          무료로 가입하고 첫 100개 링크를 저장해보세요
        </p>
        <div className="cta-animate mt-10">
          <Button
            size="lg"
            asChild
            className="rounded-xl bg-[#2DD4BF] px-10 py-5 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.03] hover:bg-[#0D9488] hover:shadow-xl"
          >
            <Link href="/signup" className="flex items-center gap-2">
              무료로 시작하기 <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
