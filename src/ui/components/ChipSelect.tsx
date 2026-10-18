import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useTheme } from '@/ui/theme';
import type { ColorToken } from '@/ui/tokens';

import { AppText } from './AppText';
import { ScrollFade } from './ScrollFade';

export type ChipOption = { value: string; label: string; color?: string; disabled?: boolean };

/** Folga (dp) para considerar que a lista chegou na borda. */
const EDGE = 2;

/**
 * Escolha única numa faixa rolável de chips (contas, cartões, origens). Quando há chips
 * fora da tela, um degradê na borda mostra que dá para arrastar para o lado.
 */
export function ChipSelect({
  label,
  options,
  value,
  onChange,
  background = 'bg',
}: {
  label: string;
  options: readonly ChipOption[];
  value: string | null;
  onChange: (value: string) => void;
  /** Cor do fundo onde a faixa está, para o degradê se misturar a ele. */
  background?: Extract<ColorToken, 'bg' | 'surface'>;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [offset, setOffset] = useState(0);
  const moreLeft = offset > EDGE;
  const moreRight = contentWidth - width - offset > EDGE;

  return (
    <View className="gap-2">
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          accessibilityLabel={label}
          onContentSizeChange={(w) => setContentWidth(w)}
          onScroll={(e) => setOffset(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={32}
        >
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
        {moreLeft ? <ScrollFade side="left" color={colors[background]} /> : null}
        {moreRight ? <ScrollFade side="right" color={colors[background]} /> : null}
      </View>
    </View>
  );
}
