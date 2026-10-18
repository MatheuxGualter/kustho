import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from './AppText';

export type ChipOption = { value: string; label: string; color?: string; disabled?: boolean };

/** Escolha única numa faixa rolável de chips (contas, cartões, origens). */
export function ChipSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly ChipOption[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <View className="gap-2">
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup">
        <View className="flex-row gap-2">
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: option.disabled }}
                disabled={option.disabled}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onChange(option.value);
                }}
                className={`min-h-touch flex-row items-center gap-2 rounded-full border px-4 ${selected ? 'border-brand bg-brand' : 'border-border bg-surface'} ${option.disabled ? 'opacity-50' : ''}`}
              >
                {option.color ? (
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                ) : null}
                <AppText variant="label" tone={selected ? 'on-brand' : 'default'}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
