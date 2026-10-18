import { buildDevSeed } from '@/db/devSeed';
import { buildDefaultCategories } from '@/db/seed';
import type { Account, Category, CreditCard, Invoice, Transaction } from '@/domain/types';
import { today } from '@/lib/dates';

/** Dados em memória compartilhados pelos fakes, começando com os dados de exemplo. */
export type FakeStore = {
  accounts: Account[];
  cards: CreditCard[];
  invoices: Invoice[];
  transactions: Transaction[];
  categories: Category[];
};

export function createFakeStore(referenceDate = today()): FakeStore {
  const categories = buildDefaultCategories();
  const seed = buildDevSeed({ today: referenceDate, categories });
  return {
    accounts: seed.accounts,
    cards: seed.creditCards,
    invoices: seed.invoices,
    transactions: seed.transactions,
    categories,
  };
}

export const alive = <T extends { deletedAt: string | null }>(rows: T[]) =>
  rows.filter((r) => r.deletedAt === null);

export function findOrThrow<T extends { id: string }>(rows: T[], id: string, what: string): T {
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error(`${what} não encontrado: ${id}`);
  return row;
}
