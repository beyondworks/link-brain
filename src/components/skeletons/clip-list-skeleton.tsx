import { Skeleton } from '@/components/ui/skeleton';
import { ClipCardSkeleton } from './clip-card-skeleton';

interface ClipListSkeletonProps {
  viewMode?: 'grid' | 'list' | 'headlines';
  count?: number;
}

function ClipRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton className="h-10 w-10 flex-shrink-0 rounded-md" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="hidden h-3 w-16 sm:block" />
      <Skeleton className="hidden h-3 w-12 md:block" />
      <Skeleton className="h-7 w-7 rounded-md" />
    </div>
  );
}

function ClipHeadlineSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <Skeleton className="h-1.5 w-1.5 flex-shrink-0 rounded-full" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-3 w-12 flex-shrink-0" />
    </div>
  );
}

export function ClipListSkeleton({ viewMode = 'grid', count = 6 }: ClipListSkeletonProps) {
  if (viewMode === 'list') {
    return (
      <div className="divide-y divide-border rounded-xl border bg-card">
        {Array.from({ length: count }).map((_, i) => (
          <ClipRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (viewMode === 'headlines') {
    return (
      <div className="space-y-0.5">
        {Array.from({ length: count }).map((_, i) => (
          <ClipHeadlineSkeleton key={i} />
        ))}
      </div>
    );
  }

  // grid (default)
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ClipCardSkeleton count={count} />
    </div>
  );
}
