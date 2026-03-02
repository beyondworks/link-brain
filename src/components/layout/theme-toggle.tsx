'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
  { value: 'light', label: '라이트', Icon: Sun },
  { value: 'dark', label: '다크', Icon: Moon },
  { value: 'system', label: '시스템', Icon: Monitor },
] as const;

function applyTransition() {
  const el = document.documentElement;
  el.classList.add('transitioning');
  window.setTimeout(() => el.classList.remove('transitioning'), 320);
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleSetTheme = (value: string) => {
    applyTransition();
    setTheme(value);
  };

  const current = theme ?? 'system';
  const CurrentIcon =
    current === 'light' ? Sun : current === 'dark' ? Moon : Monitor;

  const currentLabel =
    THEME_OPTIONS.find((o) => o.value === current)?.label ?? '시스템';

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'relative h-8 w-8 rounded-lg text-muted-foreground transition-spring hover:text-foreground',
                resolvedTheme === 'dark'
                  ? 'hover:bg-white/10'
                  : 'hover:bg-black/5',
              )}
              aria-label={`테마: ${currentLabel}`}
            >
              <CurrentIcon size={15} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>테마: {currentLabel}</TooltipContent>
        <DropdownMenuContent align="end" className="w-36">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => handleSetTheme(value)}
              className={cn(
                'flex items-center gap-2 text-sm',
                current === value && 'font-medium text-primary',
              )}
            >
              <Icon size={14} className="flex-shrink-0" />
              <span>{label}</span>
              {current === value && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Tooltip>
  );
}
