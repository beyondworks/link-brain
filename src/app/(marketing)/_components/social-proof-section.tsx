'use client';

import { motion } from 'motion/react';

const platforms = ['YouTube', 'Threads', 'Instagram', 'X', 'Pinterest', 'Reddit', 'Web', 'Blog', 'Image', 'Podcast', 'LinkedIn', 'TikTok'];

export function SocialProofSection() {
  // Duplicate the list for seamless loop
  const doubled = [...platforms, ...platforms];

  return (
    <div
      className="relative w-full overflow-hidden py-7"
      style={{
        background: 'linear-gradient(-71deg, #C3EBF8 0%, #5DD5C3 49%, #90E0DD 100%)',
      }}
    >
      <motion.div
        className="flex items-center gap-12 px-8 w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          duration: 25,
          ease: 'linear',
          repeat: Infinity,
        }}
      >
        {doubled.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="text-white/90 text-[15px] tracking-[-0.3px] whitespace-nowrap select-none"
            style={{ fontFamily: "'Inter', 'Pretendard Variable', sans-serif", fontWeight: 500 }}
          >
            {name}
          </span>
        ))}
      </motion.div>

      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#5DD5C3] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#C3EBF8] to-transparent pointer-events-none" />
    </div>
  );
}
