import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { type ThemePreference, usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';

import { AppText } from './AppText';

const options: ThemePreference[] = ['system', 'light', 'dark'];

/** Controle segmentado para escolher tema do sistema, claro ou escuro. */
export function ThemeSelector() {
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);

  return (
    <View className="gap-2">
      <AppText variant="label" tone="muted">
        {strings.theme.label}
      </AppText>
      <View
        className="flex-row gap-1 rounded-card border border-border bg-surface p-1"
        accessibilityRole="radiogroup"
      >
        {options.map((option) => {
          const selected = option === theme;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                void Haptics.selectionAsync();
                setTheme(option);
              }}
              className={`min-h-touch flex-1 items-center justify-center rounded-input ${selected ? 'bg-brand' : ''}`}
            >
              <AppText variant="label" tone={selected ? 'on-brand' : 'default'}>
                {strings.theme[option]}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
