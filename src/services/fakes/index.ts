import type { Services } from '@/domain/contracts';

import { createFakeAccountsService } from './accounts';
import { createFakeCardsService } from './cards';
import { createFakeCategoriesService } from './categories';
import { createFakeStore } from './store';
import { createFakeTransactionsService } from './transactions';

export { createFakeStore, type FakeStore } from './store';

/** Os quatro serviços em memória, sobre o mesmo conjunto de dados. */
export function createFakeServices(store = createFakeStore()): Services {
  return {
    accounts: createFakeAccountsService(store),
    transactions: createFakeTransactionsService(store),
    cards: createFakeCardsService(store),
    categories: createFakeCategoriesService(store),
  };
}
