import { captureExtrasDefaults } from '@/domain/captures/rules';
import { buildDevSeed } from '@/db/devSeed';
import { buildDefaultCategories } from '@/db/seed';
import type { Account, Capture, Category, CreditCard, Invoice, Transaction } from '@/domain/types';
import { today } from '@/lib/dates';

import { entity } from './common';
import type { CaptureStore } from './captures';

/** Dados em memória compartilhados pelos fakes, começando com os dados de exemplo. */
export type FakeStore = CaptureStore & {
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
    captures: sampleCaptures(referenceDate, seed.accounts[0], seed.creditCards[0]),
    originRules: [],
    merchantRules: [],
    sources: [],
  };
}

/** Três pendentes para a caixa de Pendentes ter o que mostrar: cartão, Pix e não interpretada. */
function sampleCaptures(date: string, account: Account, card: CreditCard): Capture[] {
  const postedAt = `${date}T15:00:00.000Z`;
  const base = {
    packageName: 'com.nu.production',
    postedAt,
    cardLastDigits: null,
    suggestedAccountId: null,
    suggestedCardId: null,
    status: 'pending',
    transactionId: null,
    ...captureExtrasDefaults,
  } as const;
  return [
    {
      ...entity(),
      ...base,
      rawId: 'sample-1',
      title: 'Compra aprovada',
      text: 'Compra de R$ 45,90 APROVADA em PADARIA EXEMPLO para o cartão final 0000.',
      parser: 'sample',
      amountCents: 4590,
      kind: 'card_purchase',
      merchant: 'PADARIA EXEMPLO',
      date,
      cardLastDigits: '0000',
      suggestedCardId: card.id,
      confidence: 0.9,
    },
    {
      ...entity(),
      ...base,
      rawId: 'sample-2',
      title: 'Pix recebido',
      text: 'Você recebeu um Pix de R$ 150,00 de FULANO DE TAL.',
      parser: 'sample',
      amountCents: 15000,
      kind: 'income',
      merchant: 'FULANO DE TAL',
      date,
      suggestedAccountId: account.id,
      confidence: 0.8,
    },
    {
      ...entity(),
      ...base,
      rawId: 'sample-3',
      title: 'Nubank',
      text: 'Você tem uma nova atividade na sua conta.',
      parser: null,
      amountCents: null,
      kind: null,
      merchant: null,
      date: null,
      confidence: 0,
    },
  ];
}

export const alive = <T extends { deletedAt: string | null }>(rows: T[]) =>
  rows.filter((r) => r.deletedAt === null);

export function findOrThrow<T extends { id: string }>(rows: T[], id: string, what: string): T {
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error(`${what} não encontrado: ${id}`);
  return row;
}
