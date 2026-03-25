'use client';

import { memo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Plus, Globe, Settings } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: '홈', icon: Home },
  { href: '/favorites', label: '즐겨찾기', icon: Heart },
  { href: '/explore', label: '탐색', icon: Globe },
  { href: '/settings', label: '설정', icon: Settings },
] as const;

function MobileBottomNavComponent() {
  const pathname = usePathname();
  const { openModal, sidebarOpen } = useUIStore();

  // Scroll #main-content to top when clicking the already-active tab
  const handleNavClick = useCallback(
    (e: React.MouseEvent, isActive: boolean) => {
      if (isActive) {
        e.preventDefault();
        // Show header before scrolling to top
        window.dispatchEvent(new CustomEvent('show-mobile-header'));
        const main = document.querySelector('#main-content');
        if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [],
  );

  if (sidebarOpen) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center border-t border-border/50 bg-background lg:hidden"
    >
      {/* First two items */}
      {NAV_ITEMS.slice(0, 2).map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(e) => handleNavClick(e, isActive)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[44px] transition-spring"
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-spring hover-scale',
                isActive
                  ? 'bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20'
                  : ''
              )}
            >
              <Icon
                size={20}
                className={cn(
                  'transition-spring',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            </div>
            <span
              className={cn(
                'text-[10px] font-medium transition-spring',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Center add button */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <button
          type="button"
          onClick={() => openModal('addClip')}
          className="bg-gradient-brand glow-brand relative flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground shadow-none transition-spring active:scale-95 hover:glow-brand hover-scale"
          aria-label="클립 추가"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 animate-pulse-brand rounded-full bg-primary/20" />
          <Plus size={22} className="relative" />
        </button>
      </div>

      {/* Last two items */}
      {NAV_ITEMS.slice(2).map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(e) => handleNavClick(e, isActive)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[44px] transition-spring"
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-spring hover-scale',
                isActive
                  ? 'bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20'
                  : ''
              )}
            >
              <Icon
                size={20}
                className={cn(
                  'transition-spring',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            </div>
            <span
              className={cn(
                'text-[10px] font-medium transition-spring',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export const MobileBottomNav = memo(MobileBottomNavComponent);
