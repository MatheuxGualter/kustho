/**
 * Dinheiro no Kustho é sempre um inteiro em centavos (BRL). Nunca usar float.
 */

export type Cents = number;

/** Maior valor aceito pelo teclado: R$ 99.999.999,99. */
export const MAX_INPUT_CENTS = 99_999_999_99;

const HIDDEN_MASK = '••••';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function assertCents(value: number): asserts value is Cents {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Valor em centavos inválido: ${value}`);
  }
}

export type FormatOptions = {
  /** `auto`: só "-" em negativos. `always`: "+" em positivos também. */
  sign?: 'auto' | 'always';
  /** Modo "ocultar valores". */
  hidden?: boolean;
};

export function formatBRL(cents: Cents, { sign = 'auto', hidden = false }: FormatOptions = {}) {
  assertCents(cents);
  if (hidden) {
    // Reaproveita o prefixo do Intl para manter o mesmo espaçamento.
    return currencyFormatter.format(0).replace(/[\d.,]+/, HIDDEN_MASK);
  }
  const formatted = currencyFormatter.format(Math.abs(cents) / 100);
  if (cents < 0) return `-${formatted}`;
  if (cents > 0 && sign === 'always') return `+${formatted}`;
  return formatted;
}

/**
 * Converte texto digitado em pt-BR ("R$ 1.234,56", "45,9", "-10") para centavos.
 * Retorna `null` quando o texto não é um valor válido.
 */
export function parseBRL(input: string): Cents | null {
  const text = input.replace(/R\$/g, '').replace(/[\s ]/g, '');
  const match = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const [, minus, integerPart, fraction = ''] = match;
  const cents = Number(integerPart.replace(/\./g, '')) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return minus ? -cents : cents;
}

/** Teclado em centavos: digitar 4, 5, 9, 0 produz 4590 (R$ 45,90). */
export function appendDigit(cents: Cents, digit: number): Cents {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
    throw new Error(`Dígito inválido: ${digit}`);
  }
  const next = cents * 10 + digit;
  return next > MAX_INPUT_CENTS ? cents : next;
}

export function removeLastDigit(cents: Cents): Cents {
  return Math.floor(cents / 10);
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((acc, v) => acc + v, 0);
}

/**
 * Divide uma compra em N parcelas. O resto da divisão vai na primeira:
 * R$ 100,00 em 3x = 33,34 + 33,33 + 33,33.
 */
export function splitInstallments(totalCents: Cents, count: number): Cents[] {
  assertCents(totalCents);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Número de parcelas inválido: ${count}`);
  }
  if (totalCents < count) {
    throw new Error('O total precisa ter ao menos 1 centavo por parcela');
  }
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + remainder : base));
}
