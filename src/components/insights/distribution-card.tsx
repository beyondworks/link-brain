'use client';

import dynamic from 'next/dynamic';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART_PALETTE } from '@/config/constants';
import { InsightCard, InsightEmpty, type InsightAccent } from './insight-card';

const DonutChart = dynamic(
  () => import('@/components/charts/donut-chart').then((m) => m.DonutChart),
  {
    ssr: false,
    loading: () => <Skeleton className="size-18 shrink-0 rounded-full" />,
  }
);

export interface DistributionSlice {
  label: string;
  count: number;
}

interface DistributionCardProps {
  icon: LucideIcon;
  title: string;
  accent: InsightAccent;
  slices: DistributionSlice[];
  emptyMessage: string;
  emptyHint?: string;
  capitalizeLabels?: boolean;
}

export function DistributionCard({
  icon,
  title,
  accent,
  slices,
  emptyMessage,
  emptyHint,
  capitalizeLabels,
}: DistributionCardProps) {
  const top = slices.slice(0, 5);
  const max = Math.max(1, ...top.map((s) => s.count));

  return (
    <InsightCard icon={icon} title={title} accent={accent}>
      {top.length > 0 ? (
        <div className="flex items-start gap-4">
          <DonutChart
            segments={top.map((slice, idx) => ({
              value: slice.count,
              label: slice.label,
              color: CHART_PALETTE[idx % CHART_PALETTE.length],
            }))}
            size={72}
            className="shrink-0"
          />
          <ol className="flex-1 space-y-2">
            {top.map((slice, idx) => (
              <li key={slice.label} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`flex min-w-0 items-center gap-1.5 text-sm font-medium ${
                      capitalizeLabels ? 'capitalize' : ''
                    }`}
                  >
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                    />
                    <span className="truncate">{slice.label}</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {slice.count}개
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(slice.count / max) * 100}%`,
                      backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length],
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <InsightEmpty message={emptyMessage} hint={emptyHint} />
      )}
    </InsightCard>
  );
}
