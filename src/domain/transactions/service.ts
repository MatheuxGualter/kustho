/**
 * Serviço real de lançamentos (trilha B) sobre o SQLite. Regras em `./rules.ts`.
 */
import { and, asc, desc, eq, isNull, lte, or } from 'drizzle-orm';

import type { AppDatabase } from '@/db/database';
import { getAccount } from '@/db/repositories/accounts';
import * as repo from '@/db/repositories/transactions';
import { transactions } from '@/db/schema';
import type { TransactionPatch, TransactionsService } from '@/domain/contracts';
import { DomainError } from '@/domain/errors';
import type { Id, Transaction } from '@/domain/types';
import { lastDayOfMonth } from '@/lib/dates';

import { groupByDay, matchesFilters, monthSummary, periodSummary, relatedIds } from './rules';

const assertAmount = (amountCents: number | undefined) => {
  if (amountCents !== undefined && (!Number.isSafeInteger(amountCents) || amountCents <= 0)) {
    throw new DomainError('invalid_amount');
  }
};

/** Campos que, editados numa perna da transferência, valem também para a outra. */
const mirroredOnPeer = ['amountCents', 'date', 'description', 'status', 'notes'] as const;

export function createTransactionsService(db: AppDatabase): TransactionsService {
  const monthRows = (month: string) =>
    repo.listTransactionsBetween(db, `${month}-01`, lastDayOfMonth(month));

  const requireTransaction = async (id: Id) => {
    const tx = await repo.getTransaction(db, id);
    if (!tx) throw new DomainError('not_found', `Lançamento não encontrado: ${id}`);
    return tx;
  };

  /** A transação, a outra perna da transferência e as parcelas do mesmo grupo. */
  const family = (tx: Transaction) =>
    db
      .select()
      .from(transactions)
      .where(
        and(
          isNull(transactions.deletedAt),
          or(
            eq(transactions.id, tx.id),
            tx.transferPeerId ? eq(transactions.id, tx.transferPeerId) : undefined,
            tx.installmentGroupId
              ? eq(transactions.installmentGroupId, tx.installmentGroupId)
              : undefined,
          ),
        ),
      );

  return {
    async createTransaction({ status = 'posted', notes = null, ...input }) {
      assertAmount(input.amountCents);
      if (!(await getAccount(db, input.accountId))) throw new DomainError('not_found');
      const [saved] = await repo.insertTransactions(db, [
        {
          ...input,
          status,
          notes,
          direction: null,
          cardId: null,
          invoiceId: null,
          transferPeerId: null,
          installmentGroupId: null,
          installmentNumber: null,
          installmentTotal: null,
          source: 'manual',
        },
      ]);
      return saved;
    },

    async updateTransaction(id, patch: TransactionPatch) {
      assertAmount(patch.amountCents);
      const tx = await requireTransaction(id);
      await repo.updateTransaction(db, id, patch);
      if (tx.transferPeerId) {
        const mirrored = Object.fromEntries(
          mirroredOnPeer.filter((key) => key in patch).map((key) => [key, patch[key]]),
        );
        if (Object.keys(mirrored).length > 0) {
          await repo.updateTransaction(db, tx.transferPeerId, mirrored);
        }
      }
    },

    async deleteTransaction(id) {
      const tx = await requireTransaction(id);
      const ids = relatedIds(tx, await family(tx));
      await repo.setTransactionsDeleted(db, ids, true);
      return ids;
    },

    restoreTransactions: (ids) => repo.setTransactionsDeleted(db, ids, false),

    getTransaction: (id) => repo.getTransaction(db, id),

    async listMonthTransactions(month, filters = {}) {
      return groupByDay((await monthRows(month)).filter((t) => matchesFilters(t, filters)));
    },

    async listRecentTransactions(limit) {
      return db
        .select()
        .from(transactions)
        .where(and(isNull(transactions.deletedAt), eq(transactions.status, 'posted')))
        .orderBy(desc(transactions.date), desc(transactions.createdAt))
        .limit(limit);
    },

    async getMonthSummary(month) {
      return monthSummary(month, await monthRows(month));
    },

    async getPeriodSummary(from, to) {
      return periodSummary(from, to, await repo.listTransactionsBetween(db, from, to));
    },

    async listDueScheduled(today) {
      return db
        .select()
        .from(transactions)
        .where(
          and(
            isNull(transactions.deletedAt),
            eq(transactions.status, 'scheduled'),
            lte(transactions.date, today),
          ),
        )
        .orderBy(desc(transactions.date));
    },

    async confirmScheduled(id) {
      await requireTransaction(id);
      await repo.updateTransaction(db, id, { status: 'posted' });
    },

    listAllTransactions: () =>
      db
        .select()
        .from(transactions)
        .where(isNull(transactions.deletedAt))
        .orderBy(asc(transactions.date), asc(transactions.createdAt)),
  };
}
