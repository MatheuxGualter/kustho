/**
 * Serviços reais sobre o SQLite do aparelho, usados pelo app. Importado só pelo layout
 * raiz: testes de tela passam fakes ao `ServicesProvider` e não abrem o banco nativo.
 */
import { createFakeNotificationCapture } from '../../modules/notification-capture/src/fake';
import { db } from '@/db/client';
import { createAccountsService } from '@/domain/accounts/service';
import { createCapturesService } from '@/domain/captures/service';
import { createCardsService } from '@/domain/cards/service';
import { createCategoriesService } from '@/domain/categories/service';
import type { Services } from '@/domain/contracts';
import { createTransactionsService } from '@/domain/transactions/service';

const transactions = createTransactionsService(db);
const cards = createCardsService(db);

export const appServices: Services = {
  accounts: createAccountsService(db),
  transactions,
  cards,
  categories: createCategoriesService(db),
  // O módulo nativo entra no lugar do fake na trilha A; os parsers, na trilha C.
  captures: createCapturesService(db, {
    transactions,
    cards,
    notifications: createFakeNotificationCapture(),
    parsers: [],
  }),
};
