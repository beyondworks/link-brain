'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface RelatedClip {
  id: string;
  title: string | null;
  url: string;
  image: string | null;
  platform: string | null;
  summary: string | null;
  similarity: number;
}

interface RelatedClipsProps {
  clipId: string;
  userId: string;
}

const GRADIENT_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
];

function getGradient(id: string): string {
  return GRADIENT_COLORS[id.charCodeAt(0) % GRADIENT_COLORS.length];
}

async function fetchRelatedClips(clipId: string): Promise<RelatedClip[]> {
  const res = await fetch(`/api/v1/clips/${clipId}/related`);
  if (!res.ok) throw new Error('관련 클립 로드 실패');
  const json = await res.json() as { success: boolean; data: RelatedClip[] };
  return json.data;
}

function RelatedClipSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="h-14 w-20 flex-shrink-0 rounded-md" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function RelatedClips({ clipId, userId: _userId }: RelatedClipsProps) {
  const router = useRouter();

  const { data: clips, isLoading, error } = useQuery({
    queryKey: ['related-clips', clipId],
    queryFn: () => fetchRelatedClips(clipId),
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-1">
        <h3 className="mb-2 text-sm font-semibold text-foreground">관련 클립</h3>
        {Array.from({ length: 3 }).map((_, i) => (
          <RelatedClipSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error || !clips || clips.length === 0) {
    return (
      <div className="space-y-1">
        <h3 className="mb-2 text-sm font-semibold text-foreground">관련 클립</h3>
        <p className="text-xs text-muted-foreground py-4 text-center">
          관련 클립이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h3 className="mb-2 text-sm font-semibold text-foreground">관련 클립</h3>
      <div className="space-y-1">
        {clips.map((clip) => {
          const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
          const gradient = getGradient(clip.id);
          const similarityPct = clip.similarity > 0
            ? `${Math.round(clip.similarity * 100)}% 일치`
            : null;

          return (
            <Card
              key={clip.id}
              onClick={() => router.push(`/clips/${clip.id}`)}
              className="flex cursor-pointer items-start gap-3 p-3 transition-shadow hover:shadow-md"
            >
              {/* 썸네일 */}
              <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {clip.image ? (
                  <Image
                    src={clip.image}
                    alt={clip.title ?? ''}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div
                    className={cn(
                      'flex h-full w-full items-center justify-center bg-gradient-to-br',
                      gradient
                    )}
                  >
                    <span className="text-lg font-bold text-white">{firstLetter}</span>
                  </div>
                )}
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <p className="line-clamp-2 text-xs font-medium leading-snug">
                  {clip.title ?? clip.url}
                </p>
                {clip.summary && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {clip.summary}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  {clip.platform && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {clip.platform}
                    </span>
                  )}
                  {similarityPct && (
                    <span className="text-xs text-primary font-medium">
                      {similarityPct}
                    </span>
                  )}
                  <a
                    href={clip.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    aria-label="원본 링크 열기"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
