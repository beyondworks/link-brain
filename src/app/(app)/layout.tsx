import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

export const metadata: Metadata = {
  title: {
    default: 'Linkbrain',
    template: '%s — Linkbrain',
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      {/* Bottom nav rendered OUTSIDE AppShell to avoid overflow-hidden clipping
          from AppShell's fixed inset-0 container on iOS PWA */}
      <MobileBottomNav />
    </>
  );
}
