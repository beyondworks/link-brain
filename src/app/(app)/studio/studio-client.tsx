'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CONTENT_STUDIO_TYPES } from '@/config/constants';
import { useStudioGenerations, useSaveGeneration, useDeleteGeneration } from '@/lib/hooks/use-studio-generations';
import type { StudioGeneration } from '@/lib/hooks/use-studio-generations';
import type { ContentStudioType } from '@/config/constants';
import { useClips } from '@/lib/hooks/use-clips';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Sparkles, Wand2, Link2, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils/get-error-message';
import { usePlan } from '@/lib/hooks/use-plan';
import { StudioClipPickerDialog } from './studio-clip-picker-dialog';
import { UpgradePrompt } from '@/components/plan/upgrade-prompt';
import type { HistoryItem } from './studio-output-panel';
import { STUDIO_META, TONE_OPTIONS } from './studio-meta';
import { STUDIO_FORMATS, STUDIO_LENGTHS, isStudioLength, type StudioLength } from '@/lib/ai/studio-formats';
import { parseStreamResult } from '@/lib/ai/stream-error';
import dynamic from 'next/dynamic';

const StudioOutputPanel = dynamic(
  () => import('./studio-output-panel').then((m) => m.StudioOutputPanel),
  {
    loading: () => <Skeleton className="h-48 rounded-2xl shimmer" />,
  }
);

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function StudioClient() {
  const queryClient = useQueryClient();
  const { canUseStudio } = usePlan();

  const [selectedType, setSelectedType] = useState<ContentStudioType>('blog_post');
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set());
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState<StudioLength>('medium');
  const [includeSources, setIncludeSources] = useState(true);
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [clipPickerOpen, setClipPickerOpen] = useState(false);

  // DB-backed generation history
  const { data: generations } = useStudioGenerations();
  const saveGeneration = useSaveGeneration();
  const deleteGeneration = useDeleteGeneration();

  const history: HistoryItem[] = useMemo(
    () =>
      (generations ?? []).map((g: StudioGeneration) => ({
        id: g.id,
        prompt: `${STUDIO_META[g.content_type as ContentStudioType]?.label ?? g.content_type} · ${TONE_OPTIONS.find((t) => t.value === g.tone)?.label ?? g.tone}`,
        output: g.output,
        createdAt: new Date(g.created_at),
      })),
    [generations]
  );

  // Restore last generation output on page load
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!restoredRef.current && generations && generations.length > 0 && !output) {
      const latest = generations[0]; // already sorted by created_at DESC
      setOutput(latest.output);
      const restoredType = latest.content_type as ContentStudioType;
      setSelectedType(STUDIO_META[restoredType] ? restoredType : 'blog_post');
      setTone(latest.tone ?? 'professional');
      setLength(isStudioLength(latest.length) ? latest.length : 'medium');
      restoredRef.current = true;
    }
  }, [generations, output]);

  // Fetch selected clips for display (only when we have selections)
  const { data: selectedClipsData } = useClips({
    enabled: selectedClipIds.size > 0,
  });
  const selectedClipsList = useMemo(() => {
    if (selectedClipIds.size === 0) return [];
    const all = selectedClipsData?.pages.flatMap((p) => p.data) ?? [];
    return all.filter((c) => selectedClipIds.has(c.id));
  }, [selectedClipsData, selectedClipIds]);

  const clearClips = () => setSelectedClipIds(new Set());

  // ── Save as clip mutation ─────────────────────────────────────────────────

  const saveClipMutation = useMutation({
    mutationFn: async () => {
      const meta = STUDIO_META[selectedType];
      const res = await fetch('/api/v1/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `studio://${Date.now()}`,
          title: `[${meta.label}] ${new Date().toLocaleDateString('ko-KR')}`,
          summary: output.slice(0, 300),
          // clips_platform_check(마이그레이션 016)이 허용하는 값만 가능 — 'studio'는 없음
          platform: 'web',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null) as Record<string, unknown> | null;
        const msg = (errData?.error as string | undefined) ?? '클립 저장 중 오류가 발생했습니다.';
        throw new Error(msg);
      }
      return res.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: () => {
      toast.success('클립으로 저장되었습니다.');
      void queryClient.invalidateQueries({ queryKey: ['clips'] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, '클립 저장에 실패했습니다.'));
    },
  });

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (selectedClipIds.size === 0) {
      toast.warning('소스 클립을 1개 이상 선택해 주세요.');
      return;
    }
    setIsGenerating(true);
    setOutput('');

    try {
      const res = await fetch('/api/v1/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipIds: Array.from(selectedClipIds),
          type: selectedType,
          tone,
          length,
          includeSources,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null) as Record<string, unknown> | null;
        const msg =
          (errData?.error as Record<string, unknown> | undefined)?.message as string | undefined ??
          'AI 생성 중 오류가 발생했습니다.';
        toast.error(msg);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        toast.error('응답 스트림을 읽을 수 없습니다.');
        return;
      }

      const decoder = new TextDecoder();
      let raw = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        // 오류 마커는 화면에도 노출하지 않는다
        setOutput(parseStreamResult(raw).text);
      }

      const { text, error } = parseStreamResult(raw);

      // 스트림이 오류로 끝났으면 저장하지 않는다 (실패한 결과가 기록에 남는 것 방지)
      if (error) {
        toast.error(`AI 생성이 중단되었습니다: ${error}`);
        return;
      }

      if (text) {
        saveGeneration.mutate({
          content_type: selectedType,
          tone,
          length,
          source_clip_ids: Array.from(selectedClipIds),
          output: text,
        });
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, '네트워크 오류가 발생했습니다.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedMeta = STUDIO_META[selectedType] ?? STUDIO_META.blog_post;
  const SelectedIcon = selectedMeta.icon;

  return (
    <div className="relative min-h-screen bg-dots p-6 lg:p-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow-orb absolute -right-32 -top-32 h-72 w-72 opacity-30" />
        <div className="glow-orb absolute -bottom-24 -left-24 h-56 w-56 opacity-15" />
      </div>

      <div className="relative mx-auto max-w-4xl">

        {/* ── 페이지 헤더 ─────────────────────────────────────────── */}
        <div className="mb-8 animate-blur-in">
          <div className="flex items-center gap-3">
            <div className="icon-glow relative rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-3 ring-1 ring-primary/20">
              <Wand2 size={20} className="animate-breathe text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">
                콘텐츠 스튜디오
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                저장한 클립을 기반으로 AI가 다양한 형식의 콘텐츠를 생성합니다
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">

          {/* ── 1. 콘텐츠 타입 선택 ─────────────────────────────────── */}
          <section className="card-glow card-inner-glow animate-fade-in-up rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
                <SelectedIcon size={15} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">콘텐츠 유형</h2>
                <p className="text-xs text-muted-foreground">생성할 콘텐츠 형식을 선택하세요</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {CONTENT_STUDIO_TYPES.map((type, i) => {
                const meta = STUDIO_META[type];
                const Icon = meta.icon;
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    style={{ animationDelay: `${i * 30}ms` }}
                    className={cn(
                      'animate-pop-in group relative overflow-hidden rounded-xl border p-3 text-left transition-spring',
                      isSelected
                        ? 'border-primary/40 bg-primary/8 glow-brand-sm ring-2 ring-primary'
                        : 'border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40 hover:shadow-card-hover hover:[transform:scale(1.02)]'
                    )}
                  >
                    {isSelected && (
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-40`} />
                    )}
                    <div className="relative flex flex-col gap-1.5">
                      <div className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg transition-spring',
                        isSelected
                          ? `bg-gradient-to-br ${meta.gradient} ring-1 ring-white/10`
                          : 'bg-muted/60'
                      )}>
                        <Icon
                          size={13}
                          className={isSelected ? meta.iconColor : 'text-muted-foreground'}
                        />
                      </div>
                      <span className={cn(
                        'text-xs font-semibold leading-tight',
                        isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                      )}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 leading-tight">
                        {meta.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 2. 소스 클립 선택 ───────────────────────────────────── */}
          <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-100 rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 ring-1 ring-emerald-500/20">
                  <Link2 size={15} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">소스 클립</h2>
                  <p className="text-xs text-muted-foreground">참고할 클립을 선택하세요</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedClipIds.size > 0 && (
                  <Badge
                    variant="secondary"
                    className="gap-1 rounded-lg bg-primary/10 text-primary text-xs"
                  >
                    <Check size={10} />
                    {selectedClipIds.size}개 선택
                  </Badge>
                )}
                {selectedClipIds.size > 0 && (
                  <button
                    onClick={clearClips}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-spring hover:text-foreground hover:bg-muted/40"
                  >
                    <X size={10} />
                    초기화
                  </button>
                )}
              </div>
            </div>

            {/* Selected clips chips */}
            {selectedClipsList.length > 0 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {selectedClipsList.map((clip) => (
                  <span
                    key={clip.id}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/6 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <span className="max-w-[120px] truncate">
                      {clip.title ?? clip.url}
                    </span>
                    <button
                      onClick={() =>
                        setSelectedClipIds((prev) => {
                          const next = new Set(prev);
                          next.delete(clip.id);
                          return next;
                        })
                      }
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setClipPickerOpen(true)}
              className="w-full rounded-xl border-dashed"
            >
              <Link2 size={14} className="mr-2" />
              소스 클립 선택
            </Button>
          </section>

          <StudioClipPickerDialog
            open={clipPickerOpen}
            onOpenChange={setClipPickerOpen}
            selectedIds={selectedClipIds}
            onConfirm={setSelectedClipIds}
          />

          {/* ── 3. 톤 / 길이 설정 ───────────────────────────────────── */}
          <section className="card-glow card-inner-glow animate-fade-in-up animation-delay-200 rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="icon-glow relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 ring-1 ring-amber-500/20">
                <Sparkles size={15} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">생성 옵션</h2>
                <p className="text-xs text-muted-foreground">톤과 길이를 설정하세요</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">문체 / 톤</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="rounded-xl focus:ring-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {TONE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">콘텐츠 분량</Label>
                <Select
                  value={length}
                  onValueChange={(v) => { if (isStudioLength(v)) setLength(v); }}
                >
                  <SelectTrigger className="rounded-xl focus:ring-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {STUDIO_LENGTHS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {STUDIO_FORMATS[selectedType].pickerLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {STUDIO_FORMATS[selectedType].targets[length]}
                </p>
              </div>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2.5">
              <Checkbox
                checked={includeSources}
                onCheckedChange={(v) => setIncludeSources(v === true)}
              />
              <span className="text-sm text-foreground">
                결과물 끝에 &lsquo;참고한 클립&rsquo; 출처 목록 추가
              </span>
            </label>
          </section>

          {/* ── 4. 생성 버튼 ─────────────────────────────────────────── */}
          {!canUseStudio && (
            <UpgradePrompt reason="studio" className="mb-4" />
          )}
          <div className="animate-fade-in-up animation-delay-300 flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !canUseStudio}
              className="bg-gradient-brand glow-brand hover:glow-brand hover-scale rounded-xl px-6 font-semibold shadow-none transition-spring"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={15} className="mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles size={15} className="mr-2" />
                  AI로 생성
                </>
              )}
            </Button>

            {selectedClipIds.size === 0 && (
              <p className="text-xs text-muted-foreground">
                소스 클립을 선택한 후 생성하세요
              </p>
            )}
          </div>

          {/* ── 5. 결과 + 이전 생성 기록 ─────────────────────────────── */}
          <StudioOutputPanel
            output={output}
            onReset={() => setOutput('')}
            onSave={() => saveClipMutation.mutate()}
            isSaving={saveClipMutation.isPending}
            isGenerating={isGenerating}
            contentTypeLabel={STUDIO_META[selectedType].label}
            history={history}
            onHistoryDelete={(item) => {
              if (item.id) deleteGeneration.mutate(item.id);
            }}
          />
        </div>
      </div>
    </div>
  );
}
