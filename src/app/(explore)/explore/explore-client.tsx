'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, AlertCircle, Globe } from 'lucide-react';
import {
  useExploreClips,
  type ExploreSort,
  type ExploreCategoryKey,
} from '@/lib/hooks/use-explore';
import { CategoryChips } from '@/components/explore/category-chips';
import { ExploreCard, ExploreCardSkeleton } from '@/components/explore/explore-card';

const SORT_OPTIONS: { value: ExploreSort; label: string }[] = [
  { value: 'recent', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'trending', label: '트렌딩' },
];

const SEARCH_DEBOUNCE_MS = 300;

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ExploreCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Globe className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <p className="text-sm font-medium text-muted-foreground">
        {hasSearch ? '검색 결과가 없습니다' : '공개 클립이 없습니다'}
      </p>
      <p className="mt-1 text-xs text-subtle">
        {hasSearch
          ? '다른 검색어를 입력해 보세요.'
          : '다른 카테고리나 정렬을 시도해 보세요.'}
      </p>
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
  search: string;
}

function ClipGridWithInfiniteScroll({
  category,
  sort,
  search,
}: ClipGridWithInfiniteScrollProps) {
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, error } =
    useExploreClips({ category, sort, search });

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

  if (allClips.length === 0) return <EmptyState hasSearch={search.trim().length > 0} />;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {allClips.map((clip) => (
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
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // 검색은 서버에서 처리한다 — 입력만 debounce해서 쿼리 키를 바꾼다.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">탐색</h1>
        <p className="mt-2 text-muted-foreground">
          다른 사용자들이 저장한 공개 클립을 익명으로 둘러보고, 마음에 들면 내 클립에 담으세요.
        </p>
      </div>

      {/* Search + Sort */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="클립 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
      <ClipGridWithInfiniteScroll category={category} sort={sort} search={search} />
    </div>
  );
}
