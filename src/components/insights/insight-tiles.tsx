'use client';

import {
  Archive,
  BarChart3,
  BookOpen,
  BookmarkPlus,
  BookOpenCheck,
  Clock3,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { accentClasses, type InsightAccent } from './insight-card';
import { PERIOD_RANGE_LABELS, type InsightsPeriod } from '@/lib/insights/period';
import type { InsightsData } from '@/lib/hooks/use-insights';

interface TileProps {
  icon: LucideIcon;
  accent: InsightAccent;
  label: string;
  value: string;
  caption?: React.ReactNode;
  className?: string;
}

function Tile({ icon: Icon, accent, label, value, caption, className }: TileProps) {
  const tone = accentClasses(accent);
  return (
    <div
      className={cn(
        'group card-glow relative overflow-hidden rounded-2xl border border-border bg-card p-5',
        className
      )}
    >
      <div
        className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-30', tone.wash)}
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
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className="stat-number text-3xl font-bold tracking-tight">{value}</p>
        {caption && <div className="mt-1.5 text-xs text-muted-foreground">{caption}</div>}
      </div>
    </div>
  );
}

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted-foreground">이전 기간 기록 없음</span>;
  const up = pct > 0;
  const flat = pct === 0;
  return (
    <span
      className={cn(
        'font-medium',
        flat ? 'text-muted-foreground' : up ? 'text-emerald-500' : 'text-rose-500'
      )}
    >
      이전 기간 대비 {up ? '+' : ''}
      {pct}%
    </span>
  );
}

/** Saved / read / reading-debt for the selected period, vs the previous one. */
export function PeriodTiles({ data, period }: { data: InsightsData; period: InsightsPeriod }) {
  const { saved, read, prevSaved, prevRead, savedChangePct, readChangePct } = data.periodStats;
  const rangeLabel = PERIOD_RANGE_LABELS[period];

  return (
    <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Tile
        icon={BookmarkPlus}
        accent="primary"
        label={`${rangeLabel} 저장`}
        value={saved.toLocaleString()}
        caption={
          <>
            이전 {prevSaved.toLocaleString()}개 · <ChangeBadge pct={savedChangePct} />
          </>
        }
      />
      <Tile
        icon={BookOpenCheck}
        accent="emerald"
        label={`${rangeLabel} 읽음`}
        value={read.toLocaleString()}
        caption={
          <>
            이전 {prevRead.toLocaleString()}개 · <ChangeBadge pct={readChangePct} />
          </>
        }
      />
      <Tile
        icon={Clock3}
        accent="amber"
        label="읽기 부채"
        value={data.readingDebt.count.toLocaleString()}
        caption={
          data.readingDebt.count > 0
            ? `${rangeLabel}에 저장했지만 아직 열어보지 않은 클립`
            : '이 기간에 저장한 클립을 모두 확인했습니다'
        }
      />
    </div>
  );
}

/** All-time library tiles (period-independent). */
export function LibraryTiles({ data }: { data: InsightsData }) {
  return (
    <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        icon={BarChart3}
        accent="primary"
        label="전체 클립"
        value={data.totalClips.toLocaleString()}
      />
      <Tile
        icon={TrendingUp}
        accent="amber"
        label="즐겨찾기"
        value={data.totalFavorites.toLocaleString()}
      />
      <Tile
        icon={Archive}
        accent="blue"
        label="아카이브"
        value={data.totalArchived.toLocaleString()}
      />
      <Tile
        icon={BookOpen}
        accent="violet"
        label="전체 읽기 완료율"
        value={`${data.readRate}%`}
        caption={`전체 ${data.totalClips.toLocaleString()}개 중 읽음 표시`}
      />
    </div>
  );
}
