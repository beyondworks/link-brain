'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  reducedMotion: boolean;
}

const HERO_IMAGES = [
  '/images/hero/01.png',
  '/images/hero/02.png',
  '/images/hero/03.png',
];

export function HeroSection({ reducedMotion }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const textRef = useRef<HTMLDivElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(0);

  useEffect(() => {
    // Preload images
    HERO_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = () => setImagesLoaded((p) => p + 1);
    });
  }, []);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const section = sectionRef.current;
      const pin = pinRef.current;
      const text = textRef.current;
      if (!section || !pin || !text) return;

      const isMobile = window.innerWidth < 768;
      if (isMobile) return;

      // Set initial state: only first image visible
      imageRefs.current.forEach((img, i) => {
        if (img) gsap.set(img, { opacity: i === 0 ? 1 : 0 });
      });

      // Text starts hidden
      gsap.set(text.children, { opacity: 0, y: 30 });

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        pin: pin,
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;

          // Image crossfade: 0~40% = img1→img2, 40~70% = img2→img3
          const img1 = imageRefs.current[0];
          const img2 = imageRefs.current[1];
          const img3 = imageRefs.current[2];

          if (p <= 0.4) {
            const t = p / 0.4;
            if (img1) img1.style.opacity = String(1 - t);
            if (img2) img2.style.opacity = String(t);
            if (img3) img3.style.opacity = '0';
          } else if (p <= 0.7) {
            const t = (p - 0.4) / 0.3;
            if (img1) img1.style.opacity = '0';
            if (img2) img2.style.opacity = String(1 - t);
            if (img3) img3.style.opacity = String(t);
          } else {
            if (img1) img1.style.opacity = '0';
            if (img2) img2.style.opacity = '0';
            if (img3) img3.style.opacity = '1';
          }

          // Text fade in: 70~95%
          if (p > 0.65) {
            const textProgress = Math.min((p - 0.65) / 0.3, 1);
            const children = text.children;
            for (let i = 0; i < children.length; i++) {
              const el = children[i] as HTMLElement;
              const stagger = i * 0.08;
              const elP = Math.max(0, Math.min((textProgress - stagger) / (1 - stagger), 1));
              el.style.opacity = String(elP);
              el.style.transform = `translateY(${30 * (1 - elP)}px)`;
            }
          } else {
            const children = text.children;
            for (let i = 0; i < children.length; i++) {
              const el = children[i] as HTMLElement;
              el.style.opacity = '0';
              el.style.transform = 'translateY(30px)';
            }
          }
        },
      });
    },
    { scope: sectionRef, dependencies: [reducedMotion, imagesLoaded] },
  );

  const isMobileSSR = typeof window !== 'undefined' && window.innerWidth < 768;

  // Mobile: simple static layout
  if (isMobileSSR) {
    return (
      <section className="bg-white px-4 pb-16 pt-8">
        <div className="mx-auto max-w-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMAGES[2]} alt="LinkBrain" className="mx-auto h-auto w-3/4" />
          <div className="mt-8 text-center">
            <span className="inline-block rounded-full bg-[#2DD4BF]/10 px-4 py-1.5 text-xs font-semibold text-[#0D9488]">
              AI 세컨드 브레인
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-[#0F172A]" style={{ wordBreak: 'keep-all' }}>
              저장하는 순간,
              <br />
              지식이 됩니다
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[#64748B]" style={{ wordBreak: 'keep-all' }}>
              LinkBrain은 흩어진 링크를 AI로 정리하고
              <br />
              나만의 지식 베이스를 자동으로 만들어줍니다
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Button size="lg" asChild className="w-full rounded-xl bg-[#2DD4BF] px-8 py-4 text-base font-bold text-white hover:bg-[#0D9488]">
                <Link href="/signup" className="flex items-center justify-center gap-2">
                  무료로 시작하기 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Link href="/features" className="text-sm font-medium text-[#64748B] hover:text-[#0D9488]">
                데모 보기 →
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative min-h-[400vh] bg-white">
      <div ref={pinRef} className="relative flex h-screen w-full flex-col items-center justify-center">
        {/* Image sequence container */}
        <div className="relative mx-auto h-[45vh] w-[45vh]">
          {HERO_IMAGES.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              ref={(el) => { imageRefs.current[i] = el; }}
              src={src}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              style={{ opacity: i === 0 ? 1 : 0, transition: 'opacity 0.15s ease' }}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Text below image — fades in at 70% scroll */}
        <div ref={textRef} className="mt-8 text-center">
          <span className="inline-block rounded-full bg-[#2DD4BF]/10 px-4 py-1.5 text-xs font-semibold text-[#0D9488]">
            AI 세컨드 브레인
          </span>
          <h1
            className="mt-5 font-extrabold leading-tight tracking-tight text-[#0F172A]"
            style={{ fontSize: 'clamp(48px, 7vw, 96px)', wordBreak: 'keep-all' }}
          >
            저장하는 순간,
            <br />
            지식이 됩니다
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-[#64748B]" style={{ wordBreak: 'keep-all' }}>
            LinkBrain은 흩어진 링크를 AI로 정리하고
            <br />
            나만의 지식 베이스를 자동으로 만들어줍니다
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button size="lg" asChild className="rounded-xl bg-[#2DD4BF] px-8 py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.03] hover:bg-[#0D9488] hover:shadow-xl">
              <Link href="/signup" className="flex items-center gap-2">
                무료로 시작하기 <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Link href="/features" className="text-sm font-medium text-[#64748B] transition-colors hover:text-[#0D9488]">
              데모 보기 →
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-[#64748B]/50">
          <ChevronDown className="h-6 w-6" />
        </div>
      </div>
    </section>
  );
}
