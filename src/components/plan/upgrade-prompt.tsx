'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpgradePromptProps {
  reason: 'clip' | 'collection' | 'ai_credits' | 'studio' | 'feature';
  featureName?: string;
  className?: string;
}

const MESSAGES: Record<UpgradePromptProps['reason'], string> = {
  clip: '클립 저장 한도에 도달했습니다',
  collection: '컬렉션 생성 한도에 도달했습니다',
  ai_credits: '이번 달 AI 크레딧을 모두 사용했습니다',
  studio: '이번 달 Content Studio 생성 한도에 도달했습니다',
  feature: '', // handled dynamically
};

export function UpgradePrompt({ reason, featureName, className }: UpgradePromptProps) {
  const message =
    reason === 'feature'
      ? `${featureName ?? '이 기능'}은 상위 플랜에서 사용할 수 있습니다`
      : MESSAGES[reason];

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm',
        className
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1 text-foreground">{message}</span>
      <Link
        href="/pricing"
        className="shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary/90"
      >
        업그레이드
      </Link>
    </div>
  );
}
