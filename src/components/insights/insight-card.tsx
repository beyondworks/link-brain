'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared card chrome for the insights page.
 * Accent classes are written out literally so Tailwind can see them.
 */
const ACCENTS = {
  primary: {
    wash: 'from-primary/10 to-primary/0',
    icon: 'from-primary/20 to-primary/5',
    text: 'text-primary',
  },
  emerald: {
    wash: 'from-emerald-500/10 to-emerald-500/0',
    icon: 'from-emerald-500/20 to-emerald-500/5',
    text: 'text-emerald-500',
  },
  blue: {
    wash: 'from-blue-500/10 to-blue-500/0',
    icon: 'from-blue-500/20 to-blue-500/5',
    text: 'text-blue-500',
  },
  violet: {
    wash: 'from-violet-500/10 to-violet-500/0',
    icon: 'from-violet-500/20 to-violet-500/5',
    text: 'text-violet-500',
  },
  amber: {
    wash: 'from-amber-500/10 to-amber-500/0',
    icon: 'from-amber-500/20 to-amber-500/5',
    text: 'text-amber-500',
  },
  rose: {
    wash: 'from-rose-500/10 to-rose-500/0',
    icon: 'from-rose-500/20 to-rose-500/5',
    text: 'text-rose-500',
  },
} as const;

export type InsightAccent = keyof typeof ACCENTS;

export function accentClasses(accent: InsightAccent) {
  return ACCENTS[accent];
}

interface InsightCardProps {
  icon: LucideIcon;
  title: string;
  accent: InsightAccent;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function InsightCard({
  icon: Icon,
  title,
  accent,
  action,
  className,
  children,
}: InsightCardProps) {
  const tone = ACCENTS[accent];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card p-5',
        className
      )}
    >
      <div
        className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40', tone.wash)}
      />
      <div className="relative">
        <div className="mb-4 flex items-center gap-2.5">
          <div
            className={cn(
              'icon-glow relative rounded-xl bg-gradient-to-br p-2 ring-1 ring-white/10',
              tone.icon
            )}
          >
            <Icon size={15} className={tone.text} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          {action && <div className="ml-auto">{action}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Empty state used inside insight cards (4-state UX rule). */
export function InsightEmpty({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="py-4 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {hint && <p className="mt-1 text-xs text-foreground-subtle">{hint}</p>}
    </div>
  );
}
