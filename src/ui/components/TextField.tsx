import { type ComponentProps, useState } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '@/ui/theme';

import { AppText } from './AppText';

export type TextFieldProps = ComponentProps<typeof TextInput> & {
  label: string;
  error?: string;
  hint?: string;
};

/** Campo de texto com rótulo, dica e erro. */
export function TextField({ label, error, hint, onFocus, onBlur, ref, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const border = error ? 'border-expense' : focused ? 'border-brand' : 'border-border';

  return (
    <View className="gap-1">
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors['text-muted']}
        selectionColor={colors.brand}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        className={`min-h-touch rounded-input border bg-surface px-3 font-regular text-base text-text ${border}`}
        {...props}
      />
      {error ? (
        <AppText variant="caption" tone="expense" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
