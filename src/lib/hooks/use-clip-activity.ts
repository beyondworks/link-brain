'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/components/providers/supabase-provider';

export type ClipActivityAction =
  | 'created'
  | 'updated'
  | 'favorited'
  | 'unfavorited'
  | 'archived'
  | 'unarchived'
  | 'shared'
  | 'tag_added'
  | 'tag_removed'
  | 'collection_added'
  | 'collection_removed'
  | 'highlighted'
  | 'note_updated';

export interface ClipActivity {
  id: string;
  clip_id: string;
  user_id: string;
  action: ClipActivityAction;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

async function fetchClipActivity(clipId: string): Promise<ClipActivity[]> {
  const res = await fetch(`/api/v1/clips/${clipId}/activity`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch activity: ${text}`);
  }
  const json = (await res.json()) as ApiSuccess<ClipActivity[]>;
  return json.data ?? [];
}

/**
 * 클립의 활동 로그를 조회합니다.
 */
export function useClipActivity(clipId: string) {
  const { user } = useSupabase();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['clip-activity', clipId],
    queryFn: () => fetchClipActivity(clipId),
    enabled: !!clipId && !!user,
    staleTime: 30_000,
  });

  return {
    activities: data ?? [],
    isLoading,
    isError,
  };
}
