'use client';

import { Settings2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  useDashboardPreferences,
  WIDGET_META,
  type WidgetKey,
} from '@/lib/hooks/use-dashboard-preferences';

export function DashboardSettings() {
  const { widgets, toggleWidget, resetDefaults } = useDashboardPreferences();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="대시보드 위젯 설정"
        >
          <Settings2 size={16} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-64 p-0"
        sideOffset={8}
      >
        <div className="border-b border-border/60 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">위젯 표시 설정</p>
          <p className="mt-0.5 text-xs text-muted-foreground">표시할 위젯을 선택하세요</p>
        </div>

        <div className="px-2 py-2">
          {WIDGET_META.map(({ key, label }) => (
            <WidgetToggleRow
              key={key}
              widgetKey={key}
              label={label}
              enabled={widgets[key]}
              onToggle={toggleWidget}
            />
          ))}
        </div>

        <div className="border-t border-border/60 px-3 py-2.5">
          <button
            type="button"
            onClick={resetDefaults}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2 py-1.5',
              'text-xs text-muted-foreground transition-colors',
              'hover:bg-muted hover:text-foreground',
            )}
          >
            <RotateCcw size={12} />
            초기화
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function WidgetToggleRow({
  widgetKey,
  label,
  enabled,
  onToggle,
}: {
  widgetKey: WidgetKey;
  label: string;
  enabled: boolean;
  onToggle: (key: WidgetKey) => void;
}) {
  return (
    <label
      htmlFor={`widget-toggle-${widgetKey}`}
      className={cn(
        'flex cursor-pointer items-center justify-between rounded-lg px-2 py-2',
        'transition-colors hover:bg-muted/60',
      )}
    >
      <span className="text-sm text-foreground">{label}</span>
      <Switch
        id={`widget-toggle-${widgetKey}`}
        checked={enabled}
        onCheckedChange={() => onToggle(widgetKey)}
        aria-label={`${label} 위젯 ${enabled ? '숨기기' : '표시'}`}
      />
    </label>
  );
}
