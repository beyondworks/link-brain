'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useClipActivity, type ClipActivity, type ClipActivityAction } from '@/lib/hooks/use-clip-activity';
import {
  Star,
  Archive,
  Share2,
  Tag,
  Folder,
  Highlighter,
  FileText,
  Plus,
  Edit3,
  StarOff,
  ArchiveX,
  History,
} from 'lucide-react';

/* ─── Relative time ──────────────────────────────────────────────────────── */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr));
}

function formatAbsoluteTime(dateStr: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

/* ─── Action metadata ────────────────────────────────────────────────────── */
interface ActionMeta {
  label: string;
  icon: React.ReactNode;
  dotClass: string;
}

function getActionMeta(action: ClipActivityAction, details: Record<string, unknown> | null): ActionMeta {
  switch (action) {
    case 'created':
      return {
        label: '클립 저장됨',
        icon: <Plus size={11} />,
        dotClass: 'bg-primary text-white',
      };
    case 'updated':
      return {
        label: '정보 수정됨',
        icon: <Edit3 size={11} />,
        dotClass: 'bg-blue-500 text-white',
      };
    case 'favorited':
      return {
        label: '즐겨찾기 추가',
        icon: <Star size={11} />,
        dotClass: 'bg-yellow-400 text-white',
      };
    case 'unfavorited':
      return {
        label: '즐겨찾기 해제',
        icon: <StarOff size={11} />,
        dotClass: 'bg-muted-foreground text-white',
      };
    case 'archived':
      return {
        label: '아카이브됨',
        icon: <Archive size={11} />,
        dotClass: 'bg-primary text-white',
      };
    case 'unarchived':
      return {
        label: '아카이브 해제',
        icon: <ArchiveX size={11} />,
        dotClass: 'bg-muted-foreground text-white',
      };
    case 'shared':
      return {
        label: '공유 링크 생성',
        icon: <Share2 size={11} />,
        dotClass: 'bg-sky-500 text-white',
      };
    case 'tag_added': {
      const tagName = typeof details?.tag === 'string' ? details.tag : '';
      return {
        label: tagName ? `태그 추가: ${tagName}` : '태그 추가',
        icon: <Tag size={11} />,
        dotClass: 'bg-violet-500 text-white',
      };
    }
    case 'tag_removed': {
      const tagName = typeof details?.tag === 'string' ? details.tag : '';
      return {
        label: tagName ? `태그 제거: ${tagName}` : '태그 제거',
        icon: <Tag size={11} />,
        dotClass: 'bg-muted-foreground text-white',
      };
    }
    case 'collection_added': {
      const colName = typeof details?.collection === 'string' ? details.collection : '';
      return {
        label: colName ? `컬렉션 추가: ${colName}` : '컬렉션에 추가',
        icon: <Folder size={11} />,
        dotClass: 'bg-orange-500 text-white',
      };
    }
    case 'collection_removed': {
      const colName = typeof details?.collection === 'string' ? details.collection : '';
      return {
        label: colName ? `컬렉션 제거: ${colName}` : '컬렉션에서 제거',
        icon: <Folder size={11} />,
        dotClass: 'bg-muted-foreground text-white',
      };
    }
    case 'highlighted':
      return {
        label: '하이라이트 추가',
        icon: <Highlighter size={11} />,
        dotClass: 'bg-yellow-400 text-white',
      };
    case 'note_updated':
      return {
        label: '메모 수정됨',
        icon: <FileText size={11} />,
        dotClass: 'bg-teal-500 text-white',
      };
    default:
      return {
        label: String(action),
        icon: <History size={11} />,
        dotClass: 'bg-muted-foreground text-white',
      };
  }
}

/* ─── Single activity item ───────────────────────────────────────────────── */
function ActivityItem({
  activity,
  isLast,
}: {
  activity: ClipActivity;
  isLast: boolean;
}) {
  const meta = getActionMeta(activity.action, activity.details);
  const relative = formatRelativeTime(activity.created_at);
  const absolute = formatAbsoluteTime(activity.created_at);

  return (
    <div className="flex gap-3">
      {/* Left: dot + line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
            meta.dotClass
          )}
        >
          {meta.icon}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-border/60" />}
      </div>

      {/* Right: content */}
      <div className={cn('min-w-0 flex-1 pb-4', isLast && 'pb-0')}>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">{meta.label}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default text-xs text-muted-foreground">{relative}</span>
            </TooltipTrigger>
            <TooltipContent side="right">{absolute}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

/* ─── Loading skeleton ───────────────────────────────────────────────────── */
function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
interface Props {
  clipId: string;
}

export function ClipActivityTimeline({ clipId }: Props) {
  const { activities, isLoading, isError } = useClipActivity(clipId);

  if (isLoading) {
    return <ActivitySkeleton />;
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        활동 기록을 불러오지 못했습니다.
      </p>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <History size={20} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">아직 활동 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {activities.map((activity, index) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          isLast={index === activities.length - 1}
        />
      ))}
    </div>
  );
}
