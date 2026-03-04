"use client"

import { useEffect } from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast, Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  // Tap/click anywhere on a toast to dismiss it (distinguish from drag/swipe)
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const onDown = (e: PointerEvent) => {
      startX = e.clientX;
      startY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      // Ignore drags (> 8px movement)
      if (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8) return;
      const target = e.target as HTMLElement;
      const toastEl = target.closest('[data-sonner-toast]');
      if (!toastEl) return;
      // Skip clicks on action buttons inside toast
      if (target.closest('[data-close-button]') || target.closest('[data-action]')) return;
      const id = toastEl.getAttribute('data-sonner-toast');
      toast.dismiss(id || undefined);
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointerup', onUp, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointerup', onUp, true);
    };
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          cursor: "pointer",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
