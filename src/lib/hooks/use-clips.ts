'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { supabase } from '@/lib/supabase/client';
import type { ClipData } from '@/types/database';
import type { ClipFilters, ClipSortBy, SortOrder } from '@/types/clip';

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

      // Full-text search
      if (search && search.trim()) {
        query = query.textSearch('fts', search.trim(), { type: 'websearch' });
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        data: (data ?? []) as ClipData[],
        nextPage: data && data.length === PAGE_SIZE ? pageParam + PAGE_SIZE : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: enabled && !!authUser && !!user,
    staleTime: 30_000,
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

      if (error) throw error;
      return data as ClipData & { clip_contents: unknown };
    },
    enabled: !!clipId && !!user,
    staleTime: 60_000,
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
