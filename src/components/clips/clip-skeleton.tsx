import { Skeleton } from '@/components/ui/skeleton';

export function ClipCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Thumbnail */}
      <Skeleton className="aspect-video w-full rounded-none" />
      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="mt-1 flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function ClipRowSkeleton() {
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

export function ClipHeadlineSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <Skeleton className="h-1.5 w-1.5 flex-shrink-0 rounded-full" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-3 w-12 flex-shrink-0" />
    </div>
  );
}
