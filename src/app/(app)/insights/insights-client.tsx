'use client';

import { useClips, useClipsCount } from '@/lib/hooks/use-clips';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  TrendingUp,
  Tag,
  Clock,
  Lightbulb,
  CalendarDays,
  Globe,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export function InsightsClient() {
  const { data, isLoading } = useClips();
  const { data: totalCount } = useClipsCount();

  const clips = data?.pages.flatMap((p) => p.data) ?? [];
  const loadedCount = clips.length;

  const favorites = clips.filter((c) => c.is_favorite).length;
  const platforms = [...new Set(clips.map((c) => c.platform).filter(Boolean))];
  const avgReadTime = clips.reduce((sum, c) => sum + (c.read_time ?? 0), 0) / (loadedCount || 1);

  // 최근 7일 저장 트렌드
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentClips = clips.filter(
    (c) => new Date(c.created_at) >= sevenDaysAgo,
  );

  // 가장 많이 저장한 플랫폼 TOP 3
  const platformCounts = clips.reduce<Record<string, number>>((acc, c) => {
    if (c.platform) {
      acc[c.platform] = (acc[c.platform] ?? 0) + 1;
    }
    return acc;
  }, {});
  const topPlatforms = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // 읽기 완료율: is_read_later가 false이면 읽음으로 간주
  const readClips = clips.filter((c) => !c.is_read_later).length;
  const readRate = loadedCount > 0 ? Math.round((readClips / loadedCount) * 100) : 0;

  // AI 분석 미완료: summary가 null인 클립
  const noAiClips = clips.filter((c) => !c.summary).length;

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
      </div>
    );
  }

  const stats = [
    {
      icon: BarChart3,
      label: '전체 클립',
      value: totalCount ?? loadedCount,
      delay: '',
      gradient: 'from-primary/20 to-primary/5',
      iconColor: 'text-primary',
    },
    {
      icon: TrendingUp,
      label: '즐겨찾기',
      value: favorites,
      delay: 'animation-delay-100',
      gradient: 'from-amber-500/20 to-amber-500/5',
      iconColor: 'text-amber-500',
    },
    {
      icon: Tag,
      label: '플랫폼',
      value: platforms.length,
      delay: 'animation-delay-200',
      gradient: 'from-blue-500/20 to-blue-500/5',
      iconColor: 'text-blue-500',
    },
    {
      icon: Clock,
      label: '평균 읽기 시간',
      value: `${Math.ceil(avgReadTime / 60)}분`,
      delay: 'animation-delay-300',
      gradient: 'from-violet-500/20 to-violet-500/5',
      iconColor: 'text-violet-500',
    },
  ];

  const showPartialBanner =
    totalCount !== undefined && totalCount !== null && totalCount > loadedCount;

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
            <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">
              AI 인사이트
            </h1>
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
              {/* Subtle inner gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-30`} />
              <div className="relative">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className={`icon-glow relative rounded-xl bg-gradient-to-br ${stat.gradient} p-2 ring-1 ring-white/10`}>
                    <Icon size={15} className={stat.iconColor} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                </div>
                <p className="stat-number text-3xl font-bold tracking-tight">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Partial load banner */}
      {showPartialBanner && (
        <div className="relative mb-8 animate-fade-in-up rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            현재{' '}
            <span className="font-semibold text-foreground">{loadedCount}개</span> 로드 중 /
            전체{' '}
            <span className="font-semibold text-foreground">{totalCount}개</span> 클립 — 아래로 스크롤하면 더 불러옵니다
          </p>
        </div>
      )}

      {/* Detailed insights grid */}
      <div className="relative grid gap-4 sm:grid-cols-2">
        {/* 최근 7일 저장 트렌드 */}
        <div className="animate-fade-in-up animation-delay-400 relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 opacity-40" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="icon-glow relative rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-2 ring-1 ring-white/10">
                <CalendarDays size={15} className="text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">최근 7일 저장</span>
            </div>
            <p className="stat-number text-3xl font-bold tracking-tight">
              {recentClips.length}
              <span className="ml-1 text-sm font-normal text-muted-foreground">개</span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {loadedCount > 0
                ? `전체의 ${Math.round((recentClips.length / loadedCount) * 100)}%`
                : '데이터 없음'}
            </p>
          </div>
        </div>

        {/* 가장 많이 저장한 플랫폼 TOP 3 */}
        <div className="animate-fade-in-up animation-delay-500 relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-500/0 opacity-40" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="icon-glow relative rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 p-2 ring-1 ring-white/10">
                <Globe size={15} className="text-blue-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">TOP 3 플랫폼</span>
            </div>
            {topPlatforms.length > 0 ? (
              <ol className="space-y-1.5">
                {topPlatforms.map(([platform, count], idx) => (
                  <li key={platform} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium capitalize">
                      <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                      {platform}
                    </span>
                    <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-500">
                      {count}개
                    </span>
                  </li>
                ))}
              </ol>
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
              {readRate}
              <span className="ml-0.5 text-sm font-normal text-muted-foreground">%</span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              읽음 {readClips}개 · 미읽음 {loadedCount - readClips}개
            </p>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-700"
                style={{ width: `${readRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* AI 분석 미완료 클립 수 */}
        <div className="animate-fade-in-up animation-delay-700 relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-500/0 opacity-40" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="icon-glow relative rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-2 ring-1 ring-white/10">
                <Sparkles size={15} className="text-amber-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">AI 분석 대기</span>
            </div>
            <p className="stat-number text-3xl font-bold tracking-tight">
              {noAiClips}
              <span className="ml-1 text-sm font-normal text-muted-foreground">개</span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {noAiClips > 0
                ? `${loadedCount - noAiClips}개 분석 완료 · ${noAiClips}개 미완료`
                : '모든 클립 AI 분석 완료'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
