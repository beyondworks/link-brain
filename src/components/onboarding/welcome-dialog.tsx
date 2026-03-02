'use client';

import { useState, useEffect } from 'react';
import { Brain, Sparkles, Link2, Network, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';

const ONBOARDED_KEY = 'linkbrain-onboarded';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI 자동 분석',
    desc: 'URL을 저장하면 AI가 요약, 태그, 카테고리를 자동 생성합니다',
  },
  {
    icon: Network,
    title: '지식 연결',
    desc: '관련 클립을 자동으로 연결해 나만의 지식 그래프를 구축합니다',
  },
  {
    icon: Globe,
    title: '어디서든 접근',
    desc: '브라우저 확장, 모바일, API로 어디서든 클립을 저장하세요',
  },
];

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const onboarded = localStorage.getItem(ONBOARDED_KEY);
      if (!onboarded) {
        setOpen(true);
      }
    }
  }, []);

  function finish() {
    localStorage.setItem(ONBOARDED_KEY, 'true');
    setOpen(false);
  }

  function handleNext() {
    if (step < 2) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  }

  function handleAddClip() {
    finish();
    useUIStore.getState().openModal('addClip');
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">Linkbrain 시작하기</DialogTitle>
        <DialogDescription className="sr-only">
          Linkbrain 온보딩 — {step + 1} / 3단계
        </DialogDescription>

        {/* Step content */}
        <div className="relative min-h-[320px] px-8 pt-10 pb-6">
          {step === 0 && (
            <div className="flex flex-col items-center text-center">
              {/* Icon composition */}
              <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-3xl bg-primary/10" />
                <Brain size={36} className="text-primary" />
                <Sparkles
                  size={16}
                  className="absolute top-1 right-1 text-primary/70"
                />
                <Link2
                  size={14}
                  className="absolute bottom-2 right-0 text-primary/50"
                />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Linkbrain에 오신 것을 환영합니다! 🎉
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                URL을 저장하고 AI가 자동으로 분석합니다.
                <br />
                지식을 연결하고, 더 빠르게 성장하세요.
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="mb-6 text-xl font-bold tracking-tight text-foreground">
                핵심 기능 소개
              </h2>
              <div className="space-y-4">
                {FEATURES.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5">
                <Sparkles size={32} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                첫 번째 클립을 저장해보세요!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                URL 하나면 충분합니다. AI가 나머지를 처리합니다.
              </p>
              <Button
                onClick={handleAddClip}
                className="mt-6 w-full rounded-xl bg-gradient-brand text-white shadow-brand hover-scale"
              >
                클립 추가하기
              </Button>
              <button
                type="button"
                onClick={finish}
                className="mt-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                나중에 하기
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 px-8 py-4">
          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={[
                  'h-1.5 rounded-full transition-all duration-300',
                  i === step
                    ? 'w-4 bg-primary'
                    : 'w-1.5 bg-muted-foreground/30',
                ].join(' ')}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {step < 2 && (
              <button
                type="button"
                onClick={finish}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                건너뛰기
              </button>
            )}
            {step < 2 && (
              <Button
                onClick={handleNext}
                size="sm"
                className="rounded-lg bg-gradient-brand px-5 text-white shadow-brand hover-scale"
              >
                다음
              </Button>
            )}
            {step === 2 && (
              <Button
                onClick={finish}
                size="sm"
                variant="outline"
                className="rounded-lg px-5"
              >
                시작하기
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
