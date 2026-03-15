'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

// ── IndexedDB helpers ──────────────────────────────────────────────────────
const IDB_NAME = 'linkbrain';
const IDB_STORE = 'hero';
const IDB_KEY = 'video';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE))
        db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveBlob(blob: Blob) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(blob, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadBlob(): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ── PingPongVideo ──────────────────────────────────────────────────────────
function PingPongVideo({ src, className = '' }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return;

    let dead = false;
    let raf = 0;
    let frames: ImageBitmap[] = [];

    const ctx = canvas.getContext('2d', { alpha: false })!;

    const vid = document.createElement('video');
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = 'auto';
    vid.src = src;

    const capture = (): Promise<number> =>
      new Promise((done) => {
        vid.addEventListener(
          'loadedmetadata',
          () => {
            const MAX_W = 960;
            const scale = Math.min(1, MAX_W / vid.videoWidth);
            canvas.width = Math.round(vid.videoWidth * scale);
            canvas.height = Math.round(vid.videoHeight * scale);

            const dur = vid.duration;
            let settled = false;
            const finish = () => {
              if (!settled) {
                settled = true;
                done(dur);
              }
            };

            if ('requestVideoFrameCallback' in (vid as unknown as Record<string, unknown>)) {
              const pending: Promise<ImageBitmap>[] = [];

              const onFrame = () => {
                if (dead) { finish(); return; }
                ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                pending.push(createImageBitmap(canvas));
                setPct(Math.round((vid.currentTime / dur) * 100));

                if (vid.ended || vid.currentTime >= dur - 0.05) {
                  Promise.all(pending).then((b) => {
                    frames = b;
                    finish();
                  });
                } else {
                  (vid as unknown as Record<string, (cb: () => void) => void>).requestVideoFrameCallback(onFrame);
                }
              };

              vid.addEventListener(
                'ended',
                () => Promise.all(pending).then((b) => { frames = b; finish(); }),
                { once: true }
              );

              (vid as unknown as Record<string, (cb: () => void) => void>).requestVideoFrameCallback(onFrame);
              vid.playbackRate = 2;
              vid.play().catch(finish);
            } else {
              const FPS = 20;
              const pending: Promise<ImageBitmap>[] = [];
              const id = setInterval(() => {
                if (dead) { clearInterval(id); finish(); return; }
                ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                pending.push(createImageBitmap(canvas));
                setPct(Math.round((vid.currentTime / dur) * 100));
              }, 1000 / FPS);

              vid.addEventListener(
                'ended',
                () => {
                  clearInterval(id);
                  Promise.all(pending).then((b) => { frames = b; finish(); });
                },
                { once: true }
              );
              vid.play().catch(() => { clearInterval(id); finish(); });
            }
          },
          { once: true }
        );
        vid.load();
      });

    const play = (dur: number) => {
      if (dead || frames.length < 2) return;
      setLoading(false);

      const mspf = (dur * 1000) / frames.length;
      let fi = 0;
      let dir = 1;
      let last = 0;

      const loop = (ts: number) => {
        if (dead) return;
        raf = requestAnimationFrame(loop);
        if (ts - last < mspf) return;
        last = ts;

        ctx.drawImage(frames[fi], 0, 0, canvas.width, canvas.height);

        fi += dir;
        if (fi >= frames.length) { fi = frames.length - 2; dir = -1; }
        else if (fi < 0) { fi = 1; dir = 1; }
      };

      raf = requestAnimationFrame(loop);
    };

    capture().then((dur) => {
      vid.src = '';
      if (!dead) play(dur);
    });

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      vid.pause();
      vid.src = '';
      frames.forEach((b) => b.close());
      frames = [];
    };
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {loading && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
          style={{
            background: 'rgba(4,6,14,0.52)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          <p
            style={{
              color: 'rgba(255,255,255,0.88)',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Pretendard Variable', sans-serif",
              letterSpacing: '-0.2px',
            }}
          >
            역재생 준비 중&nbsp;&nbsp;{pct}%
          </p>
          <div
            style={{
              width: 140,
              height: 2,
              borderRadius: 9,
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                borderRadius: 9,
                background: 'linear-gradient(90deg, #21DBA4, #5BC8E8)',
                transition: 'width 80ms linear',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── VideoMorphCanvas ───────────────────────────────────────────────────────
function VideoMorphCanvas({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 28, stiffness: 65, mass: 1 });
  const springY = useSpring(mouseY, { damping: 28, stiffness: 65, mass: 1 });

  const rotateX = useTransform(springY, [-0.5, 0.5], ['9deg', '-9deg']);
  const rotateY = useTransform(springX, [-0.5, 0.5], ['-9deg', '9deg']);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const infinityPath =
    'M 200 100 C 130 30, 30 30, 30 100 C 30 170, 130 170, 200 100 C 270 30, 370 30, 370 100 C 370 170, 270 170, 200 100 Z';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1100px' }}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative flex items-center justify-center"
      >
        {/* Layer 1: Deep outer atmospheric halo */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 'clamp(480px, 75vw, 820px)',
            height: 'clamp(480px, 75vw, 820px)',
            background:
              'radial-gradient(circle, rgba(195,235,248,0.55) 0%, rgba(195,235,248,0.22) 42%, rgba(195,235,248,0.06) 68%, transparent 85%)',
            filter: 'blur(72px)',
            transform: 'translateZ(-60px)',
          }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Layer 2: Mid glow ring */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 'clamp(340px, 56vw, 600px)',
            height: 'clamp(340px, 56vw, 600px)',
            background:
              'radial-gradient(circle, transparent 40%, rgba(195,235,248,0.35) 65%, rgba(195,235,248,0.12) 85%, transparent 100%)',
            filter: 'blur(30px)',
            transform: 'translateZ(-20px)',
          }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Layer 3: Main glass orb */}
        <motion.div
          style={{
            position: 'relative',
            width: 'clamp(280px, 46vw, 520px)',
            height: 'clamp(280px, 46vw, 520px)',
            borderRadius: '50%',
            transformStyle: 'preserve-3d',
          }}
          animate={{ scale: [1, 1.018, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Glass body */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 43% 37%, rgba(255,255,255,0.97) 0%, rgba(225,245,253,0.82) 24%, rgba(195,235,248,0.6) 50%, rgba(195,235,248,0.28) 74%, rgba(195,235,248,0.06) 92%, transparent 100%)',
              backdropFilter: 'blur(22px)',
              WebkitBackdropFilter: 'blur(22px)',
              boxShadow:
                'inset 0 2px 0 rgba(255,255,255,0.92), inset 0 0 80px rgba(255,255,255,0.28), 0 20px 80px rgba(195,235,248,0.55)',
            }}
          />

          {/* Glass rim */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px solid rgba(195,235,248,0.45)',
              pointerEvents: 'none',
            }}
          />

          {/* Upper-left surface highlight */}
          <div
            style={{
              position: 'absolute',
              top: '5%',
              left: '10%',
              width: '62%',
              height: '42%',
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse at 52% 28%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.4) 35%, transparent 70%)',
              filter: 'blur(10px)',
              pointerEvents: 'none',
            }}
          />

          {/* Lower edge subtle fill */}
          <div
            style={{
              position: 'absolute',
              bottom: '5%',
              left: '20%',
              width: '60%',
              height: '30%',
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse, rgba(195,235,248,0.22) 0%, transparent 70%)',
              filter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          />

          {/* Infinity / Lemniscate SVG path */}
          <svg
            viewBox="0 0 400 200"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '74%',
              height: 'auto',
              overflow: 'visible',
            }}
          >
            <defs>
              <linearGradient
                id="vmcPathGrad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#21DBA4" />
                <stop offset="45%" stopColor="#5BC8E8" />
                <stop offset="100%" stopColor="#21DBA4" />
              </linearGradient>

              <filter
                id="vmcNeonGlow"
                x="-30%"
                y="-80%"
                width="160%"
                height="260%"
              >
                <feGaussianBlur
                  stdDeviation="5"
                  result="outerBlur"
                  in="SourceGraphic"
                />
                <feGaussianBlur
                  stdDeviation="2"
                  result="innerBlur"
                  in="SourceGraphic"
                />
                <feMerge>
                  <feMergeNode in="outerBlur" />
                  <feMergeNode in="innerBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter
                id="vmcDotGlow"
                x="-60%"
                y="-200%"
                width="220%"
                height="500%"
              >
                <feGaussianBlur
                  stdDeviation="4"
                  result="blur"
                  in="SourceGraphic"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Faint base track */}
            <path
              d={infinityPath}
              fill="none"
              stroke="rgba(195,235,248,0.22)"
              strokeWidth="1.5"
            />

            {/* Main animated teal stroke */}
            <motion.path
              d={infinityPath}
              fill="none"
              stroke="url(#vmcPathGrad)"
              strokeWidth="5.5"
              strokeLinecap="round"
              filter="url(#vmcNeonGlow)"
              initial={{ pathLength: 0.42, pathOffset: 0 }}
              animate={{ pathOffset: [0, 1] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }}
            />

            {/* Reverse chaser */}
            <motion.path
              d={infinityPath}
              fill="none"
              stroke="rgba(33,219,164,0.55)"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ mixBlendMode: 'screen' }}
              initial={{ pathLength: 0.18, pathOffset: 0.5 }}
              animate={{ pathOffset: [0.5, 1.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />

            {/* Bright white sparkle dot */}
            <motion.path
              d={infinityPath}
              fill="none"
              stroke="rgba(255,255,255,0.96)"
              strokeWidth="10"
              strokeLinecap="round"
              filter="url(#vmcDotGlow)"
              initial={{ pathLength: 0.022, pathOffset: 0 }}
              animate={{ pathOffset: [0, 1] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }}
            />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const objUrlRef = useRef<string | null>(null);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load persisted video on mount
  useEffect(() => {
    loadBlob()
      .then((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        objUrlRef.current = url;
        setVideoSrc(url);
      })
      .catch(() => {});

    return () => {
      if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
    };
  }, []);

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

  // File handling
  const processFile = async (file: File) => {
    if (!file.type.startsWith('video/')) return;
    if (objUrlRef.current) {
      URL.revokeObjectURL(objUrlRef.current);
      objUrlRef.current = null;
    }
    await saveBlob(file).catch(() => {});
    const url = URL.createObjectURL(file);
    objUrlRef.current = url;
    setVideoSrc(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragOver(true);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragLeave = () => {
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full bg-white">
      {/* VISUAL SECTION */}
      <section
        ref={sectionRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative w-full flex items-center justify-center overflow-hidden"
        style={{
          minHeight: '72vh',
          paddingTop: videoSrc ? 0 : '4rem',
          background: videoSrc
            ? 'transparent'
            : 'linear-gradient(to bottom, #e6f3f8 0%, #edf7fb 20%, #f4fafc 55%, #ffffff 100%)',
        }}
      >
        {/* Mouse-reactive glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-0"
          style={{ background: mouseGlow }}
        />

        {/* Canvas ping-pong video (when uploaded) */}
        {videoSrc && (
          <motion.div
            key="video-fullbleed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 w-full h-full z-10"
          >
            <PingPongVideo src={videoSrc} className="w-full h-full" />
            {/* Soft bottom fade into text section */}
            <div
              className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-10"
              style={{
                background:
                  'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.88) 100%)',
              }}
            />
          </motion.div>
        )}

        {/* Glass orb (no video) */}
        {!videoSrc && (
          <motion.div
            key="orb"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[860px] mx-auto px-4 sm:px-8 z-10"
          >
            <div
              className="relative w-full"
              style={{ minHeight: '380px', aspectRatio: '21 / 9' }}
            >
              <VideoMorphCanvas className="absolute inset-0 w-full h-full" />
            </div>
          </motion.div>
        )}

        {/* Drag-over overlay */}
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-30 flex items-center justify-center"
            style={{
              background: 'rgba(195,235,248,0.25)',
              border: '2px dashed rgba(33,219,164,0.6)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <p
              style={{
                color: '#21DBA4',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "'Pretendard Variable', sans-serif",
              }}
            >
              여기에 놓으세요
            </p>
          </motion.div>
        )}

        {/* Upload button (only when no video stored) */}
        {!videoSrc && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#21DBA4]/20 active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(12px)',
                border: '1px dashed rgba(33,219,164,0.45)',
                color: '#5a9a8e',
                fontFamily: "'Pretendard Variable', sans-serif",
                fontWeight: 500,
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              영상 업로드
              <span className="opacity-50 text-[11px]">또는 드래그</span>
            </button>
          </motion.div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />
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
              href="#"
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
              href="#pricing"
              className="px-7 py-3 rounded-full text-[15px] text-[#666] border border-[#e5e5e5] hover:border-[#21DBA4]/50 hover:text-[#21DBA4] transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
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
