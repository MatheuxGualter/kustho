/** Fake da trilha B. Aproximação em memória; as regras oficiais ficam no serviço real. */
import type { MonthSummary, TransactionsService } from '@/domain/contracts';
import type { DayGroup, Transaction } from '@/domain/types';
import { compareDates, monthOf } from '@/lib/dates';
import { nowTimestamp } from '@/lib/id';
import { sumCents } from '@/lib/money';

import { notifyDataChanged } from '../dataVersion';
import { blankTransaction } from './common';
import { alive, type FakeStore, findOrThrow } from './store';

const isIncome = (t: Transaction) => t.kind === 'income';
const isExpense = (t: Transaction) => t.kind === 'expense' || t.kind === 'card_purchase';

export function createFakeTransactionsService(store: FakeStore): TransactionsService {
  const related = (tx: Transaction) =>
    store.transactions.filter(
      (t) =>
        t.id === tx.id ||
        (tx.transferPeerId !== null && t.id === tx.transferPeerId) ||
        (tx.installmentGroupId !== null && t.installmentGroupId === tx.installmentGroupId),
    );

  const byDateDesc = (a: Transaction, b: Transaction) =>
    compareDates(b.date, a.date) || b.createdAt.localeCompare(a.createdAt);

  return {
    async createTransaction({ status = 'posted', notes = null, ...input }) {
      const tx: Transaction = { ...blankTransaction(), ...input, status, notes };
      store.transactions.push(tx);
      notifyDataChanged();
      return tx;
    },
    async updateTransaction(id, patch) {
      Object.assign(findOrThrow(store.transactions, id, 'Lançamento'), patch, {
        updatedAt: nowTimestamp(),
      });
      notifyDataChanged();
    },
    async deleteTransaction(id) {
      const rows = related(findOrThrow(store.transactions, id, 'Lançamento'));
      const now = nowTimestamp();
      rows.forEach((t) => (t.deletedAt = now));
      notifyDataChanged();
      return rows.map((t) => t.id);
    },
    async restoreTransactions(ids) {
      store.transactions.filter((t) => ids.includes(t.id)).forEach((t) => (t.deletedAt = null));
      notifyDataChanged();
    },
    async getTransaction(id) {
      return alive(store.transactions).find((t) => t.id === id);
    },
    async listMonthTransactions(month, filters = {}) {
      const search = filters.search?.toLocaleLowerCase('pt-BR');
      const rows = alive(store.transactions)
        .filter((t) => monthOf(t.date) === month)
        .filter((t) => !search || t.description.toLocaleLowerCase('pt-BR').includes(search))
        .filter((t) => !filters.kinds || filters.kinds.includes(t.kind))
        .filter((t) => !filters.categoryIds || filters.categoryIds.includes(t.categoryId ?? ''))
        .filter((t) => !filters.accountIds || filters.accountIds.includes(t.accountId ?? ''))
        .filter((t) => !filters.cardIds || filters.cardIds.includes(t.cardId ?? ''))
        .filter((t) => !filters.statuses || filters.statuses.includes(t.status))
        .sort(byDateDesc);
      const groups: DayGroup[] = [];
      for (const tx of rows) {
        let group = groups.at(-1);
        if (!group || group.date !== tx.date) {
          group = { date: tx.date, transactions: [], netCents: 0 };
          groups.push(group);
        }
        group.transactions.push(tx);
        if (isIncome(tx)) group.netCents += tx.amountCents;
        if (isExpense(tx)) group.netCents -= tx.amountCents;
      }
      return groups;
    },
    async listRecentTransactions(limit) {
      return alive(store.transactions)
        .filter((t) => t.status === 'posted')
        .sort(byDateDesc)
        .slice(0, limit);
    },
    async getMonthSummary(month): Promise<MonthSummary> {
      const inMonth = alive(store.transactions).filter((t) => monthOf(t.date) === month);
      const posted = inMonth.filter((t) => t.status === 'posted');
      const net = (rows: Transaction[]) =>
        sumCents(rows.filter(isIncome).map((t) => t.amountCents)) -
        sumCents(rows.filter(isExpense).map((t) => t.amountCents));
      const totals = new Map<string | null, number>();
      for (const t of posted.filter(isExpense)) {
        totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amountCents);
      }
      return {
        month,
        incomeCents: sumCents(posted.filter(isIncome).map((t) => t.amountCents)),
        expenseCents: sumCents(posted.filter(isExpense).map((t) => t.amountCents)),
        netCents: net(posted),
        projectedNetCents: net(inMonth.filter((t) => t.status !== 'pending')),
        expensesByCategory: [...totals]
          .map(([categoryId, expenseCents]) => ({ categoryId, expenseCents }))
          .sort((a, b) => b.expenseCents - a.expenseCents),
      };
    },
    async listDueScheduled(today) {
      return alive(store.transactions).filter(
        (t) => t.status === 'scheduled' && compareDates(t.date, today) <= 0,
      );
    },
    async confirmScheduled(id) {
      findOrThrow(store.transactions, id, 'Lançamento').status = 'posted';
      notifyDataChanged();
    },
  };
}
