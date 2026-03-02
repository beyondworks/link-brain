import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardSkeletonProps {
  count?: number;
  className?: string;
}

function StatCardSkeletonItem({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border/60 bg-card p-5 shadow-card', className)}>
      {/* Icon row */}
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-md" />
      </div>
      {/* Value */}
      <Skeleton className="mb-1.5 h-8 w-16 rounded-md" />
      {/* Label */}
      <Skeleton className="h-4 w-20 rounded-md" />
    </div>
  );
}

export function StatCardSkeleton({ count = 4, className }: StatCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeletonItem key={i} className={className} />
      ))}
    </>
  );
}
