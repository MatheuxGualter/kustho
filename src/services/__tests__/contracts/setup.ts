/**
 * Ambientes para as suítes de contrato: o mesmo conjunto de dados de exemplo servido pelo
 * fake (memória) e pelos serviços reais (SQLite de teste). Uma suíte de contrato roda
 * igual nos dois, garantindo que trocar o fake pelo real não muda o comportamento.
 */
import { createAccountsService } from '@/domain/accounts/service';
import { createCardsService } from '@/domain/cards/service';
import { createCategoriesService } from '@/domain/categories/service';
import { createTransactionsService } from '@/domain/transactions/service';
import type { Services } from '@/domain/contracts';
import type { DevSeed } from '@/db/devSeed';
import { runDevSeed } from '@/db/devSeed';
import { categories } from '@/db/schema';
import { buildDefaultCategories } from '@/db/seed';
import { createTestDb } from '@/db/test/testDb';

import { createFakeServices, createFakeStore } from '../../fakes';

export const TODAY = '2026-10-17';

export type ContractEnv = { services: Services; seed: DevSeed };

export type EnvFactory = { name: string; create: () => Promise<ContractEnv> };

export const fakeEnv: EnvFactory = {
  name: 'fake',
  create: async () => {
    const store = createFakeStore(TODAY);
    return {
      services: createFakeServices(store),
      seed: {
        accounts: store.accounts,
        creditCards: store.cards,
        invoices: store.invoices,
        transactions: store.transactions,
      },
    };
  },
};

/** Os quatro serviços reais sobre o SQLite de teste. */
export const realEnv: EnvFactory = {
  name: 'real',
  create: async () => {
    const { db } = createTestDb();
    await db.insert(categories).values(buildDefaultCategories());
    const seed = await runDevSeed(db, TODAY);
    return {
      services: {
        accounts: createAccountsService(db),
        transactions: createTransactionsService(db),
        cards: createCardsService(db),
        categories: createCategoriesService(db),
      },
      seed,
    };
  },
};

export const environments = [fakeEnv, realEnv];
