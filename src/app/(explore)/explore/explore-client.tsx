'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, AlertCircle, Globe, Heart, Eye } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import {
  useExploreClips,
  type ExploreClip,
  type ExploreSort,
  type ExploreCategoryKey,
} from '@/lib/hooks/use-explore';
import { CategoryChips } from '@/components/explore/category-chips';

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  twitter: 'Twitter',
  github: 'GitHub',
  web: 'Web',
  notion: 'Notion',
  substack: 'Substack',
  medium: 'Medium',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

const SORT_OPTIONS: { value: ExploreSort; label: string }[] = [
  { value: 'recent', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'trending', label: '트렌딩' },
];

function getPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform.toLowerCase()] ?? platform;
}

function ExploreCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3 p-4 rounded-2xl border-border/60">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-20 mt-1" />
    </Card>
  );
}

function ExploreCard({ clip }: { clip: ExploreClip }) {
  return (
    <Link href={`/clip/${clip.id}`}>
      <Card className="group flex flex-col gap-2 p-4 rounded-2xl border-border/60 hover:shadow-card-hover hover:border-border transition-spring cursor-pointer h-full">
        {/* Platform + category badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <Globe className="h-3 w-3" />
            {getPlatformLabel(clip.platform)}
          </span>
          {clip.category && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {clip.category}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-foreground/80 transition-colors">
          {clip.title ?? '제목 없음'}
        </h3>

        {/* Summary */}
        {clip.summary && (
          <p className="line-clamp-3 text-xs text-muted-foreground leading-relaxed">
            {clip.summary}
          </p>
        )}

        {/* Footer: time + stats */}
        <div className="mt-auto pt-1 flex items-center justify-between">
          <p className="text-xs text-subtle">{formatRelativeTime(clip.createdAt)}</p>
          <div className="flex items-center gap-2.5 text-xs text-subtle">
            {clip.likesCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Heart className="h-3 w-3" />
                {clip.likesCount}
              </span>
            )}
            {clip.views > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="h-3 w-3" />
                {clip.views}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ExploreCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Globe className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <p className="text-sm font-medium text-muted-foreground">공개 클립이 없습니다</p>
      <p className="mt-1 text-xs text-subtle">다른 카테고리나 정렬을 시도해 보세요.</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="h-12 w-12 text-destructive/60 mb-4" />
      <p className="text-sm font-medium text-muted-foreground">클립을 불러오지 못했습니다</p>
      <p className="mt-1 text-xs text-subtle">{message}</p>
    </div>
  );
}

interface ClipGridWithInfiniteScrollProps {
  category: ExploreCategoryKey;
  sort: ExploreSort;
  searchQuery: string;
}

function ClipGridWithInfiniteScroll({
  category,
  sort,
  searchQuery,
}: ClipGridWithInfiniteScrollProps) {
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, error } =
    useExploreClips({ category, sort });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const onIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(onIntersect, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect]);

  if (isLoading) return <SkeletonGrid />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const allClips = (data?.pages ?? []).flatMap((page) => page.data);

  const filtered = searchQuery.trim()
    ? allClips.filter(
        (c) =>
          c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allClips;

  if (filtered.length === 0) return <EmptyState />;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((clip) => (
          <ExploreCard key={clip.id} clip={clip} />
        ))}
      </div>

      {/* 무한 스크롤 sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ExploreCardSkeleton key={i} />
          ))}
        </div>
      )}
    </>
  );
}

export function ExploreClient() {
  const [category, setCategory] = useState<ExploreCategoryKey>('all');
  const [sort, setSort] = useState<ExploreSort>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">탐색</h1>
        <p className="mt-2 text-muted-foreground">
          다른 사용자의 공개 클립을 발견하고 영감을 얻으세요.
        </p>
      </div>

      {/* Search + Sort */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="클립 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={sort}
          onValueChange={(v) => setSort(v as ExploreSort)}
        >
          <SelectTrigger className="w-32 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category chips */}
      <div className="mb-6">
        <CategoryChips selected={category} onChange={setCategory} />
      </div>

      {/* Content */}
      <ClipGridWithInfiniteScroll
        category={category}
        sort={sort}
        searchQuery={searchQuery}
      />
    </div>
  );
}
