import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

import { type Cents, centsFromDigits, formatCentsInput } from '@/lib/money';
import { strings } from '@/lib/strings';

import { AppText } from './AppText';
import { TextField, type TextFieldProps } from './TextField';

export type MoneyFieldProps = Omit<
  TextFieldProps,
  'value' | 'onChange' | 'onChangeText' | 'keyboardType' | 'prefix' | 'right'
> & {
  value: Cents | null;
  onChange: (cents: Cents | null) => void;
  /** Aceita valores negativos (ex.: saldo no cheque especial), com o botão +/−. */
  allowNegative?: boolean;
};

/**
 * Campo de valor com máscara de banco: só números, e a vírgula entra sozinha
 * (digitar 15562 mostra 155,62). O cursor fica sempre no fim.
 */
export function MoneyField({ value, onChange, allowNegative = false, ...props }: MoneyFieldProps) {
  const negative = (value ?? 0) < 0;
  const text = value === null ? '' : formatCentsInput(value);

  return (
    <TextField
      {...props}
      prefix={negative ? '-R$' : 'R$'}
      placeholder={formatCentsInput(0)}
      value={text}
      keyboardType="number-pad"
      selection={{ start: text.length, end: text.length }}
      contextMenuHidden
      onChangeText={(next) => {
        const cents = centsFromDigits(next);
        onChange(next.replace(/\D/g, '') === '' ? null : negative ? -cents : cents);
      }}
      right={
        allowNegative ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.fields.toggleSign}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(-(value ?? 0));
            }}
            className="min-h-touch min-w-touch items-center justify-center"
          >
            <AppText variant="label" tone="brand">
              {strings.fields.signToggle}
            </AppText>
          </Pressable>
        ) : null
      }
    />
  );
}
