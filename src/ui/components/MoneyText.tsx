import { usePreferences } from '@/lib/preferences';
import { type Cents, formatBRL } from '@/lib/money';
import { strings } from '@/lib/strings';

import { AppText, type AppTextProps } from './AppText';

export type MoneyTone = 'income' | 'expense' | 'neutral';

export type MoneyTextProps = Omit<AppTextProps, 'children' | 'tone' | 'numeric'> & {
  /** Valor em centavos, com sinal (negativo = saída). */
  cents: Cents;
  /** `income` sempre mostra "+"; verde nunca aparece sem sinal. */
  tone?: MoneyTone;
  /** Respeita o modo "ocultar valores" (padrão). */
  hideable?: boolean;
};

const toneMap = { income: 'income', expense: 'expense', neutral: 'default' } as const;

/** Todo valor em dinheiro da interface: dígitos tabulares, cor semântica e modo ocultar. */
export function MoneyText({ cents, tone = 'neutral', hideable = true, ...props }: MoneyTextProps) {
  const hideValues = usePreferences((s) => s.hideValues);
  const hidden = hideable && hideValues;
  const text = formatBRL(cents, { sign: tone === 'income' ? 'always' : 'auto', hidden });
  return (
    <AppText
      numeric
      tone={toneMap[tone]}
      accessibilityLabel={hidden ? strings.money.hidden : text}
      className="text-balance"
      {...props}
    >
      {text}
    </AppText>
  );
}
