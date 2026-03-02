'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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

export function AddClipDialog() {
  const activeModal = useUIStore((s) => s.activeModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const queryClient = useQueryClient();

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

  const urlInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

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
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? 'URL 분석에 실패했습니다.');
      }

      const data = (await res.json()) as AnalyzeResult;
      setTitle(data.title ?? trimmed);
      setSummary(data.summary ?? '');
      setPlatform(data.platform ?? 'web');
      setStep(2);
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
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? '저장에 실패했습니다.');
      }

      await queryClient.invalidateQueries({ queryKey: ['clips'] });
      toast.success('클립이 추가되었습니다');
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
        aria-describedby={undefined}
        className="border-gradient bg-glass-heavy overflow-y-auto max-h-[85vh] rounded-2xl shadow-elevated sm:max-w-lg"
      >
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            {/* Step indicator — gradient progress bar */}
            <div className="flex items-center gap-1.5">
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
            <span className="text-[11px] font-medium text-muted-foreground">{step} / 2</span>
          </div>
          <DialogTitle className="text-lg font-semibold">
            {step === 1 ? '클립 추가' : '클립 정보 확인'}
          </DialogTitle>
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
