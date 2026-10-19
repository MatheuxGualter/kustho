/**
 * Ambientes para as suítes de contrato: o mesmo conjunto de dados de exemplo servido pelo
 * fake (memória) e pelos serviços reais (SQLite de teste). Uma suíte de contrato roda
 * igual nos dois, garantindo que trocar o fake pelo real não muda o comportamento.
 */
import { createAccountsService } from '@/domain/accounts/service';
import { createCapturesService } from '@/domain/captures/service';
import { createCardsService } from '@/domain/cards/service';
import { createCategoriesService } from '@/domain/categories/service';
import { createTransactionsService } from '@/domain/transactions/service';
import type { NotificationParser, Services } from '@/domain/contracts';
import { toISODate } from '@/lib/dates';
import type { DevSeed } from '@/db/devSeed';
import { runDevSeed } from '@/db/devSeed';
import { categories } from '@/db/schema';
import { buildDefaultCategories } from '@/db/seed';
import { createTestDb } from '@/db/test/testDb';

import {
  createFakeNotificationCapture,
  type FakeNotificationCapture,
} from '../../../../modules/notification-capture/src/fake';
import { createFakeServices, createFakeStore } from '../../fakes';

export const TODAY = '2026-10-17';
export const NUBANK_PACKAGE = 'com.nu.production';

export type ContractEnv = {
  services: Services;
  seed: DevSeed;
  /** Fake do módulo nativo ligado a `services.captures` (simula os bancos notificando). */
  notifications: FakeNotificationCapture;
};

/**
 * Parser estreito dos testes de contrato: só entende "Compra no débito de R$ X em LOJA.".
 * O resto entra como não interpretado, como antes.
 */
export const testParser: NotificationParser = {
  id: 'contract-test',
  packages: [NUBANK_PACKAGE],
  parse(notification) {
    const match = /^Compra no débito de R\$ (\d+),(\d{2}) em (.+)\.$/.exec(notification.text ?? '');
    if (!match) return null;
    return {
      amountCents: Number(match[1]) * 100 + Number(match[2]),
      kind: 'expense',
      merchant: match[3],
      date: toISODate(new Date(notification.postedAtMs)),
      cardLastDigits: null,
      confidence: 0.8,
    };
  },
};

export type EnvFactory = { name: string; create: () => Promise<ContractEnv> };

export const fakeEnv: EnvFactory = {
  name: 'fake',
  create: async () => {
    const store = createFakeStore(TODAY);
    const notifications = createFakeNotificationCapture({ allowedPackages: [NUBANK_PACKAGE] });
    return {
      notifications,
      services: createFakeServices(store, notifications, [testParser]),
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
    const transactions = createTransactionsService(db);
    const cards = createCardsService(db);
    const notifications = createFakeNotificationCapture({ allowedPackages: [NUBANK_PACKAGE] });
    return {
      notifications,
      services: {
        accounts: createAccountsService(db),
        transactions,
        cards,
        categories: createCategoriesService(db),
        captures: createCapturesService(db, {
          transactions,
          cards,
          notifications,
          parsers: [testParser],
        }),
      },
      seed,
    };
  },
};

export const environments = [fakeEnv, realEnv];
