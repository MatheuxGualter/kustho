import { Link } from 'expo-router';
import { Pressable } from 'react-native';

import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { Placeholder } from '@/ui/components/Placeholder';
import { Screen } from '@/ui/components/Screen';
import { ThemeSelector } from '@/ui/components/ThemeSelector';

// Montada por seções que cada trilha entrega em src/features/<domínio>/.
export default function MoreScreen() {
  return (
    <Screen title={strings.screens.more.title}>
      <Placeholder description={strings.screens.more.placeholder} />
      <ThemeSelector />
      {__DEV__ ? (
        <Link href="/dev/ui" asChild>
          <Pressable
            accessibilityRole="link"
            className="min-h-touch justify-center rounded-card border border-border bg-surface px-4"
          >
            <AppText variant="label" tone="brand">
              {strings.screens.more.devCatalog}
            </AppText>
          </Pressable>
        </Link>
      ) : null}
    </Screen>
  );
}
