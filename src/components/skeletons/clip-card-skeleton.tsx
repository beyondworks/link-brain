import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ClipCardSkeletonProps {
  count?: number;
  className?: string;
}

function ClipCardSkeletonItem({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', className)}>
      {/* Thumbnail */}
      <Skeleton className="aspect-video w-full rounded-none" />
      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        {/* Meta row */}
        <div className="mt-1 flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function ClipCardSkeleton({ count = 6, className }: ClipCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ClipCardSkeletonItem key={i} className={className} />
      ))}
    </>
  );
}
