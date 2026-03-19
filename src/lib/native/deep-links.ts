import { isNative } from '@/lib/platform';

export type DeepLinkHandler = (path: string) => void;

let handler: DeepLinkHandler | null = null;

export function setDeepLinkHandler(fn: DeepLinkHandler) {
  handler = fn;
}

export async function initDeepLinks() {
  if (!isNative) return;

  const { App } = await import('@capacitor/app');

  App.addListener('appUrlOpen', (event) => {
    // Extract path from URL: https://linkbrain.cloud/clip/abc -> /clip/abc
    try {
      const url = new URL(event.url);
      const path = url.pathname;
      if (handler) {
        handler(path);
      }
    } catch {
      // Handle custom scheme: linkbrain://chat -> /chat
      const path = event.url.replace(/^linkbrain:\/\//, '/');
      if (handler) {
        handler(path);
      }
    }
  });
}
