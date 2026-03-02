'use client';

import { ArrowUpRight, ArrowDownRight, Minus, BookmarkPlus, BookOpen, Highlighter, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWeeklyStats } from '@/lib/hooks/use-weekly-stats';
import type { WeeklyMetric, WeeklyStatsData } from '@/app/api/v1/stats/weekly/route';

type MetricKey = keyof Pick<WeeklyStatsData, 'clips_saved' | 'clips_read' | 'highlights_made' | 'collections_updated'>;

interface MetricConfig {
  key: MetricKey;
  label: string;
  icon: React.ElementType;
}

// ─── 변화율 계산 유틸 (테스트 가능하도록 export) ────────────────────────────

/** 지난 주 대비 이번 주 변화율(%)을 계산합니다. */
export function calcChangeRate(thisWeek: number, lastWeek: number): number {
  if (lastWeek === 0 && thisWeek === 0) return 0;
  if (lastWeek === 0) return 100;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

// ─── 메트릭 카드 ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  metric: WeeklyMetric;
}

function MetricCard({ icon: Icon, label, metric }: MetricCardProps) {
  const rate = calcChangeRate(metric.thisWeek, metric.lastWeek);

  const trendConfig =
    rate > 0
      ? {
          icon: ArrowUpRight,
          colorClass: 'text-emerald-500',
          bgClass: 'bg-emerald-500/10',
          label: `+${rate}%`,
        }
      : rate < 0
      ? {
          icon: ArrowDownRight,
          colorClass: 'text-red-500',
          bgClass: 'bg-red-500/10',
          label: `${rate}%`,
        }
      : {
          icon: Minus,
          colorClass: 'text-muted-foreground',
          bgClass: 'bg-muted/60',
          label: '0%',
        };

  const TrendIcon = trendConfig.icon;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
      {/* 아이콘 + 레이블 */}
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        <Icon size={14} />
        <span className="text-xs font-medium">{label}</span>
      </div>

      {/* 이번 주 수치 */}
      <p className="mb-2 text-2xl font-black tracking-tight text-foreground">
        {metric.thisWeek}
      </p>

      {/* 변화율 배지 */}
      <div
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold',
          trendConfig.bgClass,
          trendConfig.colorClass
        )}
      >
        <TrendIcon size={11} />
        <span>{trendConfig.label}</span>
        <span className="font-normal text-muted-foreground/70">vs 지난 주</span>
      </div>
    </div>
  );
}

// ─── 스켈레톤 ────────────────────────────────────────────────────────────────

function MetricSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 h-3.5 w-20 animate-pulse rounded bg-muted" />
      <div className="mb-2 h-7 w-10 animate-pulse rounded bg-muted" />
      <div className="h-5 w-24 animate-pulse rounded bg-muted" />
    </div>
  );
}

// ─── 날짜 범위 포맷 ──────────────────────────────────────────────────────────

function formatDateRange(weekStartIso: string): string {
  const start = new Date(weekStartIso);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(d);

  return `${fmt(start)} – ${fmt(end)}`;
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────

const METRICS: MetricConfig[] = [
  { key: 'clips_saved', label: '저장한 클립', icon: BookmarkPlus },
  { key: 'clips_read', label: '읽은 클립', icon: BookOpen },
  { key: 'highlights_made', label: '하이라이트', icon: Highlighter },
  { key: 'collections_updated', label: '컬렉션 업데이트', icon: FolderOpen },
];

export function WeeklyReport() {
  const { stats, isLoading } = useWeeklyStats();

  return (
    <section className="animate-fade-in-up animation-delay-75 mb-8">
      {/* 헤더 */}
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">이번 주 활동</h2>
        {!isLoading && stats?.weekStart && (
          <span className="text-xs text-muted-foreground/60">
            {formatDateRange(stats.weekStart)}
          </span>
        )}
      </div>

      {/* 2×2 그리드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)
          : METRICS.map(({ key, label, icon }) => (
              <MetricCard
                key={key}
                icon={icon}
                label={label}
                metric={stats?.[key] ?? { thisWeek: 0, lastWeek: 0 }}
              />
            ))}
      </div>
    </section>
  );
}
