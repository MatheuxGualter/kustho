import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { AppText } from './AppText';

export type SegmentedLayout = 'wrap' | 'rows';

export type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  /** `wrap` quebra a linha sozinho; `rows` força duas opções por linha. */
  layout?: SegmentedLayout;
};

/** Escolha única entre poucas opções, lado a lado. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  layout = 'wrap',
}: SegmentedControlProps<T>) {
  const rows: (typeof options)[number][][] = [];
  for (let i = 0; i < options.length; i += 2) rows.push(options.slice(i, i + 2));

  const optionButton = (option: (typeof options)[number], fill: 'grow' | 'flex-1') => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={() => {
          if (selected) return;
          void Haptics.selectionAsync();
          onChange(option.value);
        }}
        className={`min-h-touch ${fill} items-center justify-center rounded-input px-3 ${selected ? 'bg-brand' : ''}`}
      >
        <AppText
          variant="label"
          tone={selected ? 'on-brand' : 'default'}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {option.label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={`${layout === 'wrap' ? 'flex-row flex-wrap' : ''} gap-1 rounded-card border border-border bg-surface p-1`}
    >
      {layout === 'rows'
        ? rows.map((row) => (
            <View key={row.map((option) => option.value).join('-')} className="flex-row gap-1">
              {row.map((option) => optionButton(option, 'flex-1'))}
            </View>
          ))
        : options.map((option) => optionButton(option, 'grow'))}
    </View>
  );
}
