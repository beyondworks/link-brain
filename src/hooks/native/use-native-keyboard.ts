'use client';

import { useEffect, useState } from 'react';
import { isNative } from '@/lib/platform';

export function useNativeKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!isNative) return;

    let showListener: { remove: () => void } | undefined;
    let hideListener: { remove: () => void } | undefined;

    const setup = async () => {
      const { Keyboard } = await import('@capacitor/keyboard');

      showListener = await Keyboard.addListener('keyboardWillShow', (info) => {
        setKeyboardHeight(info.keyboardHeight);
        setIsKeyboardVisible(true);
      });

      hideListener = await Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      });
    };

    setup().catch(console.warn);

    return () => {
      showListener?.remove();
      hideListener?.remove();
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}
