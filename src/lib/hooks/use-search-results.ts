'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { supabase } from '@/lib/supabase/client';
import type { Category, Collection, ClipData } from '@/types/database';

export interface SearchResults {
  categories: Category[];
  collections: Collection[];
  images: ClipData[];
}

export function useSearchResults(search: string) {
  const { user } = useCurrentUser();
  const enabled = !!user && search.trim().length > 0;

  const esc = search.trim().replace(/%/g, '\\%').replace(/_/g, '\\_');

  const categoriesQuery = useQuery({
    queryKey: ['search-categories', user?.id, search],
    queryFn: async (): Promise<Category[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .ilike('name', `%${esc}%`)
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    enabled,
    staleTime: 15_000,
  });

  const collectionsQuery = useQuery({
    queryKey: ['search-collections', user?.id, search],
    queryFn: async (): Promise<Collection[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user.id)
        .or(`name.ilike.%${esc}%,description.ilike.%${esc}%`)
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Collection[];
    },
    enabled,
    staleTime: 15_000,
  });

  const imagesQuery = useQuery({
    queryKey: ['search-images', user?.id, search],
    queryFn: async (): Promise<ClipData[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('clips')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'image')
        .eq('is_archived', false)
        .or(`title.ilike.%${esc}%,summary.ilike.%${esc}%`)
        .limit(5);
      if (error) throw error;
      return (data ?? []) as ClipData[];
    },
    enabled,
    staleTime: 15_000,
  });

  return {
    categories: categoriesQuery.data ?? [],
    collections: collectionsQuery.data ?? [],
    images: imagesQuery.data ?? [],
    isLoading: categoriesQuery.isLoading || collectionsQuery.isLoading || imagesQuery.isLoading,
    hasResults:
      (categoriesQuery.data?.length ?? 0) > 0 ||
      (collectionsQuery.data?.length ?? 0) > 0 ||
      (imagesQuery.data?.length ?? 0) > 0,
  };
}
