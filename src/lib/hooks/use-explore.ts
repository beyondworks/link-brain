'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

export interface ExploreClip {
  id: string;
  title: string | null;
  summary: string | null;
  url: string;
  platform: string;
  thumbnailUrl: string | null;
  createdAt: string;
  userId: string;
  likesCount: number;
  views: number;
  category: string | null;
}

export type ExploreSort = 'recent' | 'popular' | 'trending';

export const EXPLORE_CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: '기술', label: '기술' },
  { key: '디자인', label: '디자인' },
  { key: '비즈니스', label: '비즈니스' },
  { key: '학습', label: '학습' },
  { key: '기타', label: '기타' },
] as const;

export type ExploreCategoryKey = (typeof EXPLORE_CATEGORIES)[number]['key'];

interface ApiMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface ApiResponse {
  success: boolean;
  data: ExploreClip[];
  meta: ApiMeta;
}

const PAGE_SIZE = 20;

async function fetchExploreClips({
  category,
  sort,
  page,
}: {
  category: ExploreCategoryKey;
  sort: ExploreSort;
  page: number;
}): Promise<ApiResponse> {
  const params = new URLSearchParams({
    sort,
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (category !== 'all') {
    params.set('category', category);
  }

  const res = await fetch(`/api/v1/explore?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Explore API error: ${res.status}`);
  }
  return res.json() as Promise<ApiResponse>;
}

export function useExploreClips({
  category,
  sort,
}: {
  category: ExploreCategoryKey;
  sort: ExploreSort;
}) {
  return useInfiniteQuery({
    queryKey: ['explore', 'clips', category, sort],
    queryFn: ({ pageParam }) =>
      fetchExploreClips({ category, sort, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.meta.hasMore) return undefined;
      return allPages.length + 1;
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
}
