'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

/**
 * Explore는 익명 공개 라이브러리다 — 저장한 사용자를 식별할 수 있는 필드
 * (userId, author 등)는 응답에도 이 타입에도 존재하지 않는다.
 */
export interface ExploreClip {
  id: string;
  title: string | null;
  summary: string | null;
  url: string;
  platform: string;
  thumbnailUrl: string | null;
  createdAt: string;
  /** 같은 URL을 저장한 서로 다른 사용자 수 */
  saveCount: number;
  views: number;
  category: string | null;
}

export type ExploreSort = 'recent' | 'popular' | 'trending';

/** 'all' 또는 실제 카테고리 이름 — 칩 목록은 서버 집계로 동적 로드 */
export type ExploreCategoryKey = string;

interface ExploreCategoriesResponse {
  success: boolean;
  data: { categories: { name: string; count: number }[] };
}

/** 공개 클립이 실제로 속한 카테고리 상위 목록 (탐색 필터 칩용) */
export function useExploreCategories() {
  return useQuery({
    queryKey: ['explore', 'categories'],
    queryFn: async (): Promise<{ name: string; count: number }[]> => {
      const res = await fetch('/api/v1/explore/categories');
      if (!res.ok) return [];
      const json = (await res.json()) as ExploreCategoriesResponse;
      return json.data?.categories ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

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
  search,
  page,
}: {
  category: ExploreCategoryKey;
  sort: ExploreSort;
  search: string;
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
  if (search.trim()) {
    params.set('search', search.trim());
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
  search = '',
}: {
  category: ExploreCategoryKey;
  sort: ExploreSort;
  /** 서버에서 title/summary ilike로 필터링된다 (호출부에서 debounce) */
  search?: string;
}) {
  return useInfiniteQuery({
    queryKey: ['explore', 'clips', category, sort, search.trim()],
    queryFn: ({ pageParam }) =>
      fetchExploreClips({ category, sort, search, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.meta.hasMore) return undefined;
      return allPages.length + 1;
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
}
