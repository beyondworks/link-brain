import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'cloud.linkbrain.app',
  appName: 'Linkbrain',
  webDir: 'public', // 라이브 서버 모드에서는 최소 webDir만 필요
  server: {
    url: 'https://linkbrain.cloud/dashboard',
    cleartext: false,
    allowNavigation: ['linkbrain.cloud', '*.linkbrain.cloud', 'accounts.google.com', '*.google.com', '*.supabase.co'],
  },
  ios: {
    contentInset: 'never',
    scheme: 'Linkbrain',
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#f9fafb',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Light',
      backgroundColor: '#f9fafb',
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
