import { Redirect, router, Stack } from 'expo-router';
import { Database } from 'lucide-react-native';
import { useState } from 'react';

import { db } from '@/db/client';
import { runDevSeed } from '@/db/devSeed';
import { today } from '@/lib/dates';
import { usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Screen } from '@/ui/components/Screen';

/** Só em desenvolvimento ou em builds de teste ponta a ponta (`EXPO_PUBLIC_E2E=1`). */
const enabled = __DEV__ || process.env.EXPO_PUBLIC_E2E === '1';

type Status = 'idle' | 'running' | 'done' | { error: string };

/**
 * `kustho://dev/seed`: troca os dados pelos de exemplo e pula as boas-vindas. Usado pelos
 * fluxos do Maestro (`.maestro/`). Apaga tudo do aparelho, por isso pede confirmação.
 */
export default function DevSeedScreen() {
  const finishOnboarding = usePreferences((s) => s.finishOnboarding);
  const [status, setStatus] = useState<Status>('idle');

  if (!enabled) return <Redirect href="/" />;

  const seed = () => {
    setStatus('running');
    finishOnboarding();
    runDevSeed(db, today())
      .then(() => setStatus('done'))
      .catch((e: unknown) => setStatus({ error: String(e) }));
  };

  return (
    <>
      <Stack.Screen options={{ title: strings.devCatalog.seed }} />
      <Screen edges={['bottom']}>
        {status === 'idle' ? (
          <>
            <AppText tone="expense">{strings.devCatalog.seedWarning}</AppText>
            <Button
              testID="seed-confirm"
              label={strings.devCatalog.seedConfirm}
              icon={Database}
              variant="danger"
              block
              onPress={seed}
            />
          </>
        ) : (
          <AppText testID="seed-status">
            {status === 'running'
              ? strings.common.loading
              : status === 'done'
                ? strings.devCatalog.seedReady
                : status.error}
          </AppText>
        )}
        <Button
          testID="seed-home"
          label={strings.tabs.home}
          variant={status === 'done' ? 'primary' : 'secondary'}
          block
          disabled={status === 'running'}
          onPress={() => {
            if (router.canDismiss()) router.dismissAll();
            router.replace('/');
          }}
        />
      </Screen>
    </>
  );
}
