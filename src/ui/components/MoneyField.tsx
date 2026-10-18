import { useState } from 'react';

import { type Cents, formatBRL, parseBRL } from '@/lib/money';
import { strings } from '@/lib/strings';

import { TextField, type TextFieldProps } from './TextField';

export type MoneyFieldProps = Omit<
  TextFieldProps,
  'value' | 'onChange' | 'onChangeText' | 'keyboardType'
> & {
  value: Cents | null;
  onChange: (cents: Cents | null) => void;
  /** Aceita valores negativos (ex.: saldo no cheque especial). */
  allowNegative?: boolean;
};

const toText = (cents: Cents | null) =>
  cents === null ? '' : formatBRL(cents).replace(/^-?R\$\s?/, cents < 0 ? '-' : '');

/** Campo de valor em reais: aceita "1.234,56", "45,9" ou "10" e devolve centavos. */
export function MoneyField({
  value,
  onChange,
  allowNegative = false,
  error,
  onBlur,
  ...props
}: MoneyFieldProps) {
  const [text, setText] = useState(() => toText(value));
  const [invalid, setInvalid] = useState(false);

  return (
    <TextField
      {...props}
      value={text}
      keyboardType={allowNegative ? 'numbers-and-punctuation' : 'decimal-pad'}
      error={error ?? (invalid ? strings.fields.invalidAmount : undefined)}
      onChangeText={(next) => {
        setText(next);
        if (next.trim() === '') {
          setInvalid(false);
          onChange(null);
          return;
        }
        const cents = parseBRL(next);
        const ok = cents !== null && (allowNegative || cents >= 0);
        setInvalid(!ok);
        onChange(ok ? cents : null);
      }}
      onBlur={(e) => {
        if (!invalid && value !== null) setText(toText(value));
        onBlur?.(e);
      }}
    />
  );
}
