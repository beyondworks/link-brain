'use client';

import { memo } from 'react';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

function MobileBottomNavComponent() {
  const pathname = usePathname();
  const { openModal, sidebarOpen } = useUIStore();

  const isAppRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/favorites') ||
    pathname.startsWith('/explore') || pathname.startsWith('/settings') ||
    pathname.startsWith('/clip/') || pathname.startsWith('/read-later') ||
    pathname.startsWith('/archive') || pathname.startsWith('/studio') ||
    pathname.startsWith('/insights');
  if (!isAppRoute || sidebarOpen) return null;

  return (
    <button
      type="button"
      onClick={() => openModal('addClip')}
      className="fixed z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground shadow-lg transition-spring active:scale-95 lg:hidden"
      aria-label="클립 추가"
      style={{
        touchAction: 'manipulation',
        bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        right: '20px',
      }}
    >
      <Plus size={24} />
    </button>
  );
}

export const MobileBottomNav = memo(MobileBottomNavComponent);
