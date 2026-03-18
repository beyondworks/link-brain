'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useInsights } from '@/lib/hooks/use-insights';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

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
  Brain,
  BookOpenCheck,
  ArrowRight,
  Loader2,
} from 'lucide-react';

import { CHART_PALETTE } from '@/config/constants';

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

      {/* AI Insights CTA */}
      <AiInsightsSection />

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
                    color: CHART_PALETTE[idx % CHART_PALETTE.length],
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
                            style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
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

// ─── AI Insights Section ────────────────────────────────────────────────────

interface AiInsightResult {
  summary: string;
  trends: string[];
  recommendations: string[];
  topicFocus: string;
  knowledgeClusters?: Array<{ name: string; clipCount: number; description: string }>;
  readingDebt?: { count: number; suggestion: string };
  actionItems?: string[];
}

function AiInsightsSection() {
  const [result, setResult] = useState<AiInsightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insights', period: 'month', language: 'ko' }),
      });
      if (!res.ok) {
        const errJson = (await res.json()) as { error?: { message?: string } };
        throw new Error(errJson.error?.message ?? 'AI 인사이트 생성 실패');
      }
      const json = (await res.json()) as { data: { aiAnalysis: AiInsightResult } };
      setResult(json.data.aiAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  if (!result && !loading) {
    return (
      <div className="relative mb-4 animate-fade-in-up animation-delay-300 overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <div className="rounded-2xl bg-primary/10 p-3">
            <Brain size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">AI 콘텐츠 분석</h3>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              저장된 클립의 콘텐츠를 분석하여 지식 클러스터, 트렌드, 행동 제안을 받아보세요
            </p>
          </div>
          <Button
            onClick={generateInsights}
            disabled={loading}
            className="rounded-xl bg-gradient-brand text-white shadow-brand hover:shadow-brand-lg"
            size="sm"
          >
            {loading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Sparkles size={14} className="mr-1.5" />}
            분석 시작
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative mb-4 space-y-3">
        <Skeleton className="h-24 rounded-2xl shimmer" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-2xl shimmer" />
          <Skeleton className="h-32 rounded-2xl shimmer" />
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="relative mb-4 space-y-4 animate-blur-in">
      {/* Summary */}
      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="icon-glow rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-2 ring-1 ring-primary/20">
            <Brain size={15} className="text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">AI 분석 요약</span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{result.summary}</p>
        {result.topicFocus && (
          <p className="mt-2 text-xs text-muted-foreground">
            주요 관심사: <span className="font-medium text-primary">{result.topicFocus}</span>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Trends */}
        {result.trends.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="icon-glow rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 p-2 ring-1 ring-white/10">
                <TrendingUp size={15} className="text-blue-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">트렌드</span>
            </div>
            <ul className="space-y-1.5">
              {result.trends.map((trend, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {trend}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {(result.actionItems ?? result.recommendations).length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="icon-glow rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-2 ring-1 ring-white/10">
                <ArrowRight size={15} className="text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">행동 제안</span>
            </div>
            <ul className="space-y-1.5">
              {(result.actionItems ?? result.recommendations).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Knowledge Clusters */}
      {result.knowledgeClusters && result.knowledgeClusters.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="icon-glow rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 p-2 ring-1 ring-white/10">
              <Sparkles size={15} className="text-violet-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">지식 클러스터</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.knowledgeClusters.map((cluster, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
              >
                <p className="text-xs font-semibold text-foreground">{cluster.name}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {cluster.clipCount}개 클립 · {cluster.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reading Debt */}
      {result.readingDebt && result.readingDebt.count > 0 && (
        <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-5">
          <div className="flex items-center gap-2.5">
            <div className="icon-glow rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-2 ring-1 ring-amber-500/20">
              <BookOpenCheck size={15} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                읽기 부채: {result.readingDebt.count}개 미읽음
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {result.readingDebt.suggestion}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
