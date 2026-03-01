'use client';

import { useClips } from '@/lib/hooks/use-clips';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, Tag, Clock } from 'lucide-react';

export function InsightsClient() {
  const { data, isLoading } = useClips();
  const clips = data?.pages.flatMap((p) => p.data) ?? [];

  const totalClips = clips.length;
  const favorites = clips.filter((c) => c.is_favorite).length;
  const platforms = [...new Set(clips.map((c) => c.platform).filter(Boolean))];
  const avgReadTime = clips.reduce((sum, c) => sum + (c.read_time ?? 0), 0) / (totalClips || 1);

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">AI 인사이트</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { icon: BarChart3, label: '전체 클립', value: totalClips },
    { icon: TrendingUp, label: '즐겨찾기', value: favorites },
    { icon: Tag, label: '플랫폼', value: platforms.length },
    { icon: Clock, label: '평균 읽기 시간', value: `${Math.ceil(avgReadTime / 60)}분` },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">AI 인사이트</h1>
        <p className="mt-1 text-muted-foreground">
          저장된 콘텐츠에서 발견된 패턴과 인사이트
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon size={16} />
                <span className="text-sm">{stat.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Placeholder for deeper insights */}
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        <BarChart3 size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">상세 인사이트가 곧 제공됩니다</p>
        <p className="mt-1 text-sm">
          더 많은 클립을 저장하면 AI가 패턴을 분석합니다
        </p>
      </div>
    </div>
  );
}
