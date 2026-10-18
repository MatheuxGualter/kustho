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
import { createCardsService } from '@/domain/cards/service';
import { createCategoriesService } from '@/domain/categories/service';
import type { Services } from '@/domain/contracts';
import { createTransactionsService } from '@/domain/transactions/service';

import { createCaptureStore, createFakeCapturesService } from './fakes/captures';

const transactions = createTransactionsService(db);
const cards = createCardsService(db);

export const appServices: Services = {
  accounts: createAccountsService(db),
  transactions,
  cards,
  categories: createCategoriesService(db),
  // Fase 2: capturas ainda em memória (trilha D entrega o serviço real); os lançamentos
  // confirmados já vão para o SQLite. Sem o módulo nativo (iOS, web), uma fila vazia.
  captures: createFakeCapturesService(createCaptureStore(), {
    transactions,
    cards,
    notifications: NotificationCapture ?? createFakeNotificationCapture(),
  }),
};
