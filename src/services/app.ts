/**
 * Serviços reais sobre o SQLite do aparelho, usados pelo app. Importado só pelo layout
 * raiz: testes de tela passam fakes ao `ServicesProvider` e não abrem o banco nativo.
 */
import { db } from '@/db/client';
import { createAccountsService } from '@/domain/accounts/service';
import { createCardsService } from '@/domain/cards/service';
import { createCategoriesService } from '@/domain/categories/service';
import type { Services } from '@/domain/contracts';
import { createTransactionsService } from '@/domain/transactions/service';

export const appServices: Services = {
  accounts: createAccountsService(db),
  transactions: createTransactionsService(db),
  cards: createCardsService(db),
  categories: createCategoriesService(db),
};
