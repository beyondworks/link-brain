'use client';

import { useEffect, useRef } from 'react';
import { isNative } from '@/lib/platform';

export function usePushNotifications() {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isNative || registeredRef.current) return;

    const setup = async () => {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.warn('[Push] Permission not granted');
        return;
      }

      // Register with APNs
      await PushNotifications.register();

      // Listen for registration success
      PushNotifications.addListener('registration', async (token) => {
        try {
          await fetch('/api/v1/device-tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.value, platform: 'ios' }),
          });
          registeredRef.current = true;
        } catch (err) {
          console.error('[Push] Token registration failed:', err);
        }
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('[Push] Registration error:', error);
      });

      // Listen for received notifications (foreground)
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Push] Received:', notification);
      });

      // Listen for notification tap (background → foreground)
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = action.notification.data;
        if (data?.url) {
          window.location.href = data.url;
        }
      });
    };

    setup().catch(console.warn);
  }, []);
}
