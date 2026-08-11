'use client';

import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import { InsightCard, InsightEmpty } from './insight-card';
import { unreadAgeLabel, PERIOD_RANGE_LABELS, type InsightsPeriod } from '@/lib/insights/period';
import type { InsightsData } from '@/lib/hooks/use-insights';

interface ReadingDebtCardProps {
  debt: InsightsData['readingDebt'];
  period: InsightsPeriod;
}

export function ReadingDebtCard({ debt, period }: ReadingDebtCardProps) {
  const rangeLabel = PERIOD_RANGE_LABELS[period];

  return (
    <InsightCard
      icon={Clock3}
      title="읽기 부채 — 저장만 하고 안 읽은 클립"
      accent="amber"
      className="sm:col-span-2"
      action={
        debt.count > 0 ? (
          <Link
            href="/read-later"
            className="flex items-center gap-1 text-xs font-medium text-amber-500 hover:underline"
          >
            나중에 읽기
            <ArrowRight size={12} />
          </Link>
        ) : undefined
      }
    >
      {debt.clips.length > 0 ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {rangeLabel}에 저장한 <span className="font-semibold text-foreground">{debt.count}개</span>
            를 아직 열어보지 않았습니다. 오래 묵은 것부터 하나만 읽어보세요.
          </p>
          <ul className="space-y-1.5">
            {debt.clips.map((clip) => (
              <li key={clip.id}>
                <Link
                  href={`/clip/${clip.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 transition-colors hover:bg-surface-raised"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {clip.title ?? '제목 없음'}
                    </span>
                    {clip.platform && (
                      <span className="text-xs capitalize text-muted-foreground">
                        {clip.platform}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
                    {unreadAgeLabel(clip.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <InsightEmpty
          message={`${rangeLabel}에 쌓인 읽기 부채가 없습니다`}
          hint="저장한 클립을 모두 열어봤습니다"
        />
      )}
    </InsightCard>
  );
}
