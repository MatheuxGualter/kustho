/**
 * Regras de saldo das contas (regras 1, 7 e 8 de docs/plano.md). Funções puras.
 */
import { DomainError } from '@/domain/errors';
import { signedAmount } from '@/domain/transactions/display';
import type {
  Cents,
  Id,
  ISODate,
  NewTransfer,
  Transaction,
  TransactionDirection,
} from '@/domain/types';
import { compareDates } from '@/lib/dates';

export type BalanceFields = Pick<
  Transaction,
  'kind' | 'amountCents' | 'direction' | 'accountId' | 'status' | 'date' | 'deletedAt'
>;

/** Lançamento que entra no saldo da conta: efetivado, não excluído, até `until`. */
export function countsForBalance(tx: BalanceFields, accountId: Id, until: ISODate): boolean {
  return (
    tx.accountId === accountId &&
    tx.status === 'posted' &&
    tx.deletedAt === null &&
    compareDates(tx.date, until) <= 0
  );
}

/**
 * Regra 1: saldo inicial + receitas − despesas ± transferências ± ajustes − pagamentos
 * de fatura. Compras no cartão não têm `accountId` e por isso nunca entram.
 */
export function accountBalance(
  initialBalanceCents: Cents,
  accountId: Id,
  transactions: readonly BalanceFields[],
  until: ISODate,
): Cents {
  return transactions.reduce(
    (balance, tx) =>
      countsForBalance(tx, accountId, until) ? balance + signedAmount(tx) : balance,
    initialBalanceCents,
  );
}

function assertPositiveCents(amountCents: number) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new DomainError('invalid_amount');
  }
}

type TransferLeg = Pick<
  Transaction,
  'kind' | 'direction' | 'accountId' | 'amountCents' | 'date' | 'description'
>;

/** Regra 7: as duas pernas de uma transferência (a ligação por ID fica com quem grava). */
export function transferLegs({
  fromAccountId,
  toAccountId,
  amountCents,
  date,
  description = '',
}: NewTransfer): [outLeg: TransferLeg, inLeg: TransferLeg] {
  if (fromAccountId === toAccountId) throw new DomainError('same_account_transfer');
  assertPositiveCents(amountCents);
  const base = { kind: 'transfer' as const, amountCents, date, description };
  return [
    { ...base, direction: 'out', accountId: fromAccountId },
    { ...base, direction: 'in', accountId: toAccountId },
  ];
}

/** Regra 8: ajuste que leva o saldo atual ao saldo informado; `null` se já bate. */
export function adjustmentFor(
  currentBalanceCents: Cents,
  targetBalanceCents: Cents,
): { direction: TransactionDirection; amountCents: Cents } | null {
  const diff = targetBalanceCents - currentBalanceCents;
  if (diff === 0) return null;
  return { direction: diff > 0 ? 'in' : 'out', amountCents: Math.abs(diff) };
}
