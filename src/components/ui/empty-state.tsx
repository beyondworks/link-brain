import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-24 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/40">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
      )}

      <p className="text-base font-semibold text-foreground">{title}</p>

      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{description}</p>
      )}

      {action && (
        <Button
          size="sm"
          variant="outline"
          onClick={action.onClick}
          className="mt-5 rounded-xl"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
