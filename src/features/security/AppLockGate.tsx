import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import { Lock, LockOpen } from 'lucide-react-native';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { useTheme } from '@/ui/theme';

const ICON_SIZE = 40;

/** Pede biometria ou o PIN do aparelho. */
export async function authenticate(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: strings.lock.prompt,
    cancelLabel: strings.common.cancel,
    disableDeviceFallback: false,
  });
  return result.success;
}

/** O aparelho tem biometria ou PIN configurado? */
export async function canUseLock(): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

const SECURE_KEY = 'app-lock';

/**
 * Bloqueio do app: com o bloqueio ligado, pede autenticação ao abrir e ao voltar de
 * segundo plano. Fora de primeiro plano, cobre o conteúdo (tela de apps recentes).
 */
export function AppLockGate({ children }: { children: ReactNode }) {
  const lockEnabled = usePreferences((s) => s.lockEnabled);
  const [locked, setLocked] = useState(lockEnabled);
  const [covered, setCovered] = useState(false);
  const [failed, setFailed] = useState(false);

  const unlock = useCallback(async () => {
    const ok = await authenticate().catch(() => false);
    setFailed(!ok);
    if (ok) setLocked(false);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setCovered(false);
      } else {
        setCovered(true);
        if (state === 'background' && usePreferences.getState().lockEnabled) setLocked(true);
      }
    });
    return () => subscription.remove();
  }, []);

  // Com o bloqueio ligado, o Android mostra a tela em branco nos apps recentes e bloqueia
  // prints (FLAG_SECURE). Desligado, prints voltam a funcionar (úteis para reportar bugs).
  useEffect(() => {
    const toggle = lockEnabled
      ? ScreenCapture.preventScreenCaptureAsync(SECURE_KEY)
      : ScreenCapture.allowScreenCaptureAsync(SECURE_KEY);
    // Dev client sem o módulo nativo: segue sem a proteção extra.
    toggle.catch(() => {});
  }, [lockEnabled]);

  // Pede a autenticação sozinho ao abrir e ao voltar para o app bloqueado.
  useEffect(() => {
    if (!locked || covered) return;
    let active = true;
    authenticate()
      .catch(() => false)
      .then((ok) => {
        if (!active) return;
        setFailed(!ok);
        if (ok) setLocked(false);
      });
    return () => {
      active = false;
    };
  }, [locked, covered]);

  return (
    <View className="flex-1">
      {children}
      {locked || covered ? (
        <LockCover locked={locked} failed={failed} onUnlock={() => void unlock()} />
      ) : null}
    </View>
  );
}

function LockCover({
  locked,
  failed,
  onUnlock,
}: {
  locked: boolean;
  failed: boolean;
  onUnlock: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View className="absolute inset-0 items-center justify-center gap-4 bg-bg p-6">
      <Lock size={ICON_SIZE} color={colors.brand} className="mb-8" />
      <AppText variant="title">{locked ? strings.lock.title : strings.appName}</AppText>
      {locked ? (
        <>
          {failed ? <AppText tone="muted">{strings.lock.failed}</AppText> : null}
          <View className="mt-4">
            <Button
              label={strings.lock.unlock}
              onPress={onUnlock}
              icon={LockOpen}
              iconPosition="left"
            />
          </View>
        </>
      ) : null}
    </View>
  );
}
