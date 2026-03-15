'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { ArrowRight, Play } from 'lucide-react';

const LOGO_ICON_PATH =
  'M41.0994 29.4896C48.8095 29.4896 55.0602 23.1121 55.0602 15.245L55.0558 14.8771C54.8647 7.17988 48.6891 1 41.0994 1L40.7394 1.00454C35.0535 1.1515 30.2128 4.76731 28.1731 9.85522C26.0683 4.6602 21.0121 1.00003 15.1091 1L14.7449 1.00454C7.121 1.19956 1 7.50069 1 15.245C1.00007 23.1121 7.31691 29.4896 15.1091 29.4896C21.0119 29.4896 26.068 25.8298 28.173 20.6352C30.2558 25.8298 35.2588 29.4896 41.0994 29.4896ZM15.1091 21.0898C11.9118 21.0896 9.31991 18.4728 9.31984 15.245C9.31985 12.0169 11.9118 9.39993 15.1091 9.39987C18.3063 9.3999 20.8984 12.0169 20.8984 15.245C20.8984 18.473 18.3063 21.0896 15.1091 21.0898ZM41.0994 21.0898C37.9358 21.0896 35.3713 18.4728 35.3713 15.245C35.3713 12.0169 37.9358 9.39998 41.0994 9.39987C44.2631 9.39987 46.828 12.0169 46.828 15.245C46.8279 18.473 44.2631 21.0898 41.0994 21.0898Z';

/* ---------- IndexedDB cache helpers ---------- */
const DB_NAME = 'linkbrain-hero-cache';
const STORE_NAME = 'videos';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCachedBlob(key: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setCachedBlob(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, key);
  } catch {
    // silently ignore
  }
}

/* ---------- Infinity symbol animation ---------- */
function InfinityOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    let t = 0;
    const cx = size / 2;
    const cy = size / 2;
    const a = 70;
    const b = 40;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);

      // Glow background
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
      glow.addColorStop(0, 'rgba(33, 219, 164, 0.15)');
      glow.addColorStop(0.5, 'rgba(33, 219, 164, 0.05)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // Draw infinity path (lemniscate of Bernoulli)
      ctx.beginPath();
      for (let i = 0; i <= 360; i++) {
        const rad = (i * Math.PI) / 180;
        const denominator = 1 + Math.sin(rad) * Math.sin(rad);
        const x = cx + (a * Math.cos(rad)) / denominator;
        const y = cy + (b * Math.sin(rad) * Math.cos(rad)) / denominator;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(33, 219, 164, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Animated dot
      const dotRad = (t * Math.PI) / 180;
      const dotDenom = 1 + Math.sin(dotRad) * Math.sin(dotRad);
      const dotX = cx + (a * Math.cos(dotRad)) / dotDenom;
      const dotY = cy + (b * Math.sin(dotRad) * Math.cos(dotRad)) / dotDenom;

      const dotGlow = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 20);
      dotGlow.addColorStop(0, 'rgba(33, 219, 164, 0.8)');
      dotGlow.addColorStop(0.5, 'rgba(33, 219, 164, 0.3)');
      dotGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = dotGlow;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#21DBA4';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();

      t = (t + 0.8) % 360;
      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 m-auto" />;
}

/* ---------- PingPong Video Canvas ---------- */
function PingPongVideo({ file }: { file: File }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let url: string | null = null;

    async function setup() {
      // Try cache first
      const cacheKey = `${file.name}-${file.size}`;
      let blob = await getCachedBlob(cacheKey);
      if (!blob) {
        blob = file;
        await setCachedBlob(cacheKey, file);
      }

      url = URL.createObjectURL(blob);
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;

      video.addEventListener('loadedmetadata', () => {
        if (!canvas || !ctx) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 280 * dpr;
        canvas.height = 280 * dpr;
        canvas.style.width = '280px';
        canvas.style.height = '280px';
        ctx.scale(dpr, dpr);

        video.play();

        function render() {
          if (!ctx) return;
          ctx.clearRect(0, 0, 280, 280);

          // Circular clip
          ctx.save();
          ctx.beginPath();
          ctx.arc(140, 140, 120, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(video, 10, 10, 260, 260);
          ctx.restore();

          // Border ring
          ctx.beginPath();
          ctx.arc(140, 140, 120, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(33, 219, 164, 0.4)';
          ctx.lineWidth = 2;
          ctx.stroke();

          animRef.current = requestAnimationFrame(render);
        }
        render();
      });
    }
    setup();

    return () => {
      cancelAnimationFrame(animRef.current);
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  return <canvas ref={canvasRef} className="absolute inset-0 m-auto" />;
}

/* ---------- Main Hero Section ---------- */
export function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const glowX = useTransform(mouseX, (v) => v - 200);
  const glowY = useTransform(mouseY, (v) => v - 200);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = sectionRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-20"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(33,219,164,0.08) 0%, #090909 60%, #000 100%)',
      }}
      onMouseMove={handleMouseMove}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
    >
      {/* Mouse-reactive glow */}
      <motion.div
        className="pointer-events-none absolute h-[400px] w-[400px] rounded-full opacity-30"
        style={{
          x: glowX,
          y: glowY,
          background:
            'radial-gradient(circle, rgba(33,219,164,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Glass orb area */}
      <motion.div
        className="relative mb-12 h-[280px] w-[280px]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Glass sphere background */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.08) 0%, rgba(33,219,164,0.05) 40%, transparent 70%)',
            boxShadow:
              'inset 0 0 60px rgba(33,219,164,0.1), 0 0 80px rgba(33,219,164,0.08)',
          }}
        />

        <AnimatePresence mode="wait">
          {videoFile ? (
            <motion.div
              key="video"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <PingPongVideo file={videoFile} />
            </motion.div>
          ) : (
            <motion.div
              key="infinity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <InfinityOrb />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center rounded-full border-2 border-dashed border-[#21DBA4]/60 bg-[#21DBA4]/10 backdrop-blur-sm"
            >
              <div className="text-center">
                <Play className="mx-auto h-8 w-8 text-[#21DBA4]" />
                <p className="mt-2 text-xs font-medium text-[#21DBA4]">
                  영상을 놓아주세요
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Text content */}
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <span
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-white/60 backdrop-blur-sm"
          >
            <svg
              width="16"
              height="10"
              viewBox="0 0 56 31"
              fill="none"
              className="opacity-70"
            >
              <path d={LOGO_ICON_PATH} fill="#21DBA4" />
            </svg>
            Your Second Brain
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="mt-8 text-5xl font-extrabold leading-tight tracking-tight text-white md:text-7xl"
          style={{ fontFamily: "'Pretendard Variable', sans-serif", wordBreak: 'keep-all' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          저장하는 순간,
          <br />
          <span
            style={{
              background: 'linear-gradient(90deg, #21DBA4 0%, #5BD6C3 50%, #C5EAF6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            지식이 됩니다
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-white/50"
          style={{ fontFamily: "'Pretendard Variable', sans-serif", wordBreak: 'keep-all' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
        >
          URL 하나면 충분합니다. AI가 자동으로 분석하고, 정리하고, 연결합니다.
          흩어진 링크가 나만의 지식 베이스로.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
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
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-medium text-white/70 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            로그인
          </Link>
        </motion.div>

        {/* Video drop hint */}
        {!videoFile && (
          <motion.p
            className="mt-8 text-xs text-white/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            영상을 드래그해 올려보세요
          </motion.p>
        )}
      </div>
    </section>
  );
}
