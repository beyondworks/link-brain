'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { InsightCard, InsightEmpty } from './insight-card';
import {
  formatBucketLabel,
  PERIOD_RANGE_LABELS,
  type ActivityBucket,
  type InsightsGranularity,
  type InsightsPeriod,
} from '@/lib/insights/period';

interface ActivityChartProps {
  activity: ActivityBucket[];
  period: InsightsPeriod;
  granularity: InsightsGranularity;
}

export function ActivityChart({ activity, period, granularity }: ActivityChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const max = Math.max(1, ...activity.map((b) => Math.max(b.saved, b.read)));
  const hasData = activity.some((b) => b.saved > 0 || b.read > 0);
  const monthly = granularity === 'monthly';

  return (
    <InsightCard
      icon={CalendarDays}
      title={`${PERIOD_RANGE_LABELS[period]} 저장 · 읽기 활동`}
      accent="emerald"
      className="sm:col-span-2"
      action={
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            저장
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            읽음
          </span>
        </div>
      }
    >
      {hasData ? (
        <>
          <div className="flex h-24 items-end gap-0.5">
            {activity.map((bucket, idx) => (
              <div
                key={bucket.bucket}
                className="relative h-full flex-1"
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
              >
                {hovered === idx && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2">
                    <div className="whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg">
                      {formatBucketLabel(bucket.bucket)} · 저장 {bucket.saved} · 읽음 {bucket.read}
                    </div>
                    <div className="mx-auto h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-px">
                  <div
                    className="flex-1 rounded-t-sm bg-emerald-500/60 transition-all hover:bg-emerald-500"
                    style={{ height: `${Math.max(3, (bucket.saved / max) * 100)}%` }}
                  />
                  <div
                    className="flex-1 rounded-t-sm bg-blue-500/60 transition-all hover:bg-blue-500"
                    style={{ height: `${Math.max(3, (bucket.read / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
            {monthly ? (
              activity.map((bucket) => (
                <span key={bucket.bucket} className="flex-1 text-center">
                  {formatBucketLabel(bucket.bucket).replace('월', '')}
                </span>
              ))
            ) : (
              <>
                <span>{formatBucketLabel(activity[0].bucket)}</span>
                <span>오늘</span>
              </>
            )}
          </div>
        </>
      ) : (
        <InsightEmpty
          message="이 기간에는 저장하거나 읽은 클립이 없습니다"
          hint="링크를 저장하면 여기에 활동이 쌓입니다"
        />
      )}
    </InsightCard>
  );
}
