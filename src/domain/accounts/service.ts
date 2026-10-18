/**
 * Serviço real de contas (trilha A) sobre o SQLite. Regras em `./balance.ts`.
 */
import { and, eq, inArray, isNull, lte } from 'drizzle-orm';

import type { AppDatabase } from '@/db/database';
import * as repo from '@/db/repositories/accounts';
import { insertTransactions, type TransactionInput } from '@/db/repositories/transactions';
import { transactions } from '@/db/schema';
import type { AccountsService } from '@/domain/contracts';
import { DomainError } from '@/domain/errors';
import type { Cents, Id, ISODate, Transaction } from '@/domain/types';
import { today } from '@/lib/dates';
import { newId } from '@/lib/id';

import { accountBalance, adjustmentFor, transferLegs } from './balance';

const emptyTransaction: Omit<TransactionInput, 'kind' | 'amountCents' | 'date' | 'description'> = {
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

export function createAccountsService(db: AppDatabase): AccountsService {
  /** Movimentos efetivados das contas até `until` (só as colunas que o saldo usa). */
  const movements = (accountIds: Id[], until: ISODate) =>
    accountIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            kind: transactions.kind,
            amountCents: transactions.amountCents,
            direction: transactions.direction,
            accountId: transactions.accountId,
            status: transactions.status,
            date: transactions.date,
            deletedAt: transactions.deletedAt,
          })
          .from(transactions)
          .where(
            and(
              inArray(transactions.accountId, accountIds),
              eq(transactions.status, 'posted'),
              isNull(transactions.deletedAt),
              lte(transactions.date, until),
            ),
          );

  const requireAccount = async (id: Id) => {
    const account = await repo.getAccount(db, id);
    if (!account) throw new DomainError('not_found', `Conta não encontrada: ${id}`);
    return account;
  };

  const balanceOf = async (id: Id, until: ISODate): Promise<Cents> => {
    const account = await requireAccount(id);
    return accountBalance(account.initialBalanceCents, id, await movements([id], until), until);
  };

  const service: AccountsService = {
    async listAccountsWithBalance({ includeArchived = false, until = today() } = {}) {
      const accounts = await repo.listAccounts(db, { includeArchived });
      const rows = await movements(
        accounts.map((a) => a.id),
        until,
      );
      return accounts.map((a) => ({
        ...a,
        balanceCents: accountBalance(a.initialBalanceCents, a.id, rows, until),
      }));
    },

    getAccountBalance: (accountId, until = today()) => balanceOf(accountId, until),

    async getTotalBalance(until = today()) {
      const accounts = await service.listAccountsWithBalance({ until });
      return accounts.reduce((sum, a) => sum + a.balanceCents, 0);
    },

    getAccount: (id) => repo.getAccount(db, id),
    createAccount: (input) => repo.createAccount(db, input),
    async updateAccount(id, patch) {
      await requireAccount(id);
      await repo.updateAccount(db, id, patch);
    },
    async setAccountArchived(id, archived) {
      await requireAccount(id);
      await repo.setAccountArchived(db, id, archived);
    },

    async deleteAccount(id) {
      await requireAccount(id);
      const [used] = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.accountId, id), isNull(transactions.deletedAt)))
        .limit(1);
      if (used) throw new DomainError('account_has_transactions');
      await repo.setAccountDeleted(db, id, true);
    },

    restoreAccount: (id) => repo.setAccountDeleted(db, id, false),

    async createTransfer(input) {
      const [outLeg, inLeg] = transferLegs(input);
      await requireAccount(input.fromAccountId);
      await requireAccount(input.toAccountId);
      const outId = newId();
      const inId = newId();
      // Um único INSERT com as duas linhas: as pernas entram juntas ou nenhuma entra.
      const [savedOut, savedIn] = await insertTransactions(db, [
        { ...emptyTransaction, ...outLeg, id: outId, transferPeerId: inId },
        { ...emptyTransaction, ...inLeg, id: inId, transferPeerId: outId },
      ]);
      return [savedOut, savedIn] as [Transaction, Transaction];
    },

    async adjustBalance(accountId, targetBalanceCents, date) {
      const adjustment = adjustmentFor(await balanceOf(accountId, date), targetBalanceCents);
      if (!adjustment) return null;
      const [saved] = await insertTransactions(db, [
        {
          ...emptyTransaction,
          ...adjustment,
          kind: 'adjustment',
          accountId,
          date,
          description: 'Ajuste de saldo',
        },
      ]);
      return saved;
    },
  };
  return service;
}
