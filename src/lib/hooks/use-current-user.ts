'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/components/providers/supabase-provider';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@/types/database';

/**
 * Fetches the current user's public profile (public.users row).
 * Returns the app-level user with all profile fields.
 * This is different from useSupabase().user which is the auth user.
 */
export function useCurrentUser() {
  const { user: authUser, isLoading: authLoading } = useSupabase();

  const query = useQuery({
    queryKey: ['user', authUser?.id],
    queryFn: async (): Promise<User | null> => {
      if (!authUser) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // no rows
        throw error;
      }

      return data;
    },
    enabled: !!authUser && !authLoading,
    staleTime: 60_000,
  });

  return {
    user: query.data ?? null,
    authUser,
    isLoading: authLoading || query.isLoading,
    error: query.error,
  };
}
