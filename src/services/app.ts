/**
 * Serviços reais sobre o SQLite do aparelho, usados pelo app. Importado só pelo layout
 * raiz: testes de tela passam fakes ao `ServicesProvider` e não abrem o banco nativo.
 */
import {
  createFakeNotificationCapture,
  NotificationCapture,
} from '../../modules/notification-capture';
import { db } from '@/db/client';
import { createAccountsService } from '@/domain/accounts/service';
import { parsers } from '@/domain/captures/parsers';
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
  captures: createCapturesService(db, {
    transactions,
    cards,
    // Sem o módulo nativo (iOS, web), uma fila vazia.
    notifications: NotificationCapture ?? createFakeNotificationCapture(),
    parsers,
  }),
};
