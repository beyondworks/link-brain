import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type Language = 'ko' | 'en';

interface PreferencesState {
  theme: Theme;
  language: Language;
  powerMode: boolean;
}

interface PreferencesActions {
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setPowerMode: (enabled: boolean) => void;
  togglePowerMode: () => void;
}

export const usePreferencesStore = create<PreferencesState & PreferencesActions>()(
  persist(
    (set) => ({
      // State
      theme: 'system',
      language: 'ko',
      powerMode: false,

      // Actions
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setPowerMode: (enabled) => set({ powerMode: enabled }),
      togglePowerMode: () => set((s) => ({ powerMode: !s.powerMode })),
    }),
    {
      name: 'linkbrain-preferences',
    }
  )
);
