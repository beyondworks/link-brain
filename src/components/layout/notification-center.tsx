'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, Bookmark, Sparkles, FolderOpen, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AriaLive } from '@/components/ui/aria-live';
import { useNotifications } from '@/lib/hooks/use-notifications';
import type { Notification, NotificationType } from '@/lib/hooks/use-notifications';
import { cn } from '@/lib/utils';

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  clip_saved: <Bookmark size={14} className="text-primary" />,
  clip_analyzed: <Sparkles size={14} className="text-violet-400" />,
  collection_updated: <FolderOpen size={14} className="text-amber-400" />,
  credit_low: <AlertTriangle size={14} className="text-destructive" />,
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRead(notification.id)}
      className={cn(
        'flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/60',
        !notification.isRead && 'bg-primary/5'
      )}
    >
      <span
        className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-muted"
        aria-hidden="true"
      >
        {TYPE_ICON[notification.type]}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', !notification.isRead ? 'text-foreground' : 'text-muted-foreground')}>
          {notification.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">{formatRelativeTime(notification.createdAt)}</p>
      </div>
      {!notification.isRead && (
        <span className="sr-only">읽지 않음</span>
      )}
    </button>
  );
}

export function NotificationCenter() {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotifications();

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  // 새 알림 도착 시 스크린리더에 안내
  const prevCountRef = useRef(unreadCount);
  const [ariaMessage, setAriaMessage] = useState('');

  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setAriaMessage(`새 알림 ${unreadCount}개`);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <>
      <AriaLive message={ariaMessage} priority="polite" />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={unreadCount > 0 ? `알림 센터, 읽지 않은 알림 ${unreadCount}개` : '알림 센터'}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Bell size={17} aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white"
                aria-hidden="true"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-80 rounded-2xl border-border/50 bg-glass-heavy p-0 shadow-elevated"
          role="dialog"
          aria-label="알림 목록"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <span className="text-sm font-semibold">알림</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Check size={12} aria-hidden="true" />
                모두 읽음
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Bell size={28} className="text-muted-foreground/30" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">알림이 없습니다</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="p-2">
                {unread.length > 0 && (
                  <>
                    <p className="mb-1 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      새 알림
                    </p>
                    {unread.map((n) => (
                      <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                    ))}
                  </>
                )}

                {read.length > 0 && (
                  <>
                    <p className={cn(
                      'mb-1 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60',
                      unread.length > 0 && 'mt-3'
                    )}>
                      이전 알림
                    </p>
                    {read.map((n) => (
                      <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border/40 px-4 py-2.5">
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 size={12} aria-hidden="true" />
                알림 지우기
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
