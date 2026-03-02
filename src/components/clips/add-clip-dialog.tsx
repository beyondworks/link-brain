'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
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
import { cn } from '@/lib/utils';

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function detectPlatform(url: string): string {
  const domain = extractDomain(url);
  if (domain.includes('youtube')) return 'youtube';
  if (domain.includes('twitter') || domain.includes('x.com')) return 'twitter';
  if (domain.includes('instagram')) return 'instagram';
  if (domain.includes('threads')) return 'threads';
  if (domain.includes('naver')) return 'naver';
  if (domain.includes('pinterest')) return 'pinterest';
  return 'web';
}

function buildSimulatedPreview(url: string) {
  const domain = extractDomain(url);
  const platform = detectPlatform(url);
  return {
    title: `${domain} 에서 저장된 콘텐츠`,
    summary: `${domain}의 콘텐츠입니다. AI가 분석하여 요약을 생성합니다.`,
    platform,
  };
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
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

export function AddClipDialog() {
  const activeModal = useUIStore((s) => s.activeModal);
  const closeModal = useUIStore((s) => s.closeModal);

  const { data: categories = [] } = useCategories();

  const [step, setStep] = useState<1 | 2>(1);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [platform, setPlatform] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const urlInputRef = useRef<HTMLInputElement>(null);

  const isOpen = activeModal === 'addClip';

  function handleOpenChange(open: boolean) {
    if (!open) {
      handleClose();
    }
  }

  function handleClose() {
    closeModal();
    setTimeout(() => {
      setStep(1);
      setUrl('');
      setUrlError('');
      setTitle('');
      setSummary('');
      setPlatform('');
      setSelectedCategoryId(null);
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

  function handleAnalyze() {
    if (!url.trim()) {
      setUrlError('URL을 입력해주세요.');
      return;
    }
    if (!isValidUrl(url.trim())) {
      setUrlError('유효한 URL을 입력해주세요.');
      return;
    }
    setUrlError('');
    const preview = buildSimulatedPreview(url.trim());
    setTitle(preview.title);
    setSummary(preview.summary);
    setPlatform(preview.platform);
    setStep(2);
  }

  function handleUrlKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  }

  function handleSave() {
    toast.success('클립이 추가되었습니다');
    handleClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined} className="border-gradient bg-glass-heavy overflow-y-auto max-h-[85vh] rounded-2xl shadow-elevated sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            {/* Step indicator — gradient progress bar */}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-spring',
                  step >= 1
                    ? 'w-8 bg-gradient-brand'
                    : 'w-6 bg-muted'
                )}
              />
              <div
                className={cn(
                  'h-1.5 rounded-full transition-spring',
                  step >= 2
                    ? 'w-8 bg-gradient-brand glow-brand-sm'
                    : 'w-6 bg-muted'
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
              <Label htmlFor="clip-url" className="text-sm font-medium">URL</Label>
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
              />
              {urlError && (
                <p className="text-sm text-destructive animate-pop-in">{urlError}</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleAnalyze}
                className="w-full bg-gradient-brand glow-brand hover-scale rounded-xl font-semibold shadow-none transition-spring sm:w-auto"
              >
                분석
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-blur-in">
            <div className="space-y-2">
              <Label htmlFor="clip-title" className="text-sm font-medium">제목</Label>
              <Input
                id="clip-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="rounded-xl focus-visible:ring-primary/30 transition-spring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clip-summary" className="text-sm font-medium">요약</Label>
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
              <div className="flex h-9 items-center rounded-xl border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                태그 입력 (Phase 4에서 연결 예정)
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="rounded-xl border-border transition-spring hover-lift"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-brand glow-brand hover-scale rounded-xl font-semibold shadow-none transition-spring"
              >
                저장
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
