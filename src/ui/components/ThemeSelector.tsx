import { View } from 'react-native';

import { type ThemePreference, usePreferences } from '@/lib/preferences';
import { strings } from '@/lib/strings';

import { AppText } from './AppText';
import { SegmentedControl } from './SegmentedControl';

const options = (['system', 'light', 'dark'] as const).map((value: ThemePreference) => ({
  value,
  label: strings.theme[value],
}));

/** Controle segmentado para escolher tema do sistema, claro ou escuro. */
export function ThemeSelector() {
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);

  return (
    <View className="gap-2">
      <AppText variant="label" tone="muted">
        {strings.theme.label}
      </AppText>
      <SegmentedControl
        options={options}
        value={theme}
        onChange={setTheme}
        accessibilityLabel={strings.theme.label}
      />
    </View>
  );
}
