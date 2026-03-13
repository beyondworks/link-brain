import { cn } from '@/lib/utils';

interface UsageBarProps {
  label: string;
  used: number;
  limit: number; // -1 = unlimited
  className?: string;
}

export function UsageBar({ label, used, limit, className }: UsageBarProps) {
  if (limit === -1) {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-muted-foreground">무제한</span>
        </div>
      </div>
    );
  }

  const pct = limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  const barColor =
    pct >= 100
      ? 'bg-red-500'
      : pct >= 80
        ? 'bg-yellow-500'
        : 'bg-primary';

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn('h-1.5 rounded-full', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
