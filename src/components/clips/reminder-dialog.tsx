'use client';

import { useState } from 'react';
import { Bell, BellOff, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSetReminder, useCancelReminder } from '@/lib/hooks/use-reminder';

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clipId: string;
  currentRemindAt: string | null;
}

interface Preset {
  label: string;
  description: string;
  getDate: () => Date;
}

function buildPresets(): Preset[] {
  return [
    {
      label: '1시간 후',
      description: '잠시 후',
      getDate: () => {
        const d = new Date();
        d.setHours(d.getHours() + 1);
        return d;
      },
    },
    {
      label: '오늘 저녁',
      description: '오늘 20:00',
      getDate: () => {
        const d = new Date();
        d.setHours(20, 0, 0, 0);
        // 이미 지난 경우 다음날
        if (d <= new Date()) d.setDate(d.getDate() + 1);
        return d;
      },
    },
    {
      label: '내일 오전',
      description: '내일 09:00',
      getDate: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    {
      label: '이번 주말',
      description: '토요일 10:00',
      getDate: () => {
        const d = new Date();
        const day = d.getDay(); // 0=일, 6=토
        const daysUntilSat = day === 6 ? 7 : (6 - day);
        d.setDate(d.getDate() + daysUntilSat);
        d.setHours(10, 0, 0, 0);
        return d;
      },
    },
    {
      label: '다음 주',
      description: '월요일 09:00',
      getDate: () => {
        const d = new Date();
        const day = d.getDay();
        const daysUntilMon = day === 0 ? 1 : (8 - day);
        d.setDate(d.getDate() + daysUntilMon);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
  ];
}

/** ISO string (e.g. "2025-01-15T09:00") → datetime-local input value */
function toDatetimeLocalValue(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  // datetime-local은 "YYYY-MM-DDTHH:mm" 형식
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local input value → ISO string (local timezone) */
function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

function formatRemindAt(isoString: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

export function ReminderDialog({
  open,
  onOpenChange,
  clipId,
  currentRemindAt,
}: ReminderDialogProps) {
  const [customValue, setCustomValue] = useState<string>(
    currentRemindAt ? toDatetimeLocalValue(currentRemindAt) : ''
  );

  const setReminder = useSetReminder();
  const cancelReminder = useCancelReminder();

  const isPending = setReminder.isPending || cancelReminder.isPending;

  function handlePreset(preset: Preset) {
    const iso = preset.getDate().toISOString();
    setReminder.mutate(
      { clipId, remindAt: iso },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  function handleCustomSubmit() {
    if (!customValue) return;
    const iso = fromDatetimeLocalValue(customValue);
    setReminder.mutate(
      { clipId, remindAt: iso },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  function handleCancel() {
    cancelReminder.mutate(
      { clipId },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  const presets = buildPresets();

  // datetime-local 최솟값: 지금 이후만 선택 가능
  const nowLocal = toDatetimeLocalValue(new Date().toISOString());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-sm rounded-2xl"
        aria-describedby="reminder-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Bell size={16} className="text-primary" aria-hidden="true" />
            리마인더 설정
          </DialogTitle>
          <p id="reminder-description" className="sr-only">
            클립을 다시 읽을 시간을 설정합니다. 프리셋 중 하나를 선택하거나 직접 날짜와 시간을 입력하세요.
          </p>
        </DialogHeader>

        {/* 현재 리마인더 표시 */}
        {currentRemindAt && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock size={13} className="shrink-0 text-primary" />
              <span className="text-xs font-medium text-primary">
                {formatRemindAt(currentRemindAt)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              disabled={isPending}
              onClick={handleCancel}
            >
              <BellOff size={13} className="mr-1" />
              취소
            </Button>
          </div>
        )}

        {/* 프리셋 버튼 */}
        <div className="grid grid-cols-1 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={isPending}
              onClick={() => handlePreset(preset)}
              className={cn(
                'flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 text-left text-sm',
                'transition-colors hover:border-primary/40 hover:bg-accent/60',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <span className="font-medium text-foreground">{preset.label}</span>
              <span className="text-xs text-muted-foreground">{preset.description}</span>
            </button>
          ))}
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[11px] font-medium text-muted-foreground/60">직접 설정</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        {/* 커스텀 날짜/시간 선택 */}
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={customValue}
            min={nowLocal}
            onChange={(e) => setCustomValue(e.target.value)}
            disabled={isPending}
            aria-label="리마인더 날짜 및 시간 직접 입력"
            className={cn(
              'flex-1 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm text-foreground',
              'focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />
          <Button
            size="sm"
            disabled={!customValue || isPending}
            onClick={handleCustomSubmit}
            className="shrink-0 rounded-xl bg-gradient-brand px-4 text-white shadow-brand"
          >
            설정
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
