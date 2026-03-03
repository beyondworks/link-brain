'use client';

import { useQuery } from '@tanstack/react-query';

export interface RelatedClip {
  id: string;
  title: string | null;
  url: string;
  image: string | null;
  platform: string | null;
  summary: string | null;
  similarity: number;
  commonTags: string[];
}

interface ApiSuccess {
  success: true;
  data: RelatedClip[];
}

async function fetchRelatedClips(clipId: string): Promise<RelatedClip[]> {
  const res = await fetch(`/api/v1/clips/${clipId}/related`);
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error('관련 클립 로드 실패');
  }
  const json = (await res.json()) as ApiSuccess;
  return json.data;
}

export function useRelatedClips(clipId: string) {
  const { data: clips = [], isLoading } = useQuery({
    queryKey: ['related-clips', clipId],
    queryFn: () => fetchRelatedClips(clipId),
    staleTime: 5 * 60 * 1000, // 5분
    retry: false,
    enabled: Boolean(clipId),
  });

  return { clips, isLoading };
}
