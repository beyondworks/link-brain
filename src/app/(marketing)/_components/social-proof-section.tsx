'use client';

const platforms = ['YouTube', 'Threads', 'Instagram', 'X', 'Pinterest', 'Reddit', 'Web', 'Blog', 'Image', 'Podcast', 'LinkedIn', 'TikTok'];

export function SocialProofSection() {
  // Triple the list for seamless infinite scroll
  const tripled = [...platforms, ...platforms, ...platforms];

  return (
    <div
      className="relative w-full overflow-hidden py-7"
      style={{
        background: 'linear-gradient(-71deg, #C3EBF8 0%, #5DD5C3 49%, #90E0DD 100%)',
      }}
    >
      <div
        className="flex items-center gap-12 w-max animate-[marquee_30s_linear_infinite]"
      >
        {tripled.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="text-white/90 text-[15px] tracking-[-0.3px] whitespace-nowrap select-none"
            style={{ fontFamily: "'Inter', 'Pretendard Variable', sans-serif", fontWeight: 500 }}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
