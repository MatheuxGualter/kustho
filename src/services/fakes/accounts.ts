/**
 * Fake da trilha A. Aproximação em memória: a regra oficial de saldo fica no serviço
 * real (`src/domain/accounts/`), com testes.
 */
import type { AccountsService } from '@/domain/contracts';
import { signedAmount } from '@/domain/transactions/display';
import type { Transaction } from '@/domain/types';
import { compareDates, today } from '@/lib/dates';
import { nowTimestamp } from '@/lib/id';
import { sumCents } from '@/lib/money';

import { notifyDataChanged } from '../dataVersion';
import { blankTransaction, entity } from './common';
import { alive, type FakeStore, findOrThrow } from './store';

export function createFakeAccountsService(store: FakeStore): AccountsService {
  const balance = (accountId: string, until = today()) => {
    const account = findOrThrow(store.accounts, accountId, 'Conta');
    const movements = alive(store.transactions).filter(
      (t) => t.accountId === accountId && t.status === 'posted' && compareDates(t.date, until) <= 0,
    );
    return account.initialBalanceCents + sumCents(movements.map(signedAmount));
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
        throw new Error('Conta com lançamentos só pode ser arquivada');
      }
      findOrThrow(store.accounts, id, 'Conta').deletedAt = nowTimestamp();
      notifyDataChanged();
    },
    async createTransfer({ fromAccountId, toAccountId, amountCents, date, description }) {
      const base = { kind: 'transfer' as const, amountCents, date, description: description ?? '' };
      const outLeg: Transaction = {
        ...blankTransaction(),
        ...base,
        direction: 'out',
        accountId: fromAccountId,
      };
      const inLeg: Transaction = {
        ...blankTransaction(),
        ...base,
        direction: 'in',
        accountId: toAccountId,
      };
      outLeg.transferPeerId = inLeg.id;
      inLeg.transferPeerId = outLeg.id;
      store.transactions.push(outLeg, inLeg);
      notifyDataChanged();
      return [outLeg, inLeg];
    },
    async adjustBalance(accountId, targetBalanceCents, date) {
      const diff = targetBalanceCents - balance(accountId, date);
      if (diff === 0) return null;
      const adjustment: Transaction = {
        ...blankTransaction(),
        kind: 'adjustment',
        direction: diff > 0 ? 'in' : 'out',
        amountCents: Math.abs(diff),
        accountId,
        date,
        description: 'Ajuste de saldo',
      };
      store.transactions.push(adjustment);
      notifyDataChanged();
      return adjustment;
    },
  };
  return service;
}
