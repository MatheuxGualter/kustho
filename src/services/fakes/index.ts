import { createFakeNotificationCapture } from '../../../modules/notification-capture/src/fake';
import type { NotificationCaptureApi } from '../../../modules/notification-capture/src/NotificationCapture.types';
import type { NotificationParser, Services } from '@/domain/contracts';

import { createFakeAccountsService } from './accounts';
import { createFakeCapturesService } from './captures';
import { createFakeCardsService } from './cards';
import { createFakeCategoriesService } from './categories';
import { createFakeStore } from './store';
import { createFakeTransactionsService } from './transactions';

export { createCaptureStore, createFakeCapturesService, type CaptureStore } from './captures';
export { createFakeStore, type FakeStore } from './store';

/** Os serviços em memória, sobre o mesmo conjunto de dados. */
export function createFakeServices(
  store = createFakeStore(),
  notifications: NotificationCaptureApi = createFakeNotificationCapture(),
  parsers: readonly NotificationParser[] = [],
): Services {
  const transactions = createFakeTransactionsService(store);
  const cards = createFakeCardsService(store);
  const accounts = createFakeAccountsService(store);
  return {
    accounts,
    transactions,
    cards,
    categories: createFakeCategoriesService(store),
    captures: createFakeCapturesService(store, {
      transactions,
      cards,
      accounts,
      notifications,
      parsers,
    }),
  };
}
