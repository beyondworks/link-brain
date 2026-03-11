'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useInsights } from '@/lib/hooks/use-insights';
import { Skeleton } from '@/components/ui/skeleton';

const DonutChart = dynamic(
  () => import('@/components/charts/donut-chart').then((m) => m.DonutChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[72px] w-[72px] rounded-full shrink-0" />,
  }
);
import {
  BarChart3,
  TrendingUp,
  Archive,
  Lightbulb,
  CalendarDays,
  Globe,
  BookOpen,
  Sparkles,
  Tag,
} from 'lucide-react';

const PLATFORM_COLORS = [
  '#3b82f6', // blue-500
  '#21DBA4', // brand
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
];

export function InsightsClient() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const { data, isLoading, isError } = useInsights();

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8 flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl shimmer" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 rounded-lg shimmer" />
            <Skeleton className="h-4 w-52 rounded-lg shimmer" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl shimmer" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="rounded-xl bg-destructive/10 p-4">
          <Lightbulb size={24} className="text-destructive" />
        </div>
        <p className="font-medium text-foreground">인사이트를 불러오지 못했습니다</p>
        <p className="text-sm text-muted-foreground">잠시 후 다시 시도해 주세요</p>
      </div>
    );
  }

  const stats = [
    {
      icon: BarChart3,
      label: '전체 클립',
      value: data.totalClips.toLocaleString(),
      delay: '',
      gradient: 'from-primary/20 to-primary/5',
      iconColor: 'text-primary',
    },
    {
      icon: TrendingUp,
      label: '즐겨찾기',
      value: data.totalFavorites.toLocaleString(),
      delay: 'animation-delay-100',
      gradient: 'from-amber-500/20 to-amber-500/5',
      iconColor: 'text-amber-500',
    },
    {
      icon: Archive,
      label: '아카이브',
      value: data.totalArchived.toLocaleString(),
      delay: 'animation-delay-200',
      gradient: 'from-blue-500/20 to-blue-500/5',
      iconColor: 'text-blue-500',
    },
    {
      icon: BookOpen,
      label: '읽기 완료율',
      value: `${data.readRate}%`,
      delay: 'animation-delay-300',
      gradient: 'from-violet-500/20 to-violet-500/5',
      iconColor: 'text-violet-500',
    },
  ];

  // Max count for platform bar chart scaling
  const maxPlatformCount = Math.max(1, ...data.platformBreakdown.map((p) => p.count));

  // Max count for activity chart scaling
  const maxActivity = Math.max(1, ...data.recentActivity.map((d) => d.count));

  return (
    <div className="relative bg-dots min-h-screen p-6 lg:p-8">
      {/* Background mesh */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow-orb absolute -right-24 -top-24 h-72 w-72 opacity-30" />
      </div>

      {/* Page header */}
      <div className="relative mb-8 animate-blur-in">
        <div className="mb-3 flex items-center gap-3">
          <div className="icon-glow relative rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-3 ring-1 ring-primary/20">
            <Lightbulb size={20} className="animate-breathe text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">AI 인사이트</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              저장된 콘텐츠에서 발견된 패턴과 인사이트
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="relative mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`group card-glow animate-pop-in ${stat.delay} relative overflow-hidden rounded-2xl border border-border bg-card p-5`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-30`} />
              <div className="relative">
                <div className="mb-4 flex items-center gap-2.5">
                  <div
                    className={`icon-glow relative rounded-xl bg-gradient-to-br ${stat.gradient} p-2 ring-1 ring-white/10`}
                  >
                    <Icon size={15} className={stat.iconColor} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                </div>
                <p className="stat-number text-3xl font-bold tracking-tight">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed insights grid */}
      <div className="relative grid gap-4 sm:grid-cols-2">
        {/* 최근 30일 활동 */}
        <div className="animate-fade-in-up animation-delay-400 relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:col-span-2">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 opacity-40" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="icon-glow relative rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-2 ring-1 ring-white/10">
                <CalendarDays size={15} className="text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">최근 30일 저장 활동</span>
            </div>
            {/* Mini bar chart */}
            <div className="flex h-16 items-end gap-0.5">
              {data.recentActivity.map((day, idx) => {
                const d = new Date(day.date + 'T00:00:00');
                const label = `${d.getMonth() + 1}월 ${d.getDate()}일`;
                return (
                  <div
                    key={day.date}
                    className="relative flex-1"
                    style={{ height: '100%' }}
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {hoveredBar === idx && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2">
                        <div className="whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg">
                          {label} · {day.count}개 저장
                        </div>
                        <div className="mx-auto h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-foreground" />
                      </div>
                    )}
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-t-sm bg-emerald-500/60 transition-all hover:bg-emerald-500"
                      style={{ height: `${Math.max(4, (day.count / maxActivity) * 100)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>30일 전</span>
              <span>오늘</span>
            </div>
          </div>
        </div>

        {/* TOP 플랫폼 */}
        <div className="animate-fade-in-up animation-delay-500 relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-500/0 opacity-40" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="icon-glow relative rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 p-2 ring-1 ring-white/10">
                <Globe size={15} className="text-blue-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">TOP 플랫폼</span>
            </div>
            {data.platformBreakdown.length > 0 ? (
              <div className="flex items-start gap-4">
                <DonutChart
                  segments={data.platformBreakdown.slice(0, 5).map(({ platform, count }, idx) => ({
                    value: count,
                    label: platform,
                    color: PLATFORM_COLORS[idx % PLATFORM_COLORS.length],
                  }))}
                  size={72}
                  className="shrink-0"
                />
                <ol className="flex-1 space-y-2">
                  {data.platformBreakdown.slice(0, 5).map(({ platform, count }, idx) => (
                    <li key={platform} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-medium capitalize">
                          <span
                            className="inline-block h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: PLATFORM_COLORS[idx % PLATFORM_COLORS.length] }}
                          />
                          {platform}
                        </span>
                        <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-500">
                          {count}개
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-blue-500/60"
                          style={{ width: `${(count / maxPlatformCount) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">플랫폼 데이터 없음</p>
            )}
          </div>
        </div>

        {/* 읽기 완료율 */}
        <div className="animate-fade-in-up animation-delay-600 relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-violet-500/0 opacity-40" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="icon-glow relative rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 p-2 ring-1 ring-white/10">
                <BookOpen size={15} className="text-violet-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">읽기 완료율</span>
            </div>
            <p className="stat-number text-3xl font-bold tracking-tight">
              {data.readRate}
              <span className="ml-0.5 text-sm font-normal text-muted-foreground">%</span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              전체 {data.totalClips}개 중 읽음 표시된 클립
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-700"
                style={{ width: `${data.readRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* AI 분석 현황 */}
        <div className="animate-fade-in-up animation-delay-700 relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-500/0 opacity-40" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="icon-glow relative rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-2 ring-1 ring-white/10">
                <Sparkles size={15} className="text-amber-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">AI 분석 현황</span>
            </div>
            <p className="stat-number text-3xl font-bold tracking-tight">
              {data.unanalyzedCount}
              <span className="ml-1 text-sm font-normal text-muted-foreground">개 대기</span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {data.unanalyzedCount > 0
                ? `${data.aiAnalyzedCount}개 분석 완료 · ${data.unanalyzedCount}개 미완료`
                : '모든 클립 AI 분석 완료'}
            </p>
          </div>
        </div>

        {/* TOP 태그 */}
        <div className="animate-fade-in-up animation-delay-700 relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-rose-500/0 opacity-40" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="icon-glow relative rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 p-2 ring-1 ring-white/10">
                <Tag size={15} className="text-rose-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">TOP 태그</span>
            </div>
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
              <p className="text-sm text-muted-foreground">태그 데이터 없음</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
