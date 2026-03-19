import { Capacitor } from '@capacitor/core';

export const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
export const isIOS = typeof window !== 'undefined' && Capacitor.getPlatform() === 'ios';
export const isAndroid = typeof window !== 'undefined' && Capacitor.getPlatform() === 'android';
export const isWeb = !isNative;
