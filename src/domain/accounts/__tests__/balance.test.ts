import type { Transaction } from '@/domain/types';

import { accountBalance, adjustmentFor, transferLegs } from '../balance';

type Tx = Pick<
  Transaction,
  'kind' | 'amountCents' | 'direction' | 'accountId' | 'status' | 'date' | 'deletedAt'
>;

const tx = (fields: Partial<Tx>): Tx => ({
  kind: 'expense',
  amountCents: 1000,
  direction: null,
  accountId: 'acc',
  status: 'posted',
  date: '2026-10-10',
  deletedAt: null,
  ...fields,
});

describe('accountBalance (regra 1)', () => {
  it('saldo inicial + receitas − despesas', () => {
    const txs = [
      tx({ kind: 'income', amountCents: 5000 }),
      tx({ kind: 'expense', amountCents: 1200 }),
    ];
    expect(accountBalance(10000, 'acc', txs, '2026-10-31')).toBe(13800);
  });

  it('transferências e ajustes pelo sentido; pagamento de fatura debita', () => {
    const txs = [
      tx({ kind: 'transfer', direction: 'in', amountCents: 300 }),
      tx({ kind: 'transfer', direction: 'out', amountCents: 100 }),
      tx({ kind: 'adjustment', direction: 'in', amountCents: 50 }),
      tx({ kind: 'adjustment', direction: 'out', amountCents: 20 }),
      tx({ kind: 'invoice_payment', amountCents: 400 }),
    ];
    expect(accountBalance(0, 'acc', txs, '2026-10-31')).toBe(300 - 100 + 50 - 20 - 400);
  });

  it('ignora previstos, pendentes, excluídos, de outra conta e posteriores a `until`', () => {
    const txs = [
      tx({ status: 'scheduled' }),
      tx({ status: 'pending' }),
      tx({ deletedAt: '2026-10-11T00:00:00.000Z' }),
      tx({ accountId: 'outra' }),
      tx({ date: '2026-11-01' }),
    ];
    expect(accountBalance(500, 'acc', txs, '2026-10-31')).toBe(500);
  });

  it('inclui o próprio dia de `until`', () => {
    expect(accountBalance(0, 'acc', [tx({ date: '2026-10-31' })], '2026-10-31')).toBe(-1000);
  });

  it('compras no cartão não tocam a conta', () => {
    expect(
      accountBalance(0, 'acc', [tx({ kind: 'card_purchase', accountId: null })], '2026-10-31'),
    ).toBe(0);
  });
});

describe('transferLegs (regra 7)', () => {
  it('cria pernas out/in com o mesmo valor e data', () => {
    const [outLeg, inLeg] = transferLegs({
      fromAccountId: 'a',
      toAccountId: 'b',
      amountCents: 2500,
      date: '2026-10-17',
    });
    expect(outLeg).toMatchObject({
      kind: 'transfer',
      direction: 'out',
      accountId: 'a',
      amountCents: 2500,
    });
    expect(inLeg).toMatchObject({
      kind: 'transfer',
      direction: 'in',
      accountId: 'b',
      amountCents: 2500,
    });
    expect(outLeg.date).toBe(inLeg.date);
  });

  it('rejeita mesma conta e valor inválido', () => {
    const base = { fromAccountId: 'a', toAccountId: 'b', amountCents: 100, date: '2026-10-17' };
    expect(() => transferLegs({ ...base, toAccountId: 'a' })).toThrow('same_account_transfer');
    expect(() => transferLegs({ ...base, amountCents: 0 })).toThrow('invalid_amount');
    expect(() => transferLegs({ ...base, amountCents: 10.5 })).toThrow('invalid_amount');
  });
});

describe('adjustmentFor (regra 8)', () => {
  it('diferença positiva vira entrada, negativa vira saída', () => {
    expect(adjustmentFor(1000, 1500)).toEqual({ direction: 'in', amountCents: 500 });
    expect(adjustmentFor(1000, 250)).toEqual({ direction: 'out', amountCents: 750 });
  });

  it('saldo que já bate não gera ajuste', () => {
    expect(adjustmentFor(1000, 1000)).toBeNull();
  });

  it('aceita saldo alvo negativo (cheque especial)', () => {
    expect(adjustmentFor(0, -300)).toEqual({ direction: 'out', amountCents: 300 });
  });
});
