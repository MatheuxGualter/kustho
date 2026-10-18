/**
 * Fake da trilha A em memória. Usa as mesmas regras puras do serviço real
 * (`src/domain/accounts/balance.ts`); só o armazenamento é diferente.
 */
import { accountBalance, adjustmentFor, transferLegs } from '@/domain/accounts/balance';
import type { AccountsService } from '@/domain/contracts';
import { DomainError } from '@/domain/errors';
import type { Transaction } from '@/domain/types';
import { today } from '@/lib/dates';
import { nowTimestamp } from '@/lib/id';
import { sumCents } from '@/lib/money';

import { notifyDataChanged } from '../dataVersion';
import { blankTransaction, entity } from './common';
import { alive, type FakeStore, findOrThrow } from './store';

export function createFakeAccountsService(store: FakeStore): AccountsService {
  const balance = (accountId: string, until = today()) => {
    const account = findOrThrow(store.accounts, accountId, 'Conta');
    return accountBalance(account.initialBalanceCents, accountId, store.transactions, until);
  };

  const service: AccountsService = {
    async listAccountsWithBalance({ includeArchived = false, until } = {}) {
      return alive(store.accounts)
        .filter((a) => includeArchived || a.archivedAt === null)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => ({ ...a, balanceCents: balance(a.id, until) }));
    },
    async getAccountBalance(accountId, until) {
      return balance(accountId, until);
    },
    async getTotalBalance(until) {
      const accounts = await service.listAccountsWithBalance({ until });
      return sumCents(accounts.map((a) => a.balanceCents));
    },
    async getAccount(id) {
      return alive(store.accounts).find((a) => a.id === id);
    },
    async createAccount(input) {
      const account = { ...entity(), ...input, archivedAt: null };
      store.accounts.push(account);
      notifyDataChanged();
      return account;
    },
    async updateAccount(id, patch) {
      Object.assign(findOrThrow(store.accounts, id, 'Conta'), patch, { updatedAt: nowTimestamp() });
      notifyDataChanged();
    },
    async setAccountArchived(id, archived) {
      findOrThrow(store.accounts, id, 'Conta').archivedAt = archived ? nowTimestamp() : null;
      notifyDataChanged();
    },
    async deleteAccount(id) {
      if (alive(store.transactions).some((t) => t.accountId === id)) {
        throw new DomainError('account_has_transactions');
      }
      findOrThrow(store.accounts, id, 'Conta').deletedAt = nowTimestamp();
      notifyDataChanged();
    },
    async restoreAccount(id) {
      findOrThrow(store.accounts, id, 'Conta').deletedAt = null;
      notifyDataChanged();
    },
    async createTransfer(input) {
      const [outBase, inBase] = transferLegs(input);
      const outLeg: Transaction = { ...blankTransaction(), ...outBase };
      const inLeg: Transaction = { ...blankTransaction(), ...inBase };
      outLeg.transferPeerId = inLeg.id;
      inLeg.transferPeerId = outLeg.id;
      store.transactions.push(outLeg, inLeg);
      notifyDataChanged();
      return [outLeg, inLeg];
    },
    async adjustBalance(accountId, targetBalanceCents, date) {
      const adjustment = adjustmentFor(balance(accountId, date), targetBalanceCents);
      if (!adjustment) return null;
      const tx: Transaction = {
        ...blankTransaction(),
        ...adjustment,
        kind: 'adjustment',
        accountId,
        date,
        description: 'Ajuste de saldo',
      };
      store.transactions.push(tx);
      notifyDataChanged();
      return tx;
    },
  };
  return service;
}
