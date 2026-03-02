'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface ExploreClip {
  id: string;
  title: string | null;
  summary: string | null;
  url: string;
  platform: string;
  thumbnail_url: string | null;
  created_at: string;
  user_id: string;
}

export function useTrendingClips() {
  return useQuery({
    queryKey: ['explore', 'trending'],
    queryFn: async (): Promise<ExploreClip[]> => {
      const { data, error } = await supabase
        .from('clips')
        .select('id, title, summary, url, platform, thumbnail_url, created_at, user_id')
        .eq('is_public', true)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as ExploreClip[];
    },
    staleTime: 300_000, // 5 minutes
  });
}

export function useFeaturedClips() {
  return useQuery({
    queryKey: ['explore', 'featured'],
    queryFn: async (): Promise<ExploreClip[]> => {
      const { data, error } = await supabase
        .from('clips')
        .select('id, title, summary, url, platform, thumbnail_url, created_at, user_id')
        .eq('is_public', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        // is_featured column might not exist yet — graceful fallback
        console.warn('[useExplore] Featured query failed, falling back:', error.message);
        return [];
      }
      return (data ?? []) as ExploreClip[];
    },
    staleTime: 300_000,
  });
}
