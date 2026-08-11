'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FolderTree, Globe, Lightbulb, Sparkles, Tag } from 'lucide-react';
import { useInsights } from '@/lib/hooks/use-insights';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { InsightCard, InsightEmpty } from '@/components/insights/insight-card';
import { PeriodToggle } from '@/components/insights/period-toggle';
import { PeriodTiles, LibraryTiles } from '@/components/insights/insight-tiles';
import { ActivityChart } from '@/components/insights/activity-chart';
import { DistributionCard } from '@/components/insights/distribution-card';
import { ReadingDebtCard } from '@/components/insights/reading-debt-card';
import { AiAnalysisSection } from '@/components/insights/ai-analysis-section';
import { PERIOD_RANGE_LABELS, type InsightsPeriod } from '@/lib/insights/period';

export function InsightsClient() {
  const [period, setPeriod] = useState<InsightsPeriod>('month');
  const { data, isLoading, isError, isFetching, refetch } = useInsights(period);

  if (isLoading && !data) return <InsightsSkeleton />;

  if (isError || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="rounded-xl bg-destructive/10 p-4">
          <Lightbulb size={24} className="text-destructive" />
        </div>
        <p className="font-medium text-foreground">인사이트를 불러오지 못했습니다</p>
        <p className="text-sm text-muted-foreground">
          네트워크 연결을 확인한 뒤 다시 시도해 주세요
        </p>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  const rangeLabel = PERIOD_RANGE_LABELS[period];

  return (
    <div className="relative bg-dots min-h-screen p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow-orb absolute -right-24 -top-24 h-72 w-72 opacity-30" />
      </div>

      {/* Header + period selector */}
      <div className="relative mb-6 flex flex-col gap-4 animate-blur-in sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="icon-glow relative rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-3 ring-1 ring-primary/20">
            <Lightbulb size={20} className="animate-breathe text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">인사이트</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {rangeLabel} 동안 무엇을 모으고 무엇을 실제로 읽었는지
            </p>
          </div>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} disabled={isFetching} />
      </div>

      {data.totalClips === 0 ? (
        <EmptyLibrary />
      ) : (
        <div
          className={`relative space-y-4 transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}
        >
          <PeriodTiles data={data} period={period} />

          <div className="grid gap-4 sm:grid-cols-2">
            <ActivityChart
              activity={data.activity}
              period={period}
              granularity={data.granularity}
            />

            <DistributionCard
              icon={FolderTree}
              title={`${rangeLabel} 카테고리 분포`}
              accent="violet"
              slices={data.categoryBreakdown.map(({ name, count }) => ({
                label: name ?? '미분류',
                count,
              }))}
              emptyMessage="이 기간에 저장된 클립이 없습니다"
              emptyHint="클립에 카테고리를 지정하면 관심사 쏠림이 보입니다"
            />

            <DistributionCard
              icon={Globe}
              title={`${rangeLabel} 플랫폼 분포`}
              accent="blue"
              capitalizeLabels
              slices={data.platformBreakdown.map(({ platform, count }) => ({
                label: platform,
                count,
              }))}
              emptyMessage="이 기간에 저장된 클립이 없습니다"
            />

            <ReadingDebtCard debt={data.readingDebt} period={period} />
          </div>

          <AiAnalysisSection period={period} />

          <LibraryTiles data={data} />

          <div className="grid gap-4 sm:grid-cols-2">
            <InsightCard icon={Tag} title="TOP 태그 (전체)" accent="rose">
              {data.topTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {data.topTags.map(({ name, count }) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-500"
                    >
                      {name}
                      <span className="text-rose-400/70">{count}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <InsightEmpty
                  message="아직 태그가 없습니다"
                  hint="AI 분석을 실행하면 태그가 자동으로 붙습니다"
                />
              )}
            </InsightCard>

            <InsightCard icon={Sparkles} title="AI 분석 현황 (전체)" accent="amber">
              <p className="stat-number text-3xl font-bold tracking-tight">
                {data.unanalyzedCount}
                <span className="ml-1 text-sm font-normal text-muted-foreground">개 대기</span>
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {data.unanalyzedCount > 0
                  ? `${data.aiAnalyzedCount}개 분석 완료 · ${data.unanalyzedCount}개 미완료`
                  : '모든 클립 AI 분석 완료'}
              </p>
            </InsightCard>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <div className="rounded-2xl bg-primary/10 p-4">
        <Lightbulb size={24} className="text-primary" />
      </div>
      <p className="font-medium text-foreground">아직 저장한 클립이 없습니다</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        링크를 저장하면 무엇을 모으고 무엇을 읽었는지 여기에서 되돌아볼 수 있습니다
      </p>
      <Button asChild size="sm" className="mt-1 rounded-xl">
        <Link href="/dashboard">첫 클립 저장하러 가기</Link>
      </Button>
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl shimmer" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 rounded-lg shimmer" />
            <Skeleton className="h-4 w-52 rounded-lg shimmer" />
          </div>
        </div>
        <Skeleton className="h-10 w-36 rounded-xl shimmer" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl shimmer" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl shimmer sm:col-span-2" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl shimmer" />
        ))}
      </div>
    </div>
  );
}
