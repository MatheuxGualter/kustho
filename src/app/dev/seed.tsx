import { Redirect, router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';

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

/**
 * `kustho://dev/seed`: troca os dados pelos de exemplo e pula as boas-vindas. Usado pelos
 * fluxos do Maestro (`.maestro/`) para começar sempre do mesmo estado.
 */
export default function DevSeedScreen() {
  const finishOnboarding = usePreferences((s) => s.finishOnboarding);
  const [status, setStatus] = useState<'running' | 'done' | string>('running');

  useEffect(() => {
    if (!enabled) return;
    finishOnboarding();
    runDevSeed(db, today())
      .then(() => setStatus('done'))
      .catch((e: unknown) => setStatus(String(e)));
  }, [finishOnboarding]);

  if (!enabled) return <Redirect href="/" />;
  return (
    <>
      <Stack.Screen options={{ title: strings.devCatalog.seed }} />
      <Screen edges={['bottom']}>
        <AppText testID="seed-status">
          {status === 'running'
            ? strings.common.loading
            : status === 'done'
              ? strings.devCatalog.seedReady
              : status}
        </AppText>
        <Button
          testID="seed-home"
          label={strings.tabs.home}
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
