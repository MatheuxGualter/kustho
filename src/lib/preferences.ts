import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Teto do nome mostrado na saudação, para não estourar o título da Início. */
export const DISPLAY_NAME_MAX = 40;

/** Remove espaços nas pontas e corta no limite. Vazio significa "sem nome". */
export function normalizeDisplayName(value: string): string {
  return value.trim().slice(0, DISPLAY_NAME_MAX);
}

type PreferencesState = {
  theme: ThemePreference;
  /** Nome pedido nas boas-vindas. `null` usa o fallback "Usuário" na saudação. */
  displayName: string | null;
  setDisplayName: (name: string) => void;
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
  /** O usuário passou pela configuração da leitura de notificações (Fase 2). */
  captureSetupDone: boolean;
  setCaptureSetupDone: (done: boolean) => void;
  /** Dispensou o convite da Início para ativar a leitura de notificações. */
  captureInviteDismissed: boolean;
  dismissCaptureInvite: () => void;
  setTheme: (theme: ThemePreference) => void;
  toggleHideValues: () => void;
};

/** Preferências do usuário, persistidas no key-value store do SQLite. */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      displayName: null,
      setDisplayName: (name) => {
        const displayName = normalizeDisplayName(name);
        if (!displayName) return;
        set({ displayName });
      },
      hideValues: false,
      lastOrigin: null,
      setLastOrigin: (lastOrigin) => set({ lastOrigin }),
      lockEnabled: false,
      setLockEnabled: (lockEnabled) => set({ lockEnabled }),
      onboardingDone: false,
      finishOnboarding: () => set({ onboardingDone: true }),
      captureSetupDone: false,
      setCaptureSetupDone: (captureSetupDone) => set({ captureSetupDone }),
      captureInviteDismissed: false,
      dismissCaptureInvite: () => set({ captureInviteDismissed: true }),
      setTheme: (theme) => set({ theme }),
      toggleHideValues: () => set((s) => ({ hideValues: !s.hideValues })),
    }),
    {
      name: 'kustho.preferences',
      storage: createJSONStorage(() => Storage),
      partialize: ({
        theme,
        displayName,
        hideValues,
        lastOrigin,
        lockEnabled,
        onboardingDone,
        captureSetupDone,
        captureInviteDismissed,
      }) => ({
        theme,
        displayName,
        hideValues,
        lastOrigin,
        lockEnabled,
        onboardingDone,
        captureSetupDone,
        captureInviteDismissed,
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
