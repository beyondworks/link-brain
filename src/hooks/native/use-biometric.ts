'use client';

import { useEffect, useState } from 'react';
import { isNative } from '@/lib/platform';
import {
  isBiometricAvailable,
  authenticateBiometric,
  getBiometricLabel,
} from '@/lib/native/biometric';

export function useBiometric() {
  const [available, setAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState('none');

  useEffect(() => {
    if (!isNative) return;
    isBiometricAvailable().then(({ available: avail, type }) => {
      setAvailable(avail);
      setBiometryType(type);
    });
  }, []);

  return {
    available,
    biometryType,
    biometryLabel: getBiometricLabel(biometryType),
    authenticate: authenticateBiometric,
  };
}
