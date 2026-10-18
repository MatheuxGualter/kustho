import { router, Stack } from 'expo-router';
import { Download } from 'lucide-react-native';
import { type ReactNode, useEffect, useState } from 'react';
import { Switch, View } from 'react-native';

import { authenticate, canUseLock } from '@/features/security/AppLockGate';
import { usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { ThemeSelector } from '@/ui/components/ThemeSelector';
import { useTheme } from '@/ui/theme';

/** Configurações: tema, ocultar valores, bloqueio e exportação. */
export function SettingsScreen() {
  const hideValues = usePreferences((s) => s.hideValues);
  const toggleHideValues = usePreferences((s) => s.toggleHideValues);
  const lockEnabled = usePreferences((s) => s.lockEnabled);
  const setLockEnabled = usePreferences((s) => s.setLockEnabled);
  const [lockAvailable, setLockAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    void canUseLock().then(setLockAvailable);
  }, []);

  const toggleLock = async (next: boolean) => {
    // Confirma com biometria/PIN antes de ligar ou desligar, para ninguém mudar no lugar do dono.
    if (await authenticate().catch(() => false)) setLockEnabled(next);
  };

  return (
    <>
      <Stack.Screen options={{ title: strings.screens.settings.title }} />
      <Screen edges={['bottom']}>
        <Section title={strings.settings.appearance}>
          <ThemeSelector />
        </Section>
        <Section title={strings.settings.privacy}>
          <Toggle
            label={strings.settings.hideValues}
            hint={strings.settings.hideValuesHint}
            value={hideValues}
            onChange={toggleHideValues}
          />
          <Toggle
            label={strings.settings.lock}
            hint={
              lockAvailable === false ? strings.settings.lockUnavailable : strings.settings.lockHint
            }
            value={lockEnabled}
            disabled={!lockAvailable}
            onChange={(next) => void toggleLock(next)}
          />
        </Section>
        <Section title={strings.settings.data}>
          <Button
            label={strings.settings.export}
            icon={Download}
            variant="secondary"
            block
            onPress={() => router.push('/exportar')}
          />
        </Section>
      </Screen>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <AppText variant="title">{title}</AppText>
      {children}
    </Card>
  );
}

function Toggle({
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View className="min-h-touch flex-row items-center gap-3">
      <View className="flex-1 gap-1">
        <AppText>{label}</AppText>
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={value ? strings.settings.on : strings.settings.off}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: colors.brand, false: colors.border }}
        thumbColor={colors.surface}
      />
    </View>
  );
}
