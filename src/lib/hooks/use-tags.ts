'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/components/providers/supabase-provider';
import { supabase } from '@/lib/supabase/client';

export interface Tag {
  id: string;
  name: string;
}

export function useTags() {
  const { user } = useSupabase();

  return useQuery({
    queryKey: ['tags', user?.id],
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Tag[];
    },
    enabled: !!user,
    staleTime: 120_000,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string): Promise<Tag> => {
      // Check for existing tag first (case-insensitive)
      const { data: existing } = await supabase
        .from('tags')
        .select('id, name')
        .ilike('name', name)
        .single();

      if (existing) return existing as Tag;

      const { data, error } = await supabase
        .from('tags')
        .insert({ name } as never)
        .select('id, name')
        .single();

      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
