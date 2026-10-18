import { Stack } from 'expo-router';

import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { Placeholder } from '@/ui/components/Placeholder';
import { Screen } from '@/ui/components/Screen';

export type Track = 'A' | 'B' | 'C' | 'D';

/** Tela provisória de uma rota da Fase 1, até a trilha dona entregar a real. */
export function RoutePlaceholder({
  title,
  description,
  track,
  param,
}: {
  title: string;
  description: string;
  track: Track;
  param?: string;
}) {
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen edges={['bottom']}>
        <Placeholder description={description} />
        <AppText variant="caption" tone="muted">
          {strings.placeholder.owner(track)}
        </AppText>
        {param ? (
          <AppText variant="caption" tone="muted">
            {strings.placeholder.param(param)}
          </AppText>
        ) : null}
      </Screen>
    </>
  );
}
