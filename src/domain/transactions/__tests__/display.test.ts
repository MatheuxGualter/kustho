import type { Transaction } from '@/domain/types';

import { signedAmount, transactionTone } from '../display';

const tx = (fields: Partial<Transaction>) =>
  ({
    kind: 'expense',
    amountCents: 1000,
    direction: null,
    ...fields,
  }) as Pick<Transaction, 'kind' | 'amountCents' | 'direction'>;

describe('signedAmount', () => {
  it.each([
    [tx({ kind: 'income' }), 1000],
    [tx({ kind: 'expense' }), -1000],
    [tx({ kind: 'card_purchase' }), -1000],
    [tx({ kind: 'invoice_payment' }), -1000],
    [tx({ kind: 'transfer', direction: 'in' }), 1000],
    [tx({ kind: 'transfer', direction: 'out' }), -1000],
    [tx({ kind: 'adjustment', direction: 'in' }), 1000],
    [tx({ kind: 'adjustment', direction: 'out' }), -1000],
  ])('%o → %i', (t, expected) => {
    expect(signedAmount(t)).toBe(expected);
  });

  it('exige direction em transferência e ajuste', () => {
    expect(() => signedAmount(tx({ kind: 'transfer' }))).toThrow();
  });
});

describe('transactionTone', () => {
  it('verde só em receitas, vermelho só em saídas de consumo', () => {
    expect(transactionTone(tx({ kind: 'income' }))).toBe('income');
    expect(transactionTone(tx({ kind: 'expense' }))).toBe('expense');
    expect(transactionTone(tx({ kind: 'card_purchase' }))).toBe('expense');
  });

  it('movimentações internas ficam neutras', () => {
    expect(transactionTone(tx({ kind: 'transfer', direction: 'in' }))).toBe('neutral');
    expect(transactionTone(tx({ kind: 'invoice_payment' }))).toBe('neutral');
    expect(transactionTone(tx({ kind: 'adjustment', direction: 'out' }))).toBe('neutral');
  });
});
