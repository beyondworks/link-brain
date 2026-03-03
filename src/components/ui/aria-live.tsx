'use client';

import { useEffect, useRef } from 'react';

interface AriaLiveProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

/**
 * 동적 콘텐츠 변경을 스크린리더에 알리는 컴포넌트.
 * 시각적으로 숨겨져 있으며 메시지가 변경될 때마다 자동으로 발화됩니다.
 */
export function AriaLive({ message, priority = 'polite' }: AriaLiveProps) {
  const ref = useRef<HTMLSpanElement>(null);

  // 메시지가 동일해도 재발화를 위해 빈 문자열 후 다시 설정
  useEffect(() => {
    if (!ref.current || !message) return;
    ref.current.textContent = '';
    const id = requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.textContent = message;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [message]);

  return (
    <span
      ref={ref}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    />
  );
}
