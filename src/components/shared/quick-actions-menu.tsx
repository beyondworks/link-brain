'use client';

/**
 * QuickActionsMenu
 *
 * 컨텍스트 기반 퀵 액션 메뉴. 카테고리별로 그룹핑하여 Popover로 표시합니다.
 */

import React from 'react';
import { Zap } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getActionsForContext,
  executeAction,
  type ActionContext,
  type QuickAction,
} from '@/lib/actions/quick-actions';

interface QuickActionsMenuProps {
  context: ActionContext;
  trigger?: React.ReactNode;
  className?: string;
}

const CATEGORY_LABELS: Record<QuickAction['category'], string> = {
  clip: '클립',
  collection: '컬렉션',
  studio: '스튜디오',
  search: '검색',
  ai: 'AI',
};

const CATEGORY_ORDER: QuickAction['category'][] = [
  'studio',
  'search',
  'collection',
  'clip',
  'ai',
];

export function QuickActionsMenu({ context, trigger, className }: QuickActionsMenuProps) {
  const [open, setOpen] = React.useState(false);

  const availableActions = getActionsForContext(context);

  // 카테고리별 그룹핑
  const grouped = CATEGORY_ORDER.reduce<Record<string, QuickAction[]>>((acc, cat) => {
    const actions = availableActions.filter((a) => a.category === cat);
    if (actions.length > 0) {
      acc[cat] = actions;
    }
    return acc;
  }, {});

  const hasActions = availableActions.length > 0;

  function handleActionClick(actionId: string) {
    executeAction(actionId, context);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-1.5', className)}
            disabled={!hasActions}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>퀵 액션</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        {!hasActions ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            사용 가능한 액션이 없습니다
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {Object.entries(grouped).map(([cat, actions]) => (
              <div key={cat}>
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {CATEGORY_LABELS[cat as QuickAction['category']]}
                </p>
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleActionClick(action.id)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{action.labelKo}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
