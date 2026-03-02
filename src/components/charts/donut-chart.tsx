'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  className?: string;
}

export function DonutChart({ segments, size = 80, className }: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0 || segments.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = size * 0.18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Build cumulative offsets for each segment
  let cumulativePercent = 0;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {segments.map((segment, index) => {
          const percent = segment.value / total;
          const dashLength = percent * circumference;
          const rotationOffset = cumulativePercent * circumference;
          cumulativePercent += percent;

          return (
            <circle
              key={segment.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-rotationOffset}
              strokeLinecap="butt"
              opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.4}
              style={{ transition: 'opacity 150ms ease' }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <title>{`${segment.label}: ${segment.value}`}</title>
            </circle>
          );
        })}
      </svg>
      {/* Center total */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold leading-none text-foreground">
          {total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
