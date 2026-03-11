'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CONTENT_STUDIO_TYPES } from '@/config/constants';
import { useStudioGenerations, useSaveGeneration, useDeleteGeneration } from '@/lib/hooks/use-studio-generations';
import type { StudioGeneration } from '@/lib/hooks/use-studio-generations';
import type { ContentStudioType } from '@/config/constants';
import { useClips } from '@/lib/hooks/use-clips';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Sparkles,
  Wand2,
  FileText,
  Twitter,
  Mail,
  BarChart2,
  Lightbulb,
  BookOpen,
  GitCompare,
  HelpCircle,
  Network,
  Image,
  Link2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils/get-error-message';
import type { HistoryItem } from './studio-output-panel';
import dynamic from 'next/dynamic';

const StudioOutputPanel = dynamic(
  () => import('./studio-output-panel').then((m) => m.StudioOutputPanel),
  {
    loading: () => <Skeleton className="h-48 rounded-2xl shimmer" />,
  }
);

// ─── 콘텐츠 타입 메타데이터 ───────────────────────────────────────────────────

type StudioTypeMeta = {
  label: string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  description: string;
};

const STUDIO_META: Record<ContentStudioType, StudioTypeMeta> = {
  blog_post: {
    label: '블로그 포스트',
    icon: FileText,
    gradient: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
    description: '심층 아티클',
  },
  sns_post: {
    label: 'SNS 포스트',
    icon: Twitter,
    gradient: 'from-sky-500/20 to-sky-500/5',
    iconColor: 'text-sky-500',
    description: '짧고 임팩트 있게',
  },
  newsletter: {
    label: '뉴스레터',
    icon: Mail,
    gradient: 'from-violet-500/20 to-violet-500/5',
    iconColor: 'text-violet-500',
    description: '구독자용 메일',
  },
  email_draft: {
    label: '이메일 초안',
    icon: Mail,
    gradient: 'from-blue-500/20 to-blue-500/5',
    iconColor: 'text-blue-500',
    description: '비즈니스 메일',
  },
  executive_summary: {
    label: '요약 보고서',
    icon: BarChart2,
    gradient: 'from-amber-500/20 to-amber-500/5',
    iconColor: 'text-amber-500',
    description: '핵심만 빠르게',
  },
  key_concepts: {
    label: '핵심 포인트',
    icon: Lightbulb,
    gradient: 'from-yellow-500/20 to-yellow-500/5',
    iconColor: 'text-yellow-500',
    description: '주요 개념 추출',
  },
  review_notes: {
    label: '학습 노트',
    icon: BookOpen,
    gradient: 'from-emerald-500/20 to-emerald-500/5',
    iconColor: 'text-emerald-500',
    description: '복습용 정리',
  },
  teach_back: {
    label: '비교 분석',
    icon: GitCompare,
    gradient: 'from-orange-500/20 to-orange-500/5',
    iconColor: 'text-orange-500',
    description: '항목 간 비교',
  },
  quiz: {
    label: 'Q&A',
    icon: HelpCircle,
    gradient: 'from-pink-500/20 to-pink-500/5',
    iconColor: 'text-pink-500',
    description: '질문과 답변',
  },
  mind_map: {
    label: '마인드맵',
    icon: Network,
    gradient: 'from-cyan-500/20 to-cyan-500/5',
    iconColor: 'text-cyan-500',
    description: '개념 연결 구조',
  },
  simplified_summary: {
    label: '인포그래픽 텍스트',
    icon: Image,
    gradient: 'from-rose-500/20 to-rose-500/5',
    iconColor: 'text-rose-500',
    description: '시각화용 텍스트',
  },
};

const TONE_OPTIONS = [
  { value: 'professional', label: '전문적' },
  { value: 'casual', label: '친근한' },
  { value: 'academic', label: '학술적' },
  { value: 'creative', label: '창의적' },
  { value: 'concise', label: '간결한' },
];

const LENGTH_OPTIONS = [
  { value: 'short', label: '짧게 (200자 내외)' },
  { value: 'medium', label: '중간 (500자 내외)' },
  { value: 'long', label: '길게 (1000자 이상)' },
];

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function StudioClient() {
  const queryClient = useQueryClient();

  const [selectedType, setSelectedType] = useState<ContentStudioType>('blog_post');
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set());
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAllClips, setShowAllClips] = useState(false);

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

  const { data, isLoading: clipsLoading } = useClips();
  const allClips = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data]
  );
  const visibleClips = showAllClips ? allClips : allClips.slice(0, 6);

  const toggleClip = (id: string) => {
    setSelectedClipIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
          platform: 'studio',
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
      let generated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        generated += chunk;
        setOutput((prev) => prev + chunk);
      }

      // Save to DB
      if (generated) {
        saveGeneration.mutate({
          content_type: selectedType,
          tone,
          length,
          source_clip_ids: Array.from(selectedClipIds),
          output: generated,
        });
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, '네트워크 오류가 발생했습니다.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedMeta = STUDIO_META[selectedType];
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

            {clipsLoading ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl shimmer" />
                ))}
              </div>
            ) : allClips.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 py-8 text-center">
                <Link2 size={20} className="mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">저장된 클립이 없습니다</p>
                <p className="mt-0.5 text-xs text-muted-foreground/60">먼저 클립을 저장해 주세요</p>
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {visibleClips.map((clip) => {
                    const isSelected = selectedClipIds.has(clip.id);
                    return (
                      <button
                        key={clip.id}
                        onClick={() => toggleClip(clip.id)}
                        className={cn(
                          'group relative flex items-start gap-3 overflow-hidden rounded-xl border p-3 text-left transition-spring',
                          isSelected
                            ? 'border-primary/40 bg-primary/6 glow-brand-sm'
                            : 'border-border bg-muted/10 hover:border-primary/20 hover:bg-muted/30'
                        )}
                      >
                        {/* 체크박스 */}
                        <div className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-spring',
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-border bg-background group-hover:border-primary/50'
                        )}>
                          {isSelected && <Check size={10} className="text-primary-foreground" strokeWidth={3} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            'truncate text-xs font-medium leading-snug',
                            isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                          )}>
                            {clip.title ?? clip.url}
                          </p>
                          {clip.platform && (
                            <span className="mt-0.5 inline-block text-[10px] text-muted-foreground/60 capitalize">
                              {clip.platform}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {allClips.length > 6 && (
                  <button
                    onClick={() => setShowAllClips((v) => !v)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2 text-xs text-muted-foreground transition-spring hover:border-primary/30 hover:text-foreground"
                  >
                    {showAllClips ? (
                      <>
                        <ChevronUp size={13} />
                        접기
                      </>
                    ) : (
                      <>
                        <ChevronDown size={13} />
                        {allClips.length - 6}개 더 보기
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </section>

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

            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label className="text-sm font-medium text-foreground">콘텐츠 길이</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger className="rounded-xl focus:ring-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {LENGTH_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ── 4. 생성 버튼 ─────────────────────────────────────────── */}
          <div className="animate-fade-in-up animation-delay-300 flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
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
            onOutputChange={setOutput}
            onCopy={() => {
              void navigator.clipboard.writeText(output);
              toast.success('클립보드에 복사되었습니다.');
            }}
            onReset={() => setOutput('')}
            onSave={() => saveClipMutation.mutate()}
            isSaving={saveClipMutation.isPending}
            isGenerating={isGenerating}
            contentTypeLabel={STUDIO_META[selectedType].label}
            history={history}
            onHistorySelect={(item) => setOutput(item.output)}
            onHistoryDelete={(item) => {
              if (item.id) deleteGeneration.mutate(item.id);
            }}
          />
        </div>
      </div>
    </div>
  );
}
