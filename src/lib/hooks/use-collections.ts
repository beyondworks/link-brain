'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { supabase } from '@/lib/supabase/client';
import type { Collection } from '@/types/database';

export function useCollections() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['collections', user?.id],
    queryFn: async (): Promise<Collection[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useCollection(collectionId: string | null) {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async () => {
      if (!collectionId) return null;

      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('id', collectionId)
        .single();

      if (error) throw error;
      return data as Collection;
    },
    enabled: !!collectionId && !!user,
    staleTime: 60_000,
  });
}

export function useCollectionClips(collectionId: string | null) {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['collection-clips', collectionId],
    queryFn: async () => {
      if (!collectionId) return [];

      const { data, error } = await supabase
        .from('clip_collections')
        .select('clip_id, clips(*)')
        .eq('collection_id', collectionId);

      if (error) throw error;
      return data?.map((row: { clips: unknown }) => row.clips).filter(Boolean) ?? [];
    },
    enabled: !!collectionId && !!user,
    staleTime: 30_000,
  });
}
