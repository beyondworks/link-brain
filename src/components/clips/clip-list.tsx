'use client';

import type { ClipData } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const PLATFORM_LABELS: Record<string, string> = {
  youtube: '유튜브',
  twitter: 'X (트위터)',
  instagram: '인스타그램',
  threads: '스레드',
  naver: '네이버',
  pinterest: '핀터레스트',
  web: '웹',
  tiktok: '틱톡',
  linkedin: '링크드인',
  github: 'GitHub',
  other: '기타',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

interface ClipListProps {
  clips: ClipData[];
}

export function ClipList({ clips }: ClipListProps) {
  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-medium text-foreground">클립이 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">
          상단의 + 버튼을 눌러 첫 번째 클립을 추가해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clips.map((clip) => (
        <Card
          key={clip.id}
          className="flex flex-col gap-3 p-4 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-snug line-clamp-2">
              {clip.title ?? '(제목 없음)'}
            </h3>
            {clip.is_favorite && (
              <span className="shrink-0 text-yellow-500 text-xs">★</span>
            )}
          </div>

          {clip.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {clip.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-auto">
            <Badge variant="outline" className="text-xs">
              {PLATFORM_LABELS[clip.platform] ?? clip.platform}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {formatDate(clip.created_at)}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
