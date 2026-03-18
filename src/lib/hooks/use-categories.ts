'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { supabase } from '@/lib/supabase/client';
import type { Category } from '@/types/database';

export function useCategories() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async (): Promise<Category[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*, clips(count)')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 300_000,
  });
}
