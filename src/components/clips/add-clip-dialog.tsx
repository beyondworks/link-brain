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

  const [step, setStep] = useState<1 | 2>(1);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [platform, setPlatform] = useState('');

  const urlInputRef = useRef<HTMLInputElement>(null);

  const isOpen = activeModal === 'addClip';

  function handleOpenChange(open: boolean) {
    if (!open) {
      handleClose();
    }
  }

  function handleClose() {
    closeModal();
    // Reset state after close animation
    setTimeout(() => {
      setStep(1);
      setUrl('');
      setUrlError('');
      setTitle('');
      setSummary('');
      setPlatform('');
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? '클립 추가' : '클립 정보 확인'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clip-url">URL</Label>
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
                className="text-base"
                autoFocus
              />
              {urlError && (
                <p className="text-sm text-destructive">{urlError}</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAnalyze} className="w-full sm:w-auto">
                분석
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clip-title">제목</Label>
              <Input
                id="clip-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clip-summary">요약</Label>
              <Textarea
                id="clip-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="요약을 입력하세요"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>플랫폼</Label>
              <div>
                <Badge variant="secondary">
                  {PLATFORM_LABELS[platform] ?? platform}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>카테고리</Label>
              <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted/40 text-sm text-muted-foreground">
                카테고리 선택 (준비 중)
              </div>
            </div>

            <div className="space-y-2">
              <Label>태그</Label>
              <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted/40 text-sm text-muted-foreground">
                태그 입력 (Phase 4에서 연결 예정)
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleClose}>
                취소
              </Button>
              <Button onClick={handleSave}>저장</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
