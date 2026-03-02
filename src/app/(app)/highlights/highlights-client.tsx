'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAllAnnotations, useDeleteAnnotation } from '@/hooks/mutations/use-annotations';
import type { AnnotationWithClip } from '@/hooks/mutations/use-annotations';
import { HighlightBadge, HIGHLIGHT_COLORS } from '@/components/media/text-highlighter';

type ColorEntry = (typeof HIGHLIGHT_COLORS)[number];
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Download, Trash2, ExternalLink, Highlighter, AlertTriangle } from 'lucide-react';

// ─── 마크다운 내보내기 ─────────────────────────────────────────────────────────

function exportToMarkdown(annotations: AnnotationWithClip[]) {
  const lines: string[] = ['# 내 하이라이트\n'];

  const groups = new Map<string, AnnotationWithClip[]>();
  for (const a of annotations) {
    const key = a.clip_id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  for (const [, items] of groups) {
    const title = items[0].clip_title ?? '제목 없음';
    const url = items[0].clip_url ?? '';
    lines.push(`## [${title}](${url})\n`);

    for (const item of items) {
      const colorLabel = HIGHLIGHT_COLORS.find((c: ColorEntry) => c.id === item.color)?.label ?? item.color;
      if (item.selected_text) {
        lines.push(`> ${item.selected_text}`);
        lines.push(`> — *${colorLabel}* | ${new Date(item.created_at).toLocaleDateString('ko-KR')}`);
      }
      if (item.note_text) {
        lines.push(`\n**메모:** ${item.note_text}`);
      }
      lines.push('');
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `highlights-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── 색상 인디케이터 그래디언트 맵 ───────────────────────────────────────────

const COLOR_GRADIENT: Record<string, string> = {
  yellow: 'from-yellow-400 to-amber-400',
  green: 'from-green-400 to-emerald-400',
  blue: 'from-blue-400 to-cyan-400',
  pink: 'from-pink-400 to-rose-400',
  purple: 'from-purple-400 to-violet-400',
};


// ─── 하이라이트 카드 ──────────────────────────────────────────────────────────

interface HighlightCardProps {
  annotation: AnnotationWithClip;
  grouped: boolean;
  index?: number;
}

function HighlightCard({ annotation, grouped, index = 0 }: HighlightCardProps) {
  const deleteAnnotation = useDeleteAnnotation();

  const handleDelete = () => {
    if (confirm('이 하이라이트를 삭제하시겠습니까?')) {
      deleteAnnotation.mutate({ annotationId: annotation.id, clipId: annotation.clip_id });
    }
  };

  const colorInfo = HIGHLIGHT_COLORS.find((c: ColorEntry) => c.id === annotation.color);
  const markBg = colorInfo?.bg ?? 'bg-yellow-200';
  const gradient = COLOR_GRADIENT[annotation.color] ?? 'from-yellow-400 to-amber-400';

  return (
    <Card
      className="card-glow group relative overflow-hidden rounded-2xl border bg-card"
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
    >
      {/* Gradient color bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b', gradient)} />

      <CardContent className="p-4 pl-5">
        {/* 클립 출처 (비그룹 모드에서만) */}
        {!grouped && annotation.clip_title && (
          <div className="mb-2.5 flex items-center gap-1.5">
            <span className="truncate text-xs font-medium text-muted-foreground">{annotation.clip_title}</span>
            {annotation.clip_url && (
              <Link
                href={annotation.clip_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground transition-spring hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}

        {/* 하이라이트 텍스트 */}
        {annotation.selected_text && (
          <p
            className={cn(
              'mb-2 rounded-lg px-3 py-2 text-sm leading-relaxed font-medium',
              markBg
            )}
          >
            {annotation.selected_text}
          </p>
        )}

        {/* 메모 */}
        {annotation.note_text && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{annotation.note_text}</p>
        )}

        {/* 하단 메타 */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HighlightBadge color={annotation.color} />
            <span className="text-xs text-muted-foreground">
              {new Date(annotation.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 transition-spring group-hover:opacity-100">
            {annotation.clip_url && (
              <Link href={`/clip/${annotation.clip_id}`} className="inline-flex">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover-scale" title="원본 클립으로 이동">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover-scale"
              onClick={handleDelete}
              title="삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 클립별 그룹 ──────────────────────────────────────────────────────────────

interface ClipGroupProps {
  clipId: string;
  clipTitle: string | null;
  clipUrl: string | null;
  annotations: AnnotationWithClip[];
}

function ClipGroup({ clipTitle, clipUrl, annotations }: ClipGroupProps) {
  return (
    <div className="animate-fade-in-up">
      <div className="mb-3 flex items-center gap-2 pb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        <h3 className="shrink-0 px-2 font-semibold text-sm text-foreground truncate max-w-xs">{clipTitle ?? '제목 없음'}</h3>
        {clipUrl && (
          <Link href={clipUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground transition-spring hover:text-foreground" />
          </Link>
        )}
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {annotations.length}
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
      </div>
      <div className="space-y-3">
        {annotations.map((a, i) => (
          <HighlightCard key={a.id} annotation={a} grouped index={i} />
        ))}
      </div>
    </div>
  );
}

// ─── 메인 클라이언트 컴포넌트 ─────────────────────────────────────────────────

export function HighlightsClient() {
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [groupByClip, setGroupByClip] = useState(false);

  const { data: annotations = [], isLoading, isError, error, refetch } = useAllAnnotations(
    colorFilter === 'all' ? undefined : colorFilter
  );

  const grouped = useMemo(() => {
    if (!groupByClip) return null;
    const map = new Map<string, AnnotationWithClip[]>();
    for (const a of annotations) {
      if (!map.has(a.clip_id)) map.set(a.clip_id, []);
      map.get(a.clip_id)!.push(a);
    }
    return map;
  }, [annotations, groupByClip]);

  if (isError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold">하이라이트를 불러오지 못했습니다</h2>
        <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'}</p>
        <Button onClick={() => refetch()} variant="outline">다시 시도</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">하이라이트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-8 lg:px-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow-orb absolute -right-20 -top-20 h-56 w-56 opacity-25" />
      </div>

      {/* 페이지 헤더 */}
      <div className="relative mb-8 animate-blur-in">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="icon-glow relative rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-3 ring-1 ring-primary/20">
              <Highlighter size={20} className="animate-breathe text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">내 하이라이트</h1>
              <p className="text-sm text-muted-foreground">
                총 <span className="font-semibold text-foreground">{annotations.length}</span>개의 하이라이트
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl border-border transition-spring hover-lift"
              onClick={() => exportToMarkdown(annotations)}
              disabled={annotations.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              내보내기
            </Button>

            <Button
              variant={groupByClip ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'rounded-xl transition-spring',
                groupByClip
                  ? 'bg-gradient-brand glow-brand-sm shadow-none'
                  : 'border-border hover-lift'
              )}
              onClick={() => setGroupByClip((v) => !v)}
            >
              클립별 묶기
            </Button>
          </div>
        </div>
      </div>

      {/* 색상 필터 */}
      <div className="relative mb-6 flex items-center gap-2.5 animate-blur-in animation-delay-100">
        <span className="text-xs font-medium text-muted-foreground shrink-0">색상 필터</span>
        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="h-8 w-36 rounded-lg text-xs focus:ring-primary/30">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">전체</SelectItem>
            {HIGHLIGHT_COLORS.map((c: ColorEntry) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <span className={cn('inline-block h-2.5 w-2.5 rounded-full', c.bg)} />
                  {c.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 빈 상태 */}
      {annotations.length === 0 && (
        <div className="relative flex flex-col items-center justify-center py-28 text-center animate-blur-in animation-delay-200">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative mb-4 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 p-5 ring-1 ring-primary/15">
            <Highlighter size={28} className="animate-float text-primary" />
          </div>
          <p className="relative text-base font-semibold text-foreground">하이라이트가 없습니다</p>
          <p className="relative mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
            클립을 읽으면서 텍스트를 선택해 하이라이트를 추가해보세요.
          </p>
        </div>
      )}

      {/* 목록 */}
      {annotations.length > 0 && !groupByClip && (
        <div className="relative space-y-3">
          {annotations.map((a, i) => (
            <div key={a.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}>
              <HighlightCard annotation={a} grouped={false} index={i} />
            </div>
          ))}
        </div>
      )}

      {/* 그룹 목록 */}
      {annotations.length > 0 && groupByClip && grouped && (
        <div className="relative space-y-8">
          {Array.from(grouped.entries()).map(([clipId, items]) => (
            <ClipGroup
              key={clipId}
              clipId={clipId}
              clipTitle={items[0].clip_title}
              clipUrl={items[0].clip_url}
              annotations={items}
            />
          ))}
        </div>
      )}
    </div>
  );
}
