import Storage from 'expo-sqlite/kv-store';
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
      setTheme: (theme) => set({ theme }),
      toggleHideValues: () => set((s) => ({ hideValues: !s.hideValues })),
    }),
    {
      name: 'kustho.preferences',
      storage: createJSONStorage(() => Storage),
      partialize: ({ theme, hideValues, lastOrigin }) => ({ theme, hideValues, lastOrigin }),
    },
  ),
);
