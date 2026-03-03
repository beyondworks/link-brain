'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, X, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/stores/ui-store';
import { useCategories } from '@/lib/hooks/use-categories';
import { useTags } from '@/lib/hooks/use-tags';
import { addNotification } from '@/lib/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { useSupabase } from '@/components/providers/supabase-provider';

interface AnalyzeResult {
  title: string;
  summary: string;
  platform: string;
  image: string | null;
  author: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: '유튜브',
  twitter: 'X (트위터)',
  instagram: '인스타그램',
  threads: '스레드',
  naver: '네이버',
  pinterest: '핀터레스트',
  web: '웹',
};

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(value: string): string {
  try {
    const parsed = new URL(value.trim());
    parsed.hostname = parsed.hostname.toLowerCase();
    // Remove trailing slash from pathname
    if (parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }
    return parsed.toString();
  } catch {
    return value.trim();
  }
}

interface DuplicateClip {
  id: string;
  title: string | null;
  url: string;
}

export function AddClipDialog() {
  const activeModal = useUIStore((s) => s.activeModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user: authUser } = useSupabase();

  const { data: categories = [] } = useCategories();
  const { data: existingTags = [] } = useTags();

  const [step, setStep] = useState<1 | 2>(1);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [platform, setPlatform] = useState('web');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Duplicate detection state
  const [isDuplicateChecking, setIsDuplicateChecking] = useState(false);
  const [duplicateClip, setDuplicateClip] = useState<DuplicateClip | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Debounced duplicate URL check
  useEffect(() => {
    // Reset duplicate state when URL changes
    setDuplicateClip(null);
    setAllowDuplicate(false);

    if (!url || url.trim().length < 8 || !isValidUrl(url.trim()) || !authUser) {
      setIsDuplicateChecking(false);
      return;
    }

    setIsDuplicateChecking(true);
    const timer = setTimeout(async () => {
      try {
        const normalized = normalizeUrl(url);
        const { data } = await supabase
          .from('clips')
          .select('id, title, url')
          .eq('url', normalized)
          .eq('user_id', authUser.id)
          .maybeSingle();

        setDuplicateClip(data ?? null);
      } catch {
        // Silently ignore check errors — don't block the user
        setDuplicateClip(null);
      } finally {
        setIsDuplicateChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [url, authUser]);

  const isOpen = activeModal === 'addClip';

  function handleOpenChange(open: boolean) {
    if (!open) handleClose();
  }

  function handleClose() {
    closeModal();
    setTimeout(() => {
      setStep(1);
      setUrl('');
      setUrlError('');
      setIsAnalyzing(false);
      setIsSaving(false);
      setTitle('');
      setSummary('');
      setPlatform('web');
      setSelectedCategoryId(null);
      setSelectedTags([]);
      setTagInput('');
      setDuplicateClip(null);
      setAllowDuplicate(false);
      setIsDuplicateChecking(false);
    }, 200);
  }

  async function handleFocus() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && isValidUrl(text) && !url) {
        setUrl(text);
      }
    } catch {
      // Clipboard access denied — ignore silently
    }
  }

  async function handleAnalyze() {
    const trimmed = url.trim();
    if (!trimmed) {
      setUrlError('URL을 입력해주세요.');
      return;
    }
    if (!isValidUrl(trimmed)) {
      setUrlError('유효한 URL을 입력해주세요.');
      return;
    }
    setUrlError('');
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json();
        const msg = body?.error?.message ?? body?.error ?? 'URL 분석에 실패했습니다.';
        throw new Error(typeof msg === 'string' ? msg : 'URL 분석에 실패했습니다.');
      }

      const data = (await res.json()) as AnalyzeResult;
      setTitle(data.title ?? trimmed);
      setSummary(data.summary ?? '');
      setPlatform(data.platform ?? 'web');
      setStep(2);
      addNotification({
        type: 'clip_analyzed',
        title: 'AI 분석이 완료되었습니다',
        message: data.title ?? trimmed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'URL 분석에 실패했습니다.';
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleUrlKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAnalyze();
  }

  async function handleSave() {
    setIsSaving(true);

    // Resolve category name from selectedCategoryId
    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

    try {
      const res = await fetch('/api/v1/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          title,
          summary,
          ...(selectedCategory ? { category: selectedCategory.name } : {}),
          ...(selectedTags.length > 0 ? { keywords: selectedTags } : {}),
        }),
      });

      if (res.status === 409) {
        toast.warning('이미 저장된 URL입니다.');
        return;
      }

      if (!res.ok) {
        const body = await res.json();
        const msg = body?.error?.message ?? body?.error ?? '저장에 실패했습니다.';
        throw new Error(typeof msg === 'string' ? msg : '저장에 실패했습니다.');
      }

      await queryClient.invalidateQueries({ queryKey: ['clips'] });
      toast.success('클립이 추가되었습니다');
      addNotification({
        type: 'clip_saved',
        title: '클립이 저장되었습니다',
        message: title || url.trim(),
      });
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장에 실패했습니다.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  const addTag = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (selectedTags.includes(trimmed)) return;
      setSelectedTags((prev) => [...prev, trimmed]);
    },
    [selectedTags]
  );

  function removeTag(name: string) {
    setSelectedTags((prev) => prev.filter((t) => t !== name));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && selectedTags.length > 0) {
      setSelectedTags((prev) => prev.slice(0, -1));
    }
  }

  // Suggestions: existing tags not already selected, filtered by current input
  const tagSuggestions = useMemo(
    () =>
      existingTags
        .filter(
          (t) =>
            !selectedTags.includes(t.name) &&
            (tagInput ? t.name.toLowerCase().includes(tagInput.toLowerCase()) : true)
        )
        .slice(0, 5),
    [existingTags, selectedTags, tagInput]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby="add-clip-description"
        className="border-gradient bg-glass-heavy overflow-y-auto max-h-[85vh] rounded-2xl shadow-elevated sm:max-w-lg"
      >
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            {/* Step indicator — gradient progress bar */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-spring',
                  step >= 1 ? 'w-8 bg-gradient-brand' : 'w-6 bg-muted'
                )}
              />
              <div
                className={cn(
                  'h-1.5 rounded-full transition-spring',
                  step >= 2 ? 'w-8 bg-gradient-brand glow-brand-sm' : 'w-6 bg-muted'
                )}
              />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground" aria-hidden="true">{step} / 2</span>
          </div>
          <DialogTitle className="text-lg font-semibold">
            {step === 1 ? '클립 추가' : '클립 정보 확인'}
          </DialogTitle>
          <p id="add-clip-description" className="sr-only">
            {step === 1
              ? '저장할 URL을 입력하고 분석 버튼을 누르세요. 2단계 중 1단계입니다.'
              : '분석된 클립 정보를 확인하고 저장하세요. 2단계 중 2단계입니다.'}
          </p>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 animate-blur-in">
            <div className="space-y-2">
              <Label htmlFor="clip-url" className="text-sm font-medium">
                URL
              </Label>
              <Input
                id="clip-url"
                ref={urlInputRef}
                type="url"
                placeholder="URL을 입력하세요..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError('');
                }}
                onFocus={handleFocus}
                onKeyDown={handleUrlKeyDown}
                className={cn(
                  'rounded-xl text-base transition-spring',
                  'focus-visible:ring-primary/30',
                  url && isValidUrl(url) && 'focus-visible:ring-primary/50 glow-brand-sm'
                )}
                autoFocus
                disabled={isAnalyzing}
              />
              {urlError && (
                <p className="text-sm text-destructive animate-pop-in">{urlError}</p>
              )}
              {isDuplicateChecking && !urlError && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pop-in">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  확인 중...
                </p>
              )}
              {!isDuplicateChecking && duplicateClip && !allowDuplicate && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 animate-pop-in">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        이미 저장된 URL입니다
                      </p>
                      {duplicateClip.title && (
                        <p className="mt-0.5 truncate text-xs text-amber-600/80 dark:text-amber-400/80">
                          {duplicateClip.title}
                        </p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            router.push(`/clip/${duplicateClip.id}`);
                            handleClose();
                          }}
                          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 transition-spring hover:bg-amber-500/20 dark:text-amber-400"
                        >
                          기존 클립 보기
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllowDuplicate(true)}
                          className="rounded-lg border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-spring hover:border-primary/30 hover:text-foreground"
                        >
                          그래도 저장
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full bg-gradient-brand glow-brand hover-scale rounded-xl font-semibold shadow-none transition-spring sm:w-auto"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  '분석'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-blur-in">
            <div className="space-y-2">
              <Label htmlFor="clip-title" className="text-sm font-medium">
                제목
              </Label>
              <Input
                id="clip-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="rounded-xl focus-visible:ring-primary/30 transition-spring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clip-summary" className="text-sm font-medium">
                요약
              </Label>
              <Textarea
                id="clip-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="요약을 입력하세요"
                rows={3}
                className="resize-none rounded-xl focus-visible:ring-primary/30 transition-spring"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">플랫폼</Label>
              <div>
                <Badge
                  variant="secondary"
                  className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {PLATFORM_LABELS[platform] ?? platform}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">카테고리</Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-spring',
                    selectedCategoryId === null
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/60 text-muted-foreground hover:border-primary/30'
                  )}
                >
                  없음
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-spring',
                      selectedCategoryId === cat.id
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border/60 text-muted-foreground hover:border-primary/30'
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color ?? '#21DBA4' }}
                    />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">태그</Label>
              {/* Tag input area */}
              <div
                className={cn(
                  'flex min-h-9 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-muted/40 px-3 py-1.5 transition-spring',
                  'focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20'
                )}
                onClick={() => tagInputRef.current?.focus()}
              >
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTag(tag);
                      }}
                      className="ml-0.5 rounded-full hover:text-destructive transition-colors"
                      aria-label={`${tag} 태그 제거`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={selectedTags.length === 0 ? '태그 입력 후 Enter...' : ''}
                  className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              {/* Autocomplete suggestions */}
              {tagInput && tagSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {tagSuggestions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        addTag(t.name);
                        setTagInput('');
                        tagInputRef.current?.focus();
                      }}
                      className="rounded-md border border-border/60 bg-surface px-2 py-0.5 text-xs text-muted-foreground transition-spring hover:border-primary/30 hover:text-primary"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSaving}
                className="rounded-xl border-border transition-spring hover-lift"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-brand glow-brand hover-scale rounded-xl font-semibold shadow-none transition-spring"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
