import { registerPlugin } from '@capacitor/core';
import { isNative } from '@/lib/platform';

interface BiometricPlugin {
  isAvailable(): Promise<{
    available: boolean;
    biometryType: 'faceId' | 'touchId' | 'opticId' | 'none' | 'unknown';
    error: string;
  }>;
  authenticate(options?: { reason?: string }): Promise<{
    success: boolean;
    error?: string;
  }>;
}

const Biometric = registerPlugin<BiometricPlugin>('Biometric');

export async function isBiometricAvailable(): Promise<{
  available: boolean;
  type: string;
}> {
  if (!isNative) return { available: false, type: 'none' };
  const result = await Biometric.isAvailable();
  return { available: result.available, type: result.biometryType };
}

export async function authenticateBiometric(
  reason = '본인 확인이 필요합니다'
): Promise<boolean> {
  if (!isNative) return true; // Always pass on web
  const result = await Biometric.authenticate({ reason });
  return result.success;
}

export function getBiometricLabel(type: string): string {
  switch (type) {
    case 'faceId': return 'Face ID';
    case 'touchId': return 'Touch ID';
    case 'opticId': return 'Optic ID';
    default: return '생체 인증';
  }
}
