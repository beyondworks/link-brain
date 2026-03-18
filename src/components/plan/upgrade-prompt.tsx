'use client';

import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCheckout } from '@/lib/hooks/use-checkout';

interface UpgradePromptProps {
  reason: 'clip' | 'collection' | 'ai_credits' | 'studio' | 'feature';
  featureName?: string;
  className?: string;
}

const MESSAGES: Record<UpgradePromptProps['reason'], string> = {
  clip: '클립 저장 한도에 도달했습니다. Pro로 무제한 저장하세요.',
  collection: '컬렉션 생성 한도에 도달했습니다. Pro로 무제한 생성하세요.',
  ai_credits: '이번 달 AI 크레딧을 모두 사용했습니다. Pro로 5배 더 사용하세요.',
  studio: '이번 달 Content Studio 한도에 도달했습니다. Pro로 10배 더 생성하세요.',
  feature: '', // handled dynamically
};

export function UpgradePrompt({ reason, featureName, className }: UpgradePromptProps) {
  const { checkout, isLoading } = useCheckout();
  const message =
    reason === 'feature'
      ? `${featureName ?? '이 기능'}은 Pro 플랜에서 사용할 수 있습니다`
      : MESSAGES[reason];

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-primary/20 bg-brand-muted px-4 py-3 text-sm',
        className
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1 text-foreground">{message}</span>
      <button
        onClick={() => checkout('monthly')}
        disabled={isLoading}
        className="shrink-0 cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Pro 업그레이드'}
      </button>
    </div>
  );
}
