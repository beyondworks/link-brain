'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UsageBar } from '@/components/plan/usage-bar';
import { usePlan } from '@/lib/hooks/use-plan';
import { cn } from '@/lib/utils';

function TierBadge({ tier }: { tier: string }) {
  if (tier === 'master') {
    return (
      <span className="rounded-full bg-gradient-to-r from-violet-500 to-primary px-2.5 py-0.5 text-xs font-semibold text-white">
        Master
      </span>
    );
  }
  if (tier === 'pro') {
    return (
      <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
        Pro
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
      Free
    </span>
  );
}

export function PlanUsageCard({ className }: { className?: string }) {
  const { tier, isMaster, isPro, isFree, usage, isLoading } = usePlan();

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-5 w-24 rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-32 rounded bg-muted" />
              <div className="h-1.5 w-full rounded-full bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const resetDate = usage?.resetAt
    ? new Date(usage.resetAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    : null;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">플랜 사용량</CardTitle>
          <TierBadge tier={tier} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {usage && (
          <>
            <UsageBar
              label="클립"
              used={usage.clipsUsed}
              limit={usage.clipsLimit}
            />
            <UsageBar
              label="AI 크레딧"
              used={usage.creditsUsed}
              limit={usage.creditsLimit}
            />
            <UsageBar
              label="Content Studio"
              used={usage.studioUsed}
              limit={usage.studioLimit}
            />
            <UsageBar
              label="컬렉션"
              used={usage.collectionsUsed}
              limit={usage.collectionsLimit}
            />
          </>
        )}

        {resetDate && (
          <p className="text-xs text-muted-foreground">{resetDate}에 초기화</p>
        )}

        {(isFree || isPro) && !isMaster && (
          <Button asChild size="sm" className="w-full">
            <Link href="/pricing">업그레이드</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
