import type { Entity, Transaction } from '@/domain/types';
import { newId, nowTimestamp } from '@/lib/id';

export function entity(): Entity {
  const now = nowTimestamp();
  return { id: newId(), createdAt: now, updatedAt: now, deletedAt: null };
}

/** Campos vazios de um lançamento, para os fakes montarem o resto. */
export function blankTransaction(): Omit<
  Transaction,
  'kind' | 'amountCents' | 'date' | 'description'
> {
  return {
    ...entity(),
    direction: null,
    categoryId: null,
    accountId: null,
    cardId: null,
    invoiceId: null,
    transferPeerId: null,
    refundOfId: null,
    installmentGroupId: null,
    installmentNumber: null,
    installmentTotal: null,
    status: 'posted',
    source: 'manual',
    notes: null,
  };
}
