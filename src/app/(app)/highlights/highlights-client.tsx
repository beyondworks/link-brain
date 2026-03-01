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
import { Download, Trash2, ExternalLink } from 'lucide-react';

// ─── 마크다운 내보내기 ─────────────────────────────────────────────────────────

function exportToMarkdown(annotations: AnnotationWithClip[]) {
  const lines: string[] = ['# 내 하이라이트\n'];

  // 클립별 그룹핑
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

// ─── 하이라이트 카드 ──────────────────────────────────────────────────────────

interface HighlightCardProps {
  annotation: AnnotationWithClip;
  grouped: boolean;
}

function HighlightCard({ annotation, grouped }: HighlightCardProps) {
  const deleteAnnotation = useDeleteAnnotation();

  const handleDelete = () => {
    if (confirm('이 하이라이트를 삭제하시겠습니까?')) {
      deleteAnnotation.mutate({ annotationId: annotation.id, clipId: annotation.clip_id });
    }
  };

  const colorInfo = HIGHLIGHT_COLORS.find((c: ColorEntry) => c.id === annotation.color);
  const markBg = colorInfo?.bg ?? 'bg-yellow-200';

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        {/* 클립 출처 (비그룹 모드에서만) */}
        {!grouped && annotation.clip_title && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate font-medium">{annotation.clip_title}</span>
            {annotation.clip_url && (
              <Link
                href={annotation.clip_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 hover:text-foreground"
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
              'mb-2 rounded px-2 py-1 text-sm leading-relaxed',
              markBg
            )}
          >
            {annotation.selected_text}
          </p>
        )}

        {/* 메모 */}
        {annotation.note_text && (
          <p className="mt-2 text-sm text-muted-foreground">{annotation.note_text}</p>
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

          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {annotation.clip_url && (
              <Link href={`/clips/${annotation.clip_id}`} className="inline-flex">
                <Button variant="ghost" size="icon" className="h-7 w-7" title="원본 클립으로 이동">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
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
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-medium">{clipTitle ?? '제목 없음'}</h3>
        {clipUrl && (
          <Link href={clipUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </Link>
        )}
        <span className="text-xs text-muted-foreground">({annotations.length}개)</span>
      </div>
      <div className="space-y-3 pl-0.5">
        {annotations.map((a) => (
          <HighlightCard key={a.id} annotation={a} grouped />
        ))}
      </div>
    </div>
  );
}

// ─── 메인 클라이언트 컴포넌트 ─────────────────────────────────────────────────

export function HighlightsClient() {
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [groupByClip, setGroupByClip] = useState(false);

  const { data: annotations = [], isLoading } = useAllAnnotations(
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">하이라이트를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">내 하이라이트</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            총 {annotations.length}개의 하이라이트
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 마크다운 내보내기 */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => exportToMarkdown(annotations)}
            disabled={annotations.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            내보내기
          </Button>

          {/* 클립별 그룹핑 */}
          <Button
            variant={groupByClip ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupByClip((v) => !v)}
          >
            클립별 묶기
          </Button>
        </div>
      </div>

      {/* 색상 필터 */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">색상 필터</span>
        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {HIGHLIGHT_COLORS.map((c: ColorEntry) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <span className={cn('inline-block h-3 w-3 rounded-full border border-border', c.bg)} />
                  {c.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 빈 상태 */}
      {annotations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-base font-medium">하이라이트가 없습니다</p>
          <p className="mt-1 text-sm">클립을 읽으면서 텍스트를 선택해 하이라이트를 추가해보세요.</p>
        </div>
      )}

      {/* 목록 */}
      {annotations.length > 0 && !groupByClip && (
        <div className="space-y-4">
          {annotations.map((a) => (
            <HighlightCard key={a.id} annotation={a} grouped={false} />
          ))}
        </div>
      )}

      {/* 그룹 목록 */}
      {annotations.length > 0 && groupByClip && grouped && (
        <div className="space-y-8">
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
