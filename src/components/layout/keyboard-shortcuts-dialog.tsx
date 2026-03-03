'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUIStore } from '@/stores/ui-store';

interface ShortcutRowProps {
  label: string;
  keys: string[];
}

function ShortcutRow({ label, keys }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-xs text-muted-foreground/50">then</span>}
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono text-foreground">
              {key}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div>
      <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">
        {title}
      </h3>
      <div className="divide-y divide-border/40">{children}</div>
    </div>
  );
}

function useMacOS(): boolean {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(
      typeof navigator !== 'undefined' &&
        (navigator.platform.includes('Mac') || navigator.userAgent.includes('Mac'))
    );
  }, []);
  return isMac;
}

export function KeyboardShortcutsDialog() {
  const activeModal = useUIStore((s) => s.activeModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const isMac = useMacOS();
  const mod = isMac ? '⌘' : 'Ctrl';

  const open = activeModal === 'shortcuts';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closeModal(); }}>
      <DialogContent className="max-w-md" aria-describedby="shortcuts-description">
        <DialogHeader>
          <DialogTitle>키보드 단축키</DialogTitle>
          <p id="shortcuts-description" className="sr-only">
            LinkBrain에서 사용 가능한 키보드 단축키 목록입니다.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-1">
          <Section title="일반">
            <ShortcutRow label="검색" keys={[`${mod} K`]} />
            <ShortcutRow label="검색 (단축키)" keys={['/']} />
            <ShortcutRow label="새 클립" keys={['N']} />
            <ShortcutRow label="사이드바 토글" keys={['[']} />
            <ShortcutRow label="이 도움말 열기" keys={['?']} />
            <ShortcutRow label="닫기" keys={['Esc']} />
          </Section>

          <Section title="뷰 모드">
            <ShortcutRow label="그리드 뷰" keys={['1']} />
            <ShortcutRow label="리스트 뷰" keys={['2']} />
            <ShortcutRow label="헤드라인 뷰" keys={['3']} />
          </Section>

          <Section title="클립 리스트">
            <ShortcutRow label="아래로 이동" keys={['J']} />
            <ShortcutRow label="위로 이동" keys={['K']} />
            <ShortcutRow label="클립 열기" keys={['Enter']} />
            <ShortcutRow label="선택 토글" keys={['X']} />
          </Section>

          <Section title="탐색 (G 시퀀스)">
            <ShortcutRow label="대시보드" keys={['G', 'H']} />
            <ShortcutRow label="즐겨찾기" keys={['G', 'F']} />
            <ShortcutRow label="아카이브" keys={['G', 'A']} />
            <ShortcutRow label="컬렉션" keys={['G', 'C']} />
            <ShortcutRow label="설정" keys={['G', 'S']} />
            <ShortcutRow label="인사이트" keys={['G', 'I']} />
            <ShortcutRow label="탐색" keys={['G', 'E']} />
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
