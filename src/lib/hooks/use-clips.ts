'use client';

import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { supabase } from '@/lib/supabase/client';
import type { ClipData, ClipContent } from '@/types/database';
import type { ClipFilters, ClipSortBy, SortOrder } from '@/types/clip';
import { getErrorMessage } from '@/lib/utils/get-error-message';

const PAGE_SIZE = 30;

interface UseClipsOptions {
  filters?: ClipFilters;
  sortBy?: ClipSortBy;
  sortOrder?: SortOrder;
  search?: string;
  enabled?: boolean;
}

export function useClips(options: UseClipsOptions = {}) {
  const { user: authUser } = useSupabase();
  const { user } = useCurrentUser();
  const {
    filters,
    sortBy = 'created_at',
    sortOrder = 'desc',
    search,
    enabled = true,
  } = options;

  return useInfiniteQuery({
    queryKey: ['clips', user?.id, filters, sortBy, sortOrder, search],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return { data: [], nextPage: null };

      let query = supabase
        .from('clips')
        .select('*')
        .eq('user_id', user.id)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      // Apply filters
      if (filters?.platform) {
        query = query.eq('platform', filters.platform);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.collectionId) {
        // Join through clip_collections junction table, scoped to current user
        const { data: clipIds } = await supabase
          .from('clip_collections')
          .select('clip_id, clips!inner(user_id)')
          .eq('collection_id', filters.collectionId)
          .eq('clips.user_id', user.id);
        if (clipIds && clipIds.length > 0) {
          query = query.in('id', clipIds.map((r: { clip_id: string }) => r.clip_id));
        } else {
          return { data: [], nextPage: null };
        }
      }
      if (filters?.isFavorite) {
        query = query.eq('is_favorite', true);
      }
      if (filters?.isReadLater) {
        query = query.eq('is_read_later', true);
      }
      if (filters?.isArchived !== undefined) {
        query = query.eq('is_archived', filters.isArchived);
      } else {
        // Default: exclude archived
        query = query.eq('is_archived', false);
      }

      // Date range filter
      if (filters?.dateRange?.from) {
        query = query.gte('created_at', filters.dateRange.from);
      }
      if (filters?.dateRange?.to) {
        query = query.lte('created_at', filters.dateRange.to);
      }

      // AI analysis filter
      if (filters?.hasAiAnalysis === true) {
        query = query.not('summary', 'is', null);
      } else if (filters?.hasAiAnalysis === false) {
        query = query.is('summary', null);
      }

      // Read status filter (based on reading_progress table, completed_at or scroll_percentage >= 80)
      if (filters?.readStatus === 'read') {
        const { data: readRows } = await supabase
          .from('reading_progress')
          .select('clip_id')
          .eq('user_id', user.id)
          .or('completed_at.not.is.null,scroll_percentage.gte.80');
        const readIds = (readRows ?? []).map((r: { clip_id: string }) => r.clip_id);
        if (readIds.length > 0) {
          query = query.in('id', readIds);
        } else {
          return { data: [], nextPage: null };
        }
      } else if (filters?.readStatus === 'unread') {
        const { data: readRows } = await supabase
          .from('reading_progress')
          .select('clip_id')
          .eq('user_id', user.id)
          .or('completed_at.not.is.null,scroll_percentage.gte.80');
        const readIds = (readRows ?? []).map((r: { clip_id: string }) => r.clip_id);
        if (readIds.length > 0) {
          query = query.not('id', 'in', `(${readIds.join(',')})` );
        }
      }

      // Full-text search + ILIKE fallback for partial/English matches
      if (search && search.trim()) {
        const q = search.trim();
        // Escape ILIKE special chars
        const esc = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
        // FTS (config must match stored tsvector 'simple') OR title/summary ILIKE
        query = query.or(
          `fts.wfts(simple).${q},title.ilike.%${esc}%,summary.ilike.%${esc}%`
        );
      }

      const { data, error } = await query;

      if (error) throw new Error(getErrorMessage(error, '클립을 불러오지 못했습니다.'));

      return {
        data: (data ?? []) as ClipData[],
        nextPage: data && data.length === PAGE_SIZE ? pageParam + PAGE_SIZE : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: enabled && !!authUser && !!user,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    // Poll every 3s when any clip is still being processed
    refetchInterval: (query) => {
      const pages = query.state.data?.pages ?? [];
      const hasPending = pages.some(p =>
        p.data.some(c => c.processing_status === 'pending' || c.processing_status === 'processing')
      );
      return hasPending ? 3_000 : false;
    },
  });
}

export function useClip(clipId: string | null) {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['clip', clipId],
    queryFn: async () => {
      if (!clipId) return null;

      const { data, error } = await supabase
        .from('clips')
        .select('*, clip_contents(*)')
        .eq('id', clipId)
        .single();

      if (error) throw new Error(getErrorMessage(error, '클립을 불러오지 못했습니다.'));
      return data as ClipData & { clip_contents: ClipContent[] };
    },
    enabled: !!clipId && !!user,
    staleTime: 60_000,
    // Poll every 3s while clip is still being processed
    refetchInterval: (query) => {
      const clip = query.state.data;
      if (!clip) return false;
      return clip.processing_status === 'pending' || clip.processing_status === 'processing'
        ? 3_000
        : false;
    },
  });
}

export function useFavoriteClips() {
  return useClips({
    filters: { isFavorite: true, isArchived: false },
  });
}

export function useArchivedClips() {
  return useClips({
    filters: { isArchived: true },
  });
}

export function useReadLaterClips() {
  return useClips({
    filters: { isReadLater: true, isArchived: false },
  });
}

export function useClipsCount() {
  const { user: authUser } = useSupabase();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['clips-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (error) throw new Error(getErrorMessage(error, '클립을 불러오지 못했습니다.'));
      return count ?? 0;
    },
    enabled: !!authUser && !!user,
    staleTime: 30_000,
  });
}
