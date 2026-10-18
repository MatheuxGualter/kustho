import { Text, type TextProps } from 'react-native';

const variants = {
  display: 'font-bold text-display',
  headline: 'font-bold text-xl',
  title: 'font-semibold text-lg',
  body: 'font-regular text-base',
  label: 'font-medium text-sm',
  caption: 'font-regular text-xs',
} as const;

export type AppTextVariant = keyof typeof variants;

export type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  /** Cor padrão é `text`; `muted` para textos secundários. */
  tone?: 'default' | 'muted' | 'brand' | 'on-brand' | 'income' | 'expense';
  /** Dígitos de largura fixa, para valores alinhados. */
  numeric?: boolean;
  className?: string;
};

const tones = {
  default: 'text-text',
  muted: 'text-text-muted',
  brand: 'text-brand',
  'on-brand': 'text-on-brand',
  income: 'text-income',
  expense: 'text-expense',
} as const;

/** Texto base do app: Inter, escala tipográfica e cores dos tokens. */
export function AppText({
  variant = 'body',
  tone = 'default',
  numeric = false,
  className = '',
  ...props
}: AppTextProps) {
  return (
    <Text
      className={`${variants[variant]} ${tones[tone]} ${numeric ? 'tabular-nums' : ''} ${className}`}
      {...props}
    />
  );
}
