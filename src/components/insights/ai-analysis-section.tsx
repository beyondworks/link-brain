'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Brain, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PERIOD_RANGE_LABELS, type InsightsPeriod } from '@/lib/insights/period';

interface AiInsightResult {
  summary: string;
  trends: string[];
  recommendations: string[];
  topicFocus: string;
  knowledgeClusters?: Array<{ name: string; clipCount: number; description: string }>;
  readingDebt?: { count: number; suggestion: string };
  actionItems?: string[];
}

/** UI period → AI handler period (the handler supports week|month|quarter|custom). */
function aiPeriodBody(period: InsightsPeriod): { period: string; days?: number } {
  if (period === 'year') return { period: 'custom', days: 365 };
  return { period };
}

export function AiAnalysisSection({ period }: { period: InsightsPeriod }) {
  const [result, setResult] = useState<AiInsightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const generateInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insights', ...aiPeriodBody(period), language: 'ko' }),
      });
      if (!res.ok) {
        const errJson = (await res.json()) as { error?: { message?: string } };
        throw new Error(errJson.error?.message ?? 'AI 인사이트 생성 실패');
      }
      const json = (await res.json()) as { data: { aiAnalysis: AiInsightResult | null } };
      if (!json.data.aiAnalysis) {
        throw new Error('해당 기간에 분석할 클립이 없습니다');
      }
      setResult(json.data.aiAnalysis);
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [period, queryClient]);

  if (loading) {
    return (
      <div className="relative space-y-3">
        <Skeleton className="h-24 rounded-2xl shimmer" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-2xl shimmer" />
          <Skeleton className="h-32 rounded-2xl shimmer" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <div className="rounded-2xl bg-primary/10 p-3">
            <Brain size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">AI 콘텐츠 분석</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {PERIOD_RANGE_LABELS[period]} 저장한 클립을 분석해 지식 클러스터, 트렌드, 행동 제안을
              받아보세요
            </p>
          </div>
          <Button
            onClick={generateInsights}
            className="rounded-xl bg-gradient-brand text-white shadow-brand hover:shadow-brand-lg"
            size="sm"
          >
            <Sparkles size={14} className="mr-1.5" />
            분석 시작
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-xs text-destructive">
            {error} — 잠시 후 다시 시도해 주세요
          </p>
        )}
      </div>
    );
  }

  const actions = result.actionItems ?? result.recommendations;

  return (
    <div className="relative space-y-4 animate-blur-in">
      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="icon-glow rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-2 ring-1 ring-primary/20">
            <Brain size={15} className="text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            AI 분석 요약 · {PERIOD_RANGE_LABELS[period]}
          </span>
          <button
            type="button"
            onClick={generateInsights}
            className="ml-auto text-xs font-medium text-primary hover:underline"
          >
            다시 분석
          </button>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{result.summary}</p>
        {result.topicFocus && (
          <p className="mt-2 text-xs text-muted-foreground">
            주요 관심사: <span className="font-medium text-primary">{result.topicFocus}</span>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {result.trends.length > 0 && (
          <BulletCard title="트렌드" items={result.trends} tone="blue" icon={TrendingUp} />
        )}
        {actions.length > 0 && (
          <BulletCard title="행동 제안" items={actions} tone="emerald" icon={ArrowRight} />
        )}
      </div>

      {result.knowledgeClusters && result.knowledgeClusters.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="icon-glow rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 p-2 ring-1 ring-white/10">
              <Sparkles size={15} className="text-violet-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">지식 클러스터</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.knowledgeClusters.map((cluster) => (
              <div key={cluster.name} className="rounded-xl border border-border bg-muted/30 px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{cluster.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {cluster.clipCount}개 클립 · {cluster.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BulletCard({
  title,
  items,
  tone,
  icon: Icon,
}: {
  title: string;
  items: string[];
  tone: 'blue' | 'emerald';
  icon: typeof TrendingUp;
}) {
  const iconWrap =
    tone === 'blue'
      ? 'from-blue-500/20 to-blue-500/5'
      : 'from-emerald-500/20 to-emerald-500/5';
  const iconColor = tone === 'blue' ? 'text-blue-500' : 'text-emerald-500';
  const dot = tone === 'blue' ? 'bg-blue-500' : 'bg-emerald-500';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <div className={`icon-glow rounded-xl bg-gradient-to-br ${iconWrap} p-2 ring-1 ring-white/10`}>
          <Icon size={15} className={iconColor} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-foreground">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
