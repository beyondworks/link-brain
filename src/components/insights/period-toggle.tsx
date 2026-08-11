'use client';

import { cn } from '@/lib/utils';
import {
  INSIGHTS_PERIODS,
  PERIOD_LABELS,
  PERIOD_RANGE_LABELS,
  type InsightsPeriod,
} from '@/lib/insights/period';

interface PeriodToggleProps {
  value: InsightsPeriod;
  onChange: (period: InsightsPeriod) => void;
  disabled?: boolean;
}

export function PeriodToggle({ value, onChange, disabled }: PeriodToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="인사이트 기간"
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1"
    >
      {INSIGHTS_PERIODS.map((period) => {
        const active = period === value;
        return (
          <button
            key={period}
            type="button"
            role="tab"
            aria-selected={active}
            title={PERIOD_RANGE_LABELS[period]}
            disabled={disabled}
            onClick={() => onChange(period)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50',
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {PERIOD_LABELS[period]}
          </button>
        );
      })}
    </div>
  );
}
