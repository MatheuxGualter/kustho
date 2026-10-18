import { type ComponentProps, type ReactNode, useRef, useState } from 'react';
import { type HostInstance, TextInput, View } from 'react-native';

import { useTheme } from '@/ui/theme';

import { AppText } from './AppText';
import { useScrollIntoView } from './Screen';

export type TextFieldProps = ComponentProps<typeof TextInput> & {
  label: string;
  /** Esconde o rótulo visível (continua para leitores de tela), ex.: campo de busca. */
  hideLabel?: boolean;
  error?: string;
  hint?: string;
  /** Texto fixo antes do valor, ex.: "R$". */
  prefix?: string;
  /** Elemento à direita dentro do campo (botão, ícone). */
  right?: ReactNode;
};

/** Campo de texto com rótulo, dica e erro; ao focar, a tela rola para ele ficar visível. */
export function TextField({
  label,
  hideLabel = false,
  error,
  hint,
  prefix,
  right,
  onFocus,
  onBlur,
  ref,
  ...props
}: TextFieldProps) {
  const { colors } = useTheme();
  const scrollIntoView = useScrollIntoView();
  const boxRef = useRef<HostInstance>(null);
  const [focused, setFocused] = useState(false);
  const border = error ? 'border-expense' : focused ? 'border-brand' : 'border-border';

  return (
    <View ref={boxRef} className="gap-1">
      {hideLabel ? null : (
        <AppText variant="label" tone="muted">
          {label}
        </AppText>
      )}
      <View
        className={`min-h-touch flex-row items-center gap-2 rounded-input border bg-surface px-3 ${border}`}
      >
        {prefix ? (
          <AppText tone="muted" className="text-base">
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors['text-muted']}
          selectionColor={colors.brand}
          onFocus={(e) => {
            setFocused(true);
            scrollIntoView?.(boxRef.current);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className="min-h-touch flex-1 py-2 font-regular text-base text-text"
          {...props}
        />
        {right}
      </View>
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
