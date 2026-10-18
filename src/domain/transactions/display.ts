import type { Cents, Transaction } from '@/domain/types';

type AmountFields = Pick<Transaction, 'kind' | 'amountCents' | 'direction'>;

/**
 * Valor com sinal do ponto de vista da origem (conta ou cartão): positivo entra,
 * negativo sai. Compras no cartão são negativas (aumentam a fatura).
 */
export function signedAmount({ kind, amountCents, direction }: AmountFields): Cents {
  switch (kind) {
    case 'income':
      return amountCents;
    case 'expense':
    case 'card_purchase':
    case 'invoice_payment':
      return -amountCents;
    case 'transfer':
    case 'adjustment':
      if (!direction) throw new Error(`${kind} sem direction`);
      return direction === 'in' ? amountCents : -amountCents;
  }
}

export type TransactionTone = 'income' | 'expense' | 'neutral';

/**
 * Cor semântica na lista: verde só para receitas, vermelho só para gastos.
 * Transferências, pagamentos de fatura e ajustes não são receita nem despesa.
 */
export function transactionTone({ kind }: Pick<Transaction, 'kind'>): TransactionTone {
  if (kind === 'income') return 'income';
  if (kind === 'expense' || kind === 'card_purchase') return 'expense';
  return 'neutral';
}
