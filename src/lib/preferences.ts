import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

type PreferencesState = {
  theme: ThemePreference;
  /** Modo "ocultar valores": `MoneyText` mostra máscara no lugar dos números. */
  hideValues: boolean;
  /** Última origem usada no novo lançamento (`account:<id>` ou `card:<id>`). */
  lastOrigin: string | null;
  setLastOrigin: (origin: string) => void;
  /** Bloqueio por biometria ou PIN do aparelho. */
  lockEnabled: boolean;
  setLockEnabled: (enabled: boolean) => void;
  onboardingDone: boolean;
  finishOnboarding: () => void;
  setTheme: (theme: ThemePreference) => void;
  toggleHideValues: () => void;
};

/** Preferências do usuário, persistidas no key-value store do SQLite. */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      hideValues: false,
      lastOrigin: null,
      setLastOrigin: (lastOrigin) => set({ lastOrigin }),
      lockEnabled: false,
      setLockEnabled: (lockEnabled) => set({ lockEnabled }),
      onboardingDone: false,
      finishOnboarding: () => set({ onboardingDone: true }),
      setTheme: (theme) => set({ theme }),
      toggleHideValues: () => set((s) => ({ hideValues: !s.hideValues })),
    }),
    {
      name: 'kustho.preferences',
      storage: createJSONStorage(() => Storage),
      partialize: ({ theme, hideValues, lastOrigin, lockEnabled, onboardingDone }) => ({
        theme,
        hideValues,
        lastOrigin,
        lockEnabled,
        onboardingDone,
      }),
    },
  ),
);

/** `true` depois que as preferências salvas foram carregadas do armazenamento. */
export function usePreferencesHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => usePreferences.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    return usePreferences.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);
  return hydrated;
}
