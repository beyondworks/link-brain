'use client';

// This hook is intentionally empty now.
// All safe-area handling uses env(safe-area-inset-top, 0px) directly in inline styles.
// The previous approach of measuring env() and setting --sat CSS variable
// caused a race condition: --sat was set to 0px before viewport-fit=cover took effect,
// preventing the env() fallback from ever being used.
//
// Kept as a no-op to avoid import errors from existing consumers.

export function useSafeArea() {
  return { top: 0 };
}
