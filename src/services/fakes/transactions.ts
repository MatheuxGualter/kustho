/**
 * Fake da trilha B em memória. Usa as mesmas regras puras do serviço real
 * (`src/domain/transactions/rules.ts`); só o armazenamento é diferente.
 */
import type { TransactionsService } from '@/domain/contracts';
import { DomainError } from '@/domain/errors';
import { groupByDay, matchesFilters, monthSummary, relatedIds } from '@/domain/transactions/rules';
import type { Transaction } from '@/domain/types';
import { compareDates, monthOf } from '@/lib/dates';
import { nowTimestamp } from '@/lib/id';

import { notifyDataChanged } from '../dataVersion';
import { blankTransaction } from './common';
import { alive, type FakeStore, findOrThrow } from './store';

const mirroredOnPeer = ['amountCents', 'date', 'description', 'status', 'notes'] as const;

export function createFakeTransactionsService(store: FakeStore): TransactionsService {
  const assertAmount = (amountCents: number | undefined) => {
    if (amountCents !== undefined && (!Number.isSafeInteger(amountCents) || amountCents <= 0)) {
      throw new DomainError('invalid_amount');
    }
  };
  const live = (id: string) => {
    const tx = alive(store.transactions).find((t) => t.id === id);
    if (!tx) throw new DomainError('not_found');
    return tx;
  };

  return {
    async createTransaction({ status = 'posted', notes = null, ...input }) {
      assertAmount(input.amountCents);
      if (!alive(store.accounts).some((a) => a.id === input.accountId)) {
        throw new DomainError('not_found');
      }
      const tx: Transaction = { ...blankTransaction(), ...input, status, notes };
      store.transactions.push(tx);
      notifyDataChanged();
      return tx;
    },
    async updateTransaction(id, patch) {
      assertAmount(patch.amountCents);
      const tx = live(id);
      const now = nowTimestamp();
      Object.assign(tx, patch, { updatedAt: now });
      if (tx.transferPeerId) {
        const peer = findOrThrow(store.transactions, tx.transferPeerId, 'Lançamento');
        for (const key of mirroredOnPeer)
          if (key in patch) Object.assign(peer, { [key]: patch[key] });
        peer.updatedAt = now;
      }
      notifyDataChanged();
    },
    async deleteTransaction(id) {
      const ids = relatedIds(live(id), alive(store.transactions));
      const now = nowTimestamp();
      store.transactions.filter((t) => ids.includes(t.id)).forEach((t) => (t.deletedAt = now));
      notifyDataChanged();
      return ids;
    },
    async restoreTransactions(ids) {
      store.transactions.filter((t) => ids.includes(t.id)).forEach((t) => (t.deletedAt = null));
      notifyDataChanged();
    },
    async getTransaction(id) {
      return alive(store.transactions).find((t) => t.id === id);
    },
    async listMonthTransactions(month, filters = {}) {
      return groupByDay(
        alive(store.transactions).filter(
          (t) => monthOf(t.date) === month && matchesFilters(t, filters),
        ),
      );
    },
    async listRecentTransactions(limit) {
      return groupByDay(alive(store.transactions).filter((t) => t.status === 'posted'))
        .flatMap((g) => g.transactions)
        .slice(0, limit);
    },
    async getMonthSummary(month) {
      return monthSummary(month, store.transactions);
    },
    async listDueScheduled(today) {
      return alive(store.transactions)
        .filter((t) => t.status === 'scheduled' && compareDates(t.date, today) <= 0)
        .sort((a, b) => compareDates(b.date, a.date));
    },
    async confirmScheduled(id) {
      live(id).status = 'posted';
      notifyDataChanged();
    },
  };
}
